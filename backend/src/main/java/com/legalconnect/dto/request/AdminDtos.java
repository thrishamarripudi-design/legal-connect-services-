package com.legalconnect.dto.request;

import com.legalconnect.entity.Enums;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public class AdminDtos {
    @Getter @Setter
    public static class VerifyProviderRequest {
        @NotNull
        private Enums.VerificationStatus verificationStatus;
        @Size(max = 500)
        private String remarks;
    }

    @Getter @Setter
    public static class UpdateUserStatusRequest {
        @NotNull
        private Enums.UserStatus status;
        @Size(max = 300)
        private String reason;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class AnalyticsResponse {
        private long totalUsers;
        private long totalCitizens;
        private long totalProviders;
        private long approvedProviders;
        private long pendingVerifications;
        private long totalAppointments;
        private long completedAppointments;
        private BigDecimal grossTransactionVolume;
        private BigDecimal totalPlatformRevenue;
        private List<Map<String, Object>> monthlyMetrics;
        private List<Map<String, Object>> verificationBreakdown;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class AuditLogResponse {
        private Long id;
        private String adminEmail;
        private String action;
        private String targetEntity;
        private Long targetId;
        private String detailsJson;
        private String ipAddress;
        private LocalDateTime createdAt;
    }
}
