package com.legalconnect.dto.request;

import com.legalconnect.entity.Enums;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

public class AppointmentDtos {
    @Getter @Setter
    public static class CreateAppointmentRequest {
        @NotNull
        private Long providerId;
        @NotNull
        private Long serviceId;
        @NotNull @FutureOrPresent
        private LocalDate scheduledDate;
        @NotNull
        private LocalTime startTime;
        @NotNull
        private Enums.ServiceMode mode;
        @Size(max = 2000)
        private String notes;
    }

    @Getter @Setter
    public static class UpdateAppointmentStatusRequest {
        @NotNull
        private Enums.AppointmentStatus status;
        private LocalDate newScheduledDate;
        private LocalTime newStartTime;
        @Size(max = 500)
        private String reason;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class AppointmentResponse {
        private Long id;
        private String appointmentCode;
        private Long citizenId;
        private String citizenName;
        private Long providerId;
        private String providerName;
        private Long serviceId;
        private String serviceTitle;
        private LocalDate scheduledDate;
        private LocalTime startTime;
        private LocalTime endTime;
        private Enums.ServiceMode mode;
        private Enums.AppointmentStatus status;
        private BigDecimal feeSnapshot;
        private String notes;
        private String cancellationReason;
        private String meetingLink;
        private String paymentStatus;
        private Boolean hasReview;
        private LocalDateTime createdAt;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class SlotResponse {
        private LocalTime startTime;
        private LocalTime endTime;
        private boolean available;
    }
}
