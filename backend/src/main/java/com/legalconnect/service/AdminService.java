package com.legalconnect.service;

import com.legalconnect.dto.request.AdminDtos;
import com.legalconnect.dto.request.ProviderDtos;
import com.legalconnect.dto.response.PageResponse;
import com.legalconnect.entity.*;
import com.legalconnect.exception.ApiException;
import com.legalconnect.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.*;

@Service
@RequiredArgsConstructor
public class AdminService {
    private final UserRepository userRepository;
    private final ProviderProfileRepository providerRepository;
    private final ProviderCredentialRepository credentialRepository;
    private final AppointmentRepository appointmentRepository;
    private final PaymentRepository paymentRepository;
    private final AdminAuditLogRepository auditLogRepository;
    private final NotificationService notificationService;
    private final IncentiveService incentiveService;
    private final MarketplaceService marketplaceService;

    @Transactional(readOnly = true)
    public AdminDtos.AnalyticsResponse getAnalytics() {
        long totalUsers = userRepository.count();
        long totalProviders = providerRepository.count();
        long approvedProviders = providerRepository.countByVerificationStatus(Enums.VerificationStatus.APPROVED);
        long pendingVerifications = providerRepository.countByVerificationStatus(Enums.VerificationStatus.PENDING_REVIEW);
        long totalAppointments = appointmentRepository.count();
        long completedAppointments = appointmentRepository.countByStatus(Enums.AppointmentStatus.COMPLETED);
        BigDecimal gross = paymentRepository.sumAmountByStatus(Enums.PaymentStatus.PAID);
        BigDecimal platformRev = paymentRepository.sumTotalPlatformFees();

        List<Map<String, Object>> verificationBreakdown = List.of(
            Map.of("status", "Approved", "count", approvedProviders),
            Map.of("status", "Pending Review", "count", pendingVerifications),
            Map.of("status", "Draft / Corrections", "count",
                providerRepository.countByVerificationStatus(Enums.VerificationStatus.DRAFT)
                + providerRepository.countByVerificationStatus(Enums.VerificationStatus.CORRECTIONS_REQUIRED)),
            Map.of("status", "Rejected", "count", providerRepository.countByVerificationStatus(Enums.VerificationStatus.REJECTED))
        );

        return AdminDtos.AnalyticsResponse.builder()
            .totalUsers(totalUsers)
            .totalCitizens(Math.max(0, totalUsers - totalProviders - 1))
            .totalProviders(totalProviders)
            .approvedProviders(approvedProviders)
            .pendingVerifications(pendingVerifications)
            .totalAppointments(totalAppointments)
            .completedAppointments(completedAppointments)
            .grossTransactionVolume(gross != null ? gross : BigDecimal.ZERO)
            .totalPlatformRevenue(platformRev != null ? platformRev : BigDecimal.ZERO)
            .monthlyMetrics(List.of())
            .verificationBreakdown(verificationBreakdown)
            .build();
    }

    @Transactional(readOnly = true)
    public List<ProviderDtos.ProviderDetailResponse> getPendingProviders() {
        return providerRepository.findByVerificationStatusOrderByUpdatedAtDesc(Enums.VerificationStatus.PENDING_REVIEW)
            .stream().map(p -> marketplaceService.getProviderDetail(p.getId())).toList();
    }

    @Transactional
    public ProviderDtos.ProviderDetailResponse verifyProvider(Long adminUserId, Long providerId, AdminDtos.VerifyProviderRequest req, String ip) {
        User admin = userRepository.findById(adminUserId)
            .orElseThrow(() -> ApiException.notFound("Admin user not found"));
        ProviderProfile provider = providerRepository.findById(providerId)
            .orElseThrow(() -> ApiException.notFound("Provider not found"));

        provider.setVerificationStatus(req.getVerificationStatus());
        provider.setVerificationRemarks(req.getRemarks());

        if (req.getVerificationStatus() == Enums.VerificationStatus.APPROVED) {
            provider.setVerifiedAt(LocalDateTime.now());
            incentiveService.awardPoints(provider, 100);
            credentialRepository.findByProviderIdOrderByCreatedAtDesc(providerId).forEach(c -> {
                c.setVerificationStatus(Enums.CredentialStatus.VERIFIED);
                c.setReviewerRemarks(req.getRemarks());
                credentialRepository.save(c);
            });
        } else if (req.getVerificationStatus() == Enums.VerificationStatus.CORRECTIONS_REQUIRED) {
            credentialRepository.findByProviderIdOrderByCreatedAtDesc(providerId).forEach(c -> {
                c.setVerificationStatus(Enums.CredentialStatus.CORRECTIONS_REQUIRED);
                c.setReviewerRemarks(req.getRemarks());
                credentialRepository.save(c);
            });
        }
        providerRepository.save(provider);

        auditLogRepository.save(AdminAuditLog.builder()
            .adminUser(admin)
            .action("VERIFY_PROVIDER_" + req.getVerificationStatus().name())
            .targetEntity("PROVIDER_PROFILE")
            .targetId(provider.getId())
            .detailsJson("{\"remarks\":\"" + (req.getRemarks() != null ? req.getRemarks().replace("\"", "'") : "") + "\"}")
            .ipAddress(ip)
            .build());

        notificationService.notifyUser(provider.getUser(), "VERIFICATION_" + req.getVerificationStatus().name(),
            "Provider Verification Update",
            "Your verification status is now " + req.getVerificationStatus().name() +
                (req.getRemarks() != null ? " — " + req.getRemarks() : ""),
            "PROVIDER", provider.getId(), true);

        return marketplaceService.getProviderDetail(provider.getId());
    }

    @Transactional
    public void updateUserStatus(Long adminUserId, Long targetUserId, AdminDtos.UpdateUserStatusRequest req, String ip) {
        User admin = userRepository.findById(adminUserId).orElseThrow(() -> ApiException.notFound("Admin not found"));
        User target = userRepository.findById(targetUserId).orElseThrow(() -> ApiException.notFound("User not found"));
        if (target.getRole() == Enums.Role.ADMIN) {
            throw ApiException.forbidden("Cannot modify another administrator account status");
        }
        target.setStatus(req.getStatus());
        userRepository.save(target);

        auditLogRepository.save(AdminAuditLog.builder()
            .adminUser(admin)
            .action("USER_STATUS_" + req.getStatus().name())
            .targetEntity("USER")
            .targetId(target.getId())
            .detailsJson("{\"reason\":\"" + (req.getReason() != null ? req.getReason().replace("\"", "'") : "") + "\"}")
            .ipAddress(ip)
            .build());
    }

    @Transactional(readOnly = true)
    public PageResponse<AdminDtos.AuditLogResponse> getAuditLogs(int page, int size) {
        var logs = auditLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
            .map(l -> AdminDtos.AuditLogResponse.builder()
                .id(l.getId())
                .adminEmail(l.getAdminUser().getEmail())
                .action(l.getAction())
                .targetEntity(l.getTargetEntity())
                .targetId(l.getTargetId())
                .detailsJson(l.getDetailsJson())
                .ipAddress(l.getIpAddress())
                .createdAt(l.getCreatedAt())
                .build());
        return PageResponse.from(logs);
    }
}
