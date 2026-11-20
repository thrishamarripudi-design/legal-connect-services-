package com.legalconnect.controller;

import com.legalconnect.dto.request.ProviderDtos;
import com.legalconnect.entity.Enums;
import com.legalconnect.security.UserPrincipal;
import com.legalconnect.service.ProviderOnboardingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;

@RestController
@RequestMapping("/api/v1/providers")
@PreAuthorize("hasRole('PROVIDER')")
@RequiredArgsConstructor
public class ProviderController {
    private final ProviderOnboardingService onboardingService;

    @PutMapping("/profile")
    public ResponseEntity<ProviderDtos.ProviderDetailResponse> updateProfile(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ProviderDtos.UpdateProviderProfileRequest request
    ) {
        return ResponseEntity.ok(onboardingService.updateProfile(principal.getId(), request));
    }

    @PostMapping("/credentials")
    public ResponseEntity<ProviderDtos.CredentialResponse> uploadCredential(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam Enums.CredentialDocumentType documentType,
        @RequestParam String credentialNumber,
        @RequestParam String issuingAuthority,
        @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.ok(onboardingService.uploadCredential(
            principal.getId(), documentType, credentialNumber, issuingAuthority, file
        ));
    }

    @PostMapping("/submit-verification")
    public ResponseEntity<ProviderDtos.ProviderDetailResponse> submitVerification(
        @AuthenticationPrincipal UserPrincipal principal
    ) {
        return ResponseEntity.ok(onboardingService.submitForVerification(principal.getId()));
    }

    @PostMapping("/services")
    public ResponseEntity<ProviderDtos.ServiceResponse> createService(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody ProviderDtos.ServiceUpsertRequest request
    ) {
        return ResponseEntity.ok(onboardingService.upsertService(principal.getId(), null, request));
    }

    @PutMapping("/services/{serviceId}")
    public ResponseEntity<ProviderDtos.ServiceResponse> updateService(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long serviceId,
        @Valid @RequestBody ProviderDtos.ServiceUpsertRequest request
    ) {
        return ResponseEntity.ok(onboardingService.upsertService(principal.getId(), serviceId, request));
    }

    @PutMapping("/availability")
    public ResponseEntity<List<ProviderDtos.AvailabilityResponse>> saveAvailability(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody List<ProviderDtos.AvailabilityItemRequest> items
    ) {
        return ResponseEntity.ok(onboardingService.saveAvailability(principal.getId(), items));
    }
}
