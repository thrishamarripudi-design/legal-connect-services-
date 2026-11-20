package com.legalconnect.service;

import com.legalconnect.dto.request.ProviderDtos;
import com.legalconnect.entity.*;
import com.legalconnect.exception.ApiException;
import com.legalconnect.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.*;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProviderOnboardingService {
    private final ProviderProfileRepository providerRepository;
    private final ProviderCredentialRepository credentialRepository;
    private final ProviderServiceRepository serviceRepository;
    private final ProviderAvailabilityRepository availabilityRepository;
    private final LegalSpecializationRepository specializationRepository;
    private final IncentiveService incentiveService;
    private final MarketplaceService marketplaceService;

    @Value("${app.storage.upload-dir:./uploads}")
    private String uploadDir;

    @Transactional
    public ProviderDtos.ProviderDetailResponse updateProfile(Long userId, ProviderDtos.UpdateProviderProfileRequest req) {
        ProviderProfile p = providerRepository.findByUserId(userId)
            .orElseThrow(() -> ApiException.notFound("Provider profile not found"));
        p.setFullName(req.getFullName().trim());
        p.setPhone(req.getPhone().trim());
        if (req.getProviderType() != null) p.setProviderType(req.getProviderType());
        p.setBarRegistrationNo(req.getBarRegistrationNo());
        p.setExperienceYears(req.getExperienceYears());
        p.setCity(req.getCity().trim());
        p.setState(req.getState().trim());
        if (req.getLanguagesSpoken() != null) p.setLanguagesSpoken(req.getLanguagesSpoken());
        p.setBio(req.getBio());
        p.setConsultationFee(req.getConsultationFee());
        if (req.getIsAcceptingClients() != null) p.setIsAcceptingClients(req.getIsAcceptingClients());
        providerRepository.save(p);
        return marketplaceService.getProviderDetail(p.getId());
    }

    @Transactional
    public ProviderDtos.CredentialResponse uploadCredential(
        Long userId, Enums.CredentialDocumentType docType, String credentialNumber,
        String issuingAuthority, MultipartFile file
    ) {
        ProviderProfile p = providerRepository.findByUserId(userId)
            .orElseThrow(() -> ApiException.notFound("Provider profile not found"));
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Credential document file is required");
        }
        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String storageKey = "cred_" + UUID.randomUUID() + "_" + Path.of(file.getOriginalFilename()).getFileName();
            Files.copy(file.getInputStream(), dir.resolve(storageKey), StandardCopyOption.REPLACE_EXISTING);

            ProviderCredential cred = ProviderCredential.builder()
                .provider(p)
                .documentType(docType)
                .credentialNumber(credentialNumber)
                .issuingAuthority(issuingAuthority)
                .originalFilename(file.getOriginalFilename())
                .storageKey(storageKey)
                .verificationStatus(Enums.CredentialStatus.PENDING)
                .build();
            cred = credentialRepository.save(cred);
            incentiveService.awardPoints(p, 15);
            providerRepository.save(p);

            return ProviderDtos.CredentialResponse.builder()
                .id(cred.getId())
                .documentType(cred.getDocumentType())
                .credentialNumber(cred.getCredentialNumber())
                .issuingAuthority(cred.getIssuingAuthority())
                .originalFilename(cred.getOriginalFilename())
                .verificationStatus(cred.getVerificationStatus())
                .createdAt(cred.getCreatedAt())
                .build();
        } catch (IOException ex) {
            throw new RuntimeException("Failed to store credential file", ex);
        }
    }

    @Transactional
    public ProviderDtos.ProviderDetailResponse submitForVerification(Long userId) {
        ProviderProfile p = providerRepository.findByUserId(userId)
            .orElseThrow(() -> ApiException.notFound("Provider profile not found"));
        List<ProviderCredential> creds = credentialRepository.findByProviderIdOrderByCreatedAtDesc(p.getId());
        if (creds.isEmpty()) {
            throw ApiException.badRequest("Upload at least one Bar Council, license, or government ID document before submitting");
        }
        p.setVerificationStatus(Enums.VerificationStatus.PENDING_REVIEW);
        p.setVerificationRemarks("Submitted for administrator review");
        providerRepository.save(p);
        return marketplaceService.getProviderDetail(p.getId());
    }

    @Transactional
    public ProviderDtos.ServiceResponse upsertService(Long userId, Long serviceId, ProviderDtos.ServiceUpsertRequest req) {
        ProviderProfile p = providerRepository.findByUserId(userId)
            .orElseThrow(() -> ApiException.notFound("Provider profile not found"));
        LegalSpecialization spec = specializationRepository.findById(req.getSpecializationId())
            .orElseThrow(() -> ApiException.notFound("Legal specialization not found"));

        ProviderService srv = serviceId != null
            ? serviceRepository.findById(serviceId).orElseThrow(() -> ApiException.notFound("Service not found"))
            : new ProviderService();
        if (serviceId != null && !srv.getProvider().getId().equals(p.getId())) {
            throw ApiException.forbidden("Cannot edit another provider's service");
        }
        srv.setProvider(p);
        srv.setSpecialization(spec);
        srv.setTitle(req.getTitle().trim());
        srv.setDescription(req.getDescription().trim());
        srv.setServiceMode(req.getServiceMode());
        srv.setFee(req.getFee());
        srv.setDurationMinutes(req.getDurationMinutes());
        srv.setIsProBonoEligible(Boolean.TRUE.equals(req.getIsProBonoEligible()));
        srv.setIsActive(req.getIsActive() == null || req.getIsActive());
        srv = serviceRepository.save(srv);

        return ProviderDtos.ServiceResponse.builder()
            .id(srv.getId())
            .specializationId(spec.getId())
            .specializationName(spec.getName())
            .title(srv.getTitle())
            .description(srv.getDescription())
            .serviceMode(srv.getServiceMode())
            .fee(srv.getFee())
            .durationMinutes(srv.getDurationMinutes())
            .isProBonoEligible(srv.getIsProBonoEligible())
            .isActive(srv.getIsActive())
            .build();
    }

    @Transactional
    public List<ProviderDtos.AvailabilityResponse> saveAvailability(Long userId, List<ProviderDtos.AvailabilityItemRequest> items) {
        ProviderProfile p = providerRepository.findByUserId(userId)
            .orElseThrow(() -> ApiException.notFound("Provider profile not found"));
        for (ProviderDtos.AvailabilityItemRequest item : items) {
            if (!item.getEndTime().isAfter(item.getStartTime())) {
                throw ApiException.badRequest("End time must be after start time for " + item.getDayOfWeek());
            }
            ProviderAvailability av = availabilityRepository.findByProviderIdAndDayOfWeek(p.getId(), item.getDayOfWeek())
                .orElse(ProviderAvailability.builder().provider(p).dayOfWeek(item.getDayOfWeek()).build());
            av.setStartTime(item.getStartTime());
            av.setEndTime(item.getEndTime());
            av.setSlotDurationMinutes(item.getSlotDurationMinutes());
            av.setIsAvailable(item.getIsAvailable() == null || item.getIsAvailable());
            availabilityRepository.save(av);
        }
        return availabilityRepository.findByProviderIdOrderByIdAsc(p.getId()).stream()
            .map(a -> ProviderDtos.AvailabilityResponse.builder()
                .id(a.getId()).dayOfWeek(a.getDayOfWeek()).startTime(a.getStartTime())
                .endTime(a.getEndTime()).slotDurationMinutes(a.getSlotDurationMinutes())
                .isAvailable(a.getIsAvailable()).build())
            .toList();
    }
}
