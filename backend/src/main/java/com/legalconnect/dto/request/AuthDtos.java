package com.legalconnect.dto.request;

import com.legalconnect.entity.Enums;
import jakarta.validation.constraints.*;
import lombok.*;
import java.math.BigDecimal;

public class AuthDtos {
    @Getter @Setter
    public static class RegisterRequest {
        @NotBlank @Email @Size(max = 160)
        private String email;

        @NotBlank @Size(min = 8, max = 72)
        private String password;

        @NotNull
        private Enums.Role role; // CITIZEN or PROVIDER

        @NotBlank @Size(max = 120)
        private String fullName;

        @Size(max = 20)
        private String phone;

        @Size(max = 80)
        private String city;

        @Size(max = 80)
        private String state;

        // Provider-only onboarding fields
        private Enums.ProviderType providerType;
        private String barRegistrationNo;
        @Min(0) @Max(70)
        private Integer experienceYears;
        @DecimalMin("0.00")
        private BigDecimal consultationFee;
    }

    @Getter @Setter
    public static class LoginRequest {
        @NotBlank @Email
        private String email;

        @NotBlank
        private String password;
    }

    @Getter @Setter @Builder @AllArgsConstructor
    public static class AuthResponse {
        private String token;
        private Long userId;
        private String email;
        private Enums.Role role;
        private Enums.UserStatus status;
        private String fullName;
        private Long profileId;
        private String verificationStatus;
        private String incentiveTier;
    }
}
