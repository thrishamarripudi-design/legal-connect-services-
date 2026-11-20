package com.legalconnect.dto.request;

import com.legalconnect.entity.Enums;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

public class ProviderDtos {
    @Getter @Setter
    public static class UpdateProviderProfileRequest {
        @NotBlank @Size(max = 120)
        private String fullName;
        @NotBlank @Size(max = 20)
        private String phone;
        private Enums.ProviderType providerType;
        private String barRegistrationNo;
        @NotNull @Min(0) @Max(70)
        private Integer experienceYears;
        @NotBlank @Size(max = 80)
        private String city;
        @NotBlank @Size(max = 80)
        private String state;
        private String languagesSpoken;
        private String bio;
        @NotNull @DecimalMin("0.00")
        private BigDecimal consultationFee;
        private Boolean isAcceptingClients;
    }

    @Getter @Setter
    public static class ServiceUpsertRequest {
        @NotNull
        private Long specializationId;
        @NotBlank @Size(max = 160)
        private String title;
        @NotBlank
        private String description;
        @NotNull
        private Enums.ServiceMode serviceMode;
        @NotNull @DecimalMin("0.00")
        private BigDecimal fee;
        @NotNull @Min(15) @Max(240)
        private Integer durationMinutes;
        private Boolean isProBonoEligible;
        private Boolean isActive;
    }

    @Getter @Setter
    public static class AvailabilityItemRequest {
        @NotNull
        private Enums.DayOfWeekEnum dayOfWeek;
        @NotNull
        private LocalTime startTime;
        @NotNull
        private LocalTime endTime;
        @NotNull @Min(15) @Max(120)
        private Integer slotDurationMinutes;
        private Boolean isAvailable;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class ProviderSummaryResponse {
        private Long id;
        private Long userId;
        private Enums.ProviderType providerType;
        private String fullName;
        private String city;
        private String state;
        private Integer experienceYears;
        private String languagesSpoken;
        private String bio;
        private String avatarUrl;
        private BigDecimal consultationFee;
        private Enums.VerificationStatus verificationStatus;
        private Integer incentivePoints;
        private Enums.IncentiveTier incentiveTier;
        private BigDecimal commissionRatePct;
        private BigDecimal avgRating;
        private Integer totalReviews;
        private Boolean isAcceptingClients;
        private List<String> specializationNames;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class ProviderDetailResponse {
        private ProviderSummaryResponse profile;
        private String barRegistrationNo;
        private String phone;
        private String verificationRemarks;
        private Integer proBonoCasesCompleted;
        private List<ServiceResponse> services;
        private List<AvailabilityResponse> availability;
        private List<CredentialResponse> credentials;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class ServiceResponse {
        private Long id;
        private Long specializationId;
        private String specializationName;
        private String title;
        private String description;
        private Enums.ServiceMode serviceMode;
        private BigDecimal fee;
        private Integer durationMinutes;
        private Boolean isProBonoEligible;
        private Boolean isActive;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class AvailabilityResponse {
        private Long id;
        private Enums.DayOfWeekEnum dayOfWeek;
        private LocalTime startTime;
        private LocalTime endTime;
        private Integer slotDurationMinutes;
        private Boolean isAvailable;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class CredentialResponse {
        private Long id;
        private Enums.CredentialDocumentType documentType;
        private String credentialNumber;
        private String issuingAuthority;
        private String originalFilename;
        private Enums.CredentialStatus verificationStatus;
        private String reviewerRemarks;
        private LocalDateTime createdAt;
    }
}
