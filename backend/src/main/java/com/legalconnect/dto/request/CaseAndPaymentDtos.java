package com.legalconnect.dto.request;

import com.legalconnect.entity.Enums;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;

public class CaseAndPaymentDtos {
    @Getter @Setter
    public static class CreateCaseRequest {
        @NotNull
        private Long specializationId;
        @NotBlank @Size(max = 200)
        private String title;
        @NotBlank
        private String description;
        @NotNull
        private Enums.RequestUrgency urgency;
        @DecimalMin("0.00")
        private BigDecimal budgetMax;
        private Boolean isProBonoRequested;
        private Long preferredProviderId;
    }

    @Getter @Setter
    public static class UpdateCaseStatusRequest {
        @NotNull
        private Enums.RequestStatus status;
        private Long assignProviderId;
        private String providerNotes;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class CaseRequestResponse {
        private Long id;
        private String requestCode;
        private Long citizenId;
        private String citizenName;
        private Long assignedProviderId;
        private String assignedProviderName;
        private Long specializationId;
        private String specializationName;
        private String title;
        private String description;
        private Enums.RequestUrgency urgency;
        private BigDecimal budgetMax;
        private Boolean isProBonoRequested;
        private Enums.RequestStatus status;
        private String providerNotes;
        private LocalDateTime createdAt;
    }

    @Getter @Setter
    public static class CreatePaymentOrderRequest {
        private Long appointmentId;
        private Long serviceRequestId;
        private BigDecimal amount;
    }

    @Getter @Setter
    public static class VerifyPaymentRequest {
        @NotBlank
        private String gatewayOrderId;
        @NotBlank
        private String gatewayPaymentId;
        @NotBlank
        private String signature;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class PaymentResponse {
        private Long id;
        private String transactionRef;
        private String gatewayOrderId;
        private String gatewayPaymentId;
        private Long appointmentId;
        private String citizenName;
        private String providerName;
        private BigDecimal amount;
        private BigDecimal platformFee;
        private BigDecimal providerPayout;
        private String currency;
        private String paymentMethod;
        private Enums.PaymentStatus status;
        private String receiptNumber;
        private LocalDateTime paidAt;
        private LocalDateTime createdAt;
    }

    @Getter @Setter
    public static class CreateReviewRequest {
        @NotNull
        private Long appointmentId;
        @NotNull @Min(1) @Max(5)
        private Integer rating;
        @Size(max = 2000)
        private String comment;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class ReviewResponse {
        private Long id;
        private Long appointmentId;
        private String citizenName;
        private Integer rating;
        private String comment;
        private LocalDateTime createdAt;
    }
}
