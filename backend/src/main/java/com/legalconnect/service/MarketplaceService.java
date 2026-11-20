package com.legalconnect.service;

import com.legalconnect.dto.request.AppointmentDtos;
import com.legalconnect.dto.request.ProviderDtos;
import com.legalconnect.dto.response.PageResponse;
import com.legalconnect.entity.*;
import com.legalconnect.exception.ApiException;
import com.legalconnect.repository.*;
import jakarta.persistence.criteria.Join;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class MarketplaceService {
    private final ProviderProfileRepository providerRepository;
    private final ProviderServiceRepository serviceRepository;
    private final ProviderAvailabilityRepository availabilityRepository;
    private final ProviderCredentialRepository credentialRepository;
    private final AppointmentRepository appointmentRepository;
    private final LegalSpecializationRepository specializationRepository;

    public List<LegalSpecialization> listSpecializations() {
        return specializationRepository.findByIsActiveTrueOrderByNameAsc();
    }

    public PageResponse<ProviderDtos.ProviderSummaryResponse> searchProviders(
        String q, Long specializationId, Enums.ProviderType providerType, String city,
        BigDecimal maxFee, Integer minExperience, BigDecimal minRating,
        Enums.DayOfWeekEnum dayOfWeek, int page, int size, String sortBy
    ) {
        Sort sort = switch (sortBy != null ? sortBy : "merit") {
            case "fee_asc" -> Sort.by(Sort.Direction.ASC, "consultationFee");
            case "fee_desc" -> Sort.by(Sort.Direction.DESC, "consultationFee");
            case "experience" -> Sort.by(Sort.Direction.DESC, "experienceYears");
            case "rating" -> Sort.by(Sort.Direction.DESC, "avgRating");
            default -> Sort.by(Sort.Direction.DESC, "incentivePoints").and(Sort.by(Sort.Direction.DESC, "avgRating"));
        };

        Specification<ProviderProfile> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("verificationStatus"), Enums.VerificationStatus.APPROVED));
            predicates.add(cb.isTrue(root.get("isAcceptingClients")));

            if (q != null && !q.isBlank()) {
                String pattern = "%" + q.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                    cb.like(cb.lower(root.get("fullName")), pattern),
                    cb.like(cb.lower(root.get("city")), pattern),
                    cb.like(cb.lower(root.get("bio")), pattern)
                ));
            }
            if (providerType != null) {
                predicates.add(cb.equal(root.get("providerType"), providerType));
            }
            if (city != null && !city.isBlank()) {
                predicates.add(cb.like(cb.lower(root.get("city")), "%" + city.trim().toLowerCase() + "%"));
            }
            if (maxFee != null) {
                predicates.add(cb.lessThanOrEqualTo(root.get("consultationFee"), maxFee));
            }
            if (minExperience != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("experienceYears"), minExperience));
            }
            if (minRating != null) {
                predicates.add(cb.greaterThanOrEqualTo(root.get("avgRating"), minRating));
            }
            if (specializationId != null) {
                var sub = query.subquery(Long.class);
                var srvRoot = sub.from(ProviderService.class);
                sub.select(srvRoot.get("provider").get("id"))
                    .where(cb.equal(srvRoot.get("specialization").get("id"), specializationId),
                           cb.isTrue(srvRoot.get("isActive")));
                predicates.add(root.get("id").in(sub));
            }
            if (dayOfWeek != null) {
                var sub = query.subquery(Long.class);
                var avRoot = sub.from(ProviderAvailability.class);
                sub.select(avRoot.get("provider").get("id"))
                    .where(cb.equal(avRoot.get("dayOfWeek"), dayOfWeek),
                           cb.isTrue(avRoot.get("isAvailable")));
                predicates.add(root.get("id").in(sub));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Pageable pageable = PageRequest.of(page, size, sort);
        Page<ProviderDtos.ProviderSummaryResponse> mapped = providerRepository.findAll(spec, pageable).map(this::toSummary);
        return PageResponse.from(mapped);
    }

    public ProviderDtos.ProviderDetailResponse getProviderDetail(Long providerId) {
        ProviderProfile p = providerRepository.findById(providerId)
            .orElseThrow(() -> ApiException.notFound("Provider not found"));
        List<ProviderDtos.ServiceResponse> services = serviceRepository.findByProviderIdAndIsActiveTrue(providerId).stream()
            .map(s -> ProviderDtos.ServiceResponse.builder()
                .id(s.getId())
                .specializationId(s.getSpecialization().getId())
                .specializationName(s.getSpecialization().getName())
                .title(s.getTitle())
                .description(s.getDescription())
                .serviceMode(s.getServiceMode())
                .fee(s.getFee())
                .durationMinutes(s.getDurationMinutes())
                .isProBonoEligible(s.getIsProBonoEligible())
                .isActive(s.getIsActive())
                .build())
            .toList();

        List<ProviderDtos.AvailabilityResponse> availability = availabilityRepository.findByProviderIdAndIsAvailableTrue(providerId).stream()
            .map(a -> ProviderDtos.AvailabilityResponse.builder()
                .id(a.getId())
                .dayOfWeek(a.getDayOfWeek())
                .startTime(a.getStartTime())
                .endTime(a.getEndTime())
                .slotDurationMinutes(a.getSlotDurationMinutes())
                .isAvailable(a.getIsAvailable())
                .build())
            .toList();

        List<ProviderDtos.CredentialResponse> credentials = credentialRepository.findByProviderIdOrderByCreatedAtDesc(providerId).stream()
            .map(c -> ProviderDtos.CredentialResponse.builder()
                .id(c.getId())
                .documentType(c.getDocumentType())
                .credentialNumber(c.getCredentialNumber())
                .issuingAuthority(c.getIssuingAuthority())
                .originalFilename(c.getOriginalFilename())
                .verificationStatus(c.getVerificationStatus())
                .reviewerRemarks(c.getReviewerRemarks())
                .createdAt(c.getCreatedAt())
                .build())
            .toList();

        return ProviderDtos.ProviderDetailResponse.builder()
            .profile(toSummary(p))
            .barRegistrationNo(p.getBarRegistrationNo())
            .phone(p.getPhone())
            .verificationRemarks(p.getVerificationRemarks())
            .proBonoCasesCompleted(p.getProBonoCasesCompleted())
            .services(services)
            .availability(availability)
            .credentials(credentials)
            .build();
    }

    public List<AppointmentDtos.SlotResponse> getAvailableSlots(Long providerId, LocalDate date) {
        Enums.DayOfWeekEnum dayEnum = Enums.DayOfWeekEnum.valueOf(date.getDayOfWeek().name());
        Optional<ProviderAvailability> availOpt = availabilityRepository.findByProviderIdAndDayOfWeek(providerId, dayEnum);
        if (availOpt.isEmpty() || !availOpt.get().getIsAvailable()) {
            return List.of();
        }
        ProviderAvailability avail = availOpt.get();
        List<Appointment> booked = appointmentRepository.findActiveByProviderAndDate(providerId, date);
        List<AppointmentDtos.SlotResponse> slots = new ArrayList<>();
        LocalTime cursor = avail.getStartTime();
        int step = avail.getSlotDurationMinutes();

        while (!cursor.plusMinutes(step).isAfter(avail.getEndTime())) {
            LocalTime slotStart = cursor;
            LocalTime slotEnd = cursor.plusMinutes(step);
            boolean conflict = booked.stream().anyMatch(b ->
                b.getStartTime().isBefore(slotEnd) && b.getEndTime().isAfter(slotStart)
            );
            slots.add(new AppointmentDtos.SlotResponse(slotStart, slotEnd, !conflict));
            cursor = slotEnd;
        }
        return slots;
    }

    public ProviderDtos.ProviderSummaryResponse toSummary(ProviderProfile p) {
        List<String> specs = serviceRepository.findByProviderIdAndIsActiveTrue(p.getId()).stream()
            .map(s -> s.getSpecialization().getName())
            .distinct()
            .toList();
        return ProviderDtos.ProviderSummaryResponse.builder()
            .id(p.getId())
            .userId(p.getUser().getId())
            .providerType(p.getProviderType())
            .fullName(p.getFullName())
            .city(p.getCity())
            .state(p.getState())
            .experienceYears(p.getExperienceYears())
            .languagesSpoken(p.getLanguagesSpoken())
            .bio(p.getBio())
            .avatarUrl(p.getAvatarUrl())
            .consultationFee(p.getConsultationFee())
            .verificationStatus(p.getVerificationStatus())
            .incentivePoints(p.getIncentivePoints())
            .incentiveTier(p.getIncentiveTier())
            .commissionRatePct(p.getCommissionRatePct())
            .avgRating(p.getAvgRating())
            .totalReviews(p.getTotalReviews())
            .isAcceptingClients(p.getIsAcceptingClients())
            .specializationNames(specs)
            .build();
    }
}
