package com.legalconnect.service;

import com.legalconnect.dto.request.CaseAndPaymentDtos;
import com.legalconnect.dto.response.PageResponse;
import com.legalconnect.entity.*;
import com.legalconnect.exception.ApiException;
import com.legalconnect.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CaseRequestAndReviewService {
    private final LegalServiceRequestRepository requestRepository;
    private final CitizenProfileRepository citizenRepository;
    private final ProviderProfileRepository providerRepository;
    private final LegalSpecializationRepository specializationRepository;
    private final AppointmentRepository appointmentRepository;
    private final ReviewRepository reviewRepository;
    private final IncentiveService incentiveService;
    private final NotificationService notificationService;

    @Transactional
    public CaseAndPaymentDtos.CaseRequestResponse createCaseRequest(Long citizenUserId, CaseAndPaymentDtos.CreateCaseRequest req) {
        CitizenProfile citizen = citizenRepository.findByUserId(citizenUserId)
            .orElseThrow(() -> ApiException.notFound("Citizen profile not found"));
        LegalSpecialization spec = specializationRepository.findById(req.getSpecializationId())
            .orElseThrow(() -> ApiException.notFound("Specialization not found"));
        ProviderProfile preferred = req.getPreferredProviderId() != null
            ? providerRepository.findById(req.getPreferredProviderId()).orElse(null)
            : null;

        LegalServiceRequest entity = LegalServiceRequest.builder()
            .requestCode("LC-REQ-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
            .citizen(citizen)
            .assignedProvider(preferred)
            .specialization(spec)
            .title(req.getTitle().trim())
            .description(req.getDescription().trim())
            .urgency(req.getUrgency())
            .budgetMax(req.getBudgetMax())
            .isProBonoRequested(Boolean.TRUE.equals(req.getIsProBonoRequested()))
            .status(preferred != null ? Enums.RequestStatus.ASSIGNED : Enums.RequestStatus.OPEN)
            .build();
        entity = requestRepository.save(entity);
        if (preferred != null) {
            notificationService.notifyUser(preferred.getUser(), "CASE_ASSIGNED", "New Case Assistance Request",
                citizen.getFullName() + " assigned request " + entity.getRequestCode(), "CASE_REQUEST", entity.getId(), true);
        }
        return toCaseResponse(entity);
    }

    @Transactional(readOnly = true)
    public PageResponse<CaseAndPaymentDtos.CaseRequestResponse> listRequests(Long userId, Enums.Role role, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<LegalServiceRequest> result;
        if (role == Enums.Role.CITIZEN) {
            CitizenProfile c = citizenRepository.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("Citizen profile not found"));
            result = requestRepository.findByCitizenIdOrderByCreatedAtDesc(c.getId(), pageable);
        } else if (role == Enums.Role.PROVIDER) {
            ProviderProfile p = providerRepository.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("Provider profile not found"));
            result = requestRepository.findByAssignedProviderIdOrderByCreatedAtDesc(p.getId(), pageable);
        } else {
            result = requestRepository.findAll(PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
        }
        return PageResponse.from(result.map(this::toCaseResponse));
    }

    @Transactional
    public CaseAndPaymentDtos.CaseRequestResponse updateCaseStatus(Long userId, Enums.Role role, Long requestId, CaseAndPaymentDtos.UpdateCaseStatusRequest req) {
        LegalServiceRequest entity = requestRepository.findById(requestId)
            .orElseThrow(() -> ApiException.notFound("Case request not found"));
        if (req.getAssignProviderId() != null) {
            ProviderProfile provider = providerRepository.findById(req.getAssignProviderId())
                .orElseThrow(() -> ApiException.notFound("Provider not found"));
            entity.setAssignedProvider(provider);
        }
        entity.setStatus(req.getStatus());
        if (req.getProviderNotes() != null) {
            entity.setProviderNotes(req.getProviderNotes());
        }
        entity = requestRepository.save(entity);
        notificationService.notifyUser(entity.getCitizen().getUser(), "CASE_STATUS_UPDATED",
            "Case Request Updated",
            "Request " + entity.getRequestCode() + " moved to " + entity.getStatus().name(),
            "CASE_REQUEST", entity.getId(), true);
        return toCaseResponse(entity);
    }

    @Transactional
    public CaseAndPaymentDtos.ReviewResponse createReview(Long citizenUserId, CaseAndPaymentDtos.CreateReviewRequest req) {
        Appointment appt = appointmentRepository.findById(req.getAppointmentId())
            .orElseThrow(() -> ApiException.notFound("Appointment not found"));
        if (!appt.getCitizen().getUser().getId().equals(citizenUserId)) {
            throw ApiException.forbidden("You can only review your own consultations");
        }
        if (appt.getStatus() != Enums.AppointmentStatus.COMPLETED) {
            throw ApiException.badRequest("Reviews can only be submitted after an appointment is completed");
        }
        if (reviewRepository.existsByAppointmentId(appt.getId())) {
            throw ApiException.conflict("A review has already been submitted for this consultation");
        }

        Review review = Review.builder()
            .appointment(appt)
            .citizen(appt.getCitizen())
            .provider(appt.getProvider())
            .rating(req.getRating())
            .comment(req.getComment())
            .isVisible(true)
            .build();
        review = reviewRepository.save(review);

        ProviderProfile provider = appt.getProvider();
        List<Review> visible = reviewRepository.findByProviderIdAndIsVisibleTrue(provider.getId());
        double avg = visible.stream().mapToInt(Review::getRating).average().orElse(0.0);
        provider.setAvgRating(BigDecimal.valueOf(avg).setScale(2, RoundingMode.HALF_UP));
        provider.setTotalReviews(visible.size());
        if (req.getRating() >= 4) {
            incentiveService.awardPoints(provider, 25);
        }
        providerRepository.save(provider);

        return CaseAndPaymentDtos.ReviewResponse.builder()
            .id(review.getId())
            .appointmentId(appt.getId())
            .citizenName(appt.getCitizen().getFullName())
            .rating(review.getRating())
            .comment(review.getComment())
            .createdAt(review.getCreatedAt())
            .build();
    }

    private CaseAndPaymentDtos.CaseRequestResponse toCaseResponse(LegalServiceRequest r) {
        return CaseAndPaymentDtos.CaseRequestResponse.builder()
            .id(r.getId())
            .requestCode(r.getRequestCode())
            .citizenId(r.getCitizen().getId())
            .citizenName(r.getCitizen().getFullName())
            .assignedProviderId(r.getAssignedProvider() != null ? r.getAssignedProvider().getId() : null)
            .assignedProviderName(r.getAssignedProvider() != null ? r.getAssignedProvider().getFullName() : null)
            .specializationId(r.getSpecialization().getId())
            .specializationName(r.getSpecialization().getName())
            .title(r.getTitle())
            .description(r.getDescription())
            .urgency(r.getUrgency())
            .budgetMax(r.getBudgetMax())
            .isProBonoRequested(r.getIsProBonoRequested())
            .status(r.getStatus())
            .providerNotes(r.getProviderNotes())
            .createdAt(r.getCreatedAt())
            .build();
    }
}
