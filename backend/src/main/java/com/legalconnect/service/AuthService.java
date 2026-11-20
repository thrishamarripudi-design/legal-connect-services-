package com.legalconnect.service;

import com.legalconnect.dto.request.AuthDtos;
import com.legalconnect.entity.*;
import com.legalconnect.exception.ApiException;
import com.legalconnect.repository.*;
import com.legalconnect.security.JwtTokenProvider;
import com.legalconnect.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AuthService {
    private final UserRepository userRepository;
    private final CitizenProfileRepository citizenProfileRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenProvider jwtTokenProvider;
    private final NotificationService notificationService;

    @Transactional
    public AuthDtos.AuthResponse register(AuthDtos.RegisterRequest req) {
        if (req.getRole() == Enums.Role.ADMIN) {
            throw ApiException.forbidden("Public registration for ADMIN role is not permitted");
        }
        if (userRepository.existsByEmailIgnoreCase(req.getEmail())) {
            throw ApiException.conflict("An account with this email already exists");
        }

        User user = User.builder()
            .email(req.getEmail().trim().toLowerCase())
            .passwordHash(passwordEncoder.encode(req.getPassword()))
            .role(req.getRole())
            .status(Enums.UserStatus.ACTIVE)
            .build();
        user = userRepository.save(user);

        Long profileId;
        String verificationStatus = null;
        String incentiveTier = null;

        if (req.getRole() == Enums.Role.CITIZEN) {
            CitizenProfile citizen = CitizenProfile.builder()
                .user(user)
                .fullName(req.getFullName().trim())
                .phone(req.getPhone())
                .city(req.getCity())
                .state(req.getState())
                .build();
            citizen = citizenProfileRepository.save(citizen);
            profileId = citizen.getId();
            notificationService.notifyUser(user, "WELCOME", "Welcome to LegalConnect",
                "Your citizen account is ready. Explore verified advocates, mediators, and arbitrators.", "USER", user.getId(), true);
        } else {
            ProviderProfile provider = ProviderProfile.builder()
                .user(user)
                .providerType(req.getProviderType() != null ? req.getProviderType() : Enums.ProviderType.ADVOCATE)
                .fullName(req.getFullName().trim())
                .phone(req.getPhone() != null ? req.getPhone() : "")
                .barRegistrationNo(req.getBarRegistrationNo())
                .experienceYears(req.getExperienceYears() != null ? req.getExperienceYears() : 0)
                .city(req.getCity() != null ? req.getCity() : "")
                .state(req.getState() != null ? req.getState() : "")
                .consultationFee(req.getConsultationFee() != null ? req.getConsultationFee() : new BigDecimal("500.00"))
                .verificationStatus(Enums.VerificationStatus.DRAFT)
                .incentivePoints(25)
                .incentiveTier(Enums.IncentiveTier.BRONZE)
                .commissionRatePct(new BigDecimal("15.00"))
                .build();
            provider = providerProfileRepository.save(provider);
            profileId = provider.getId();
            verificationStatus = provider.getVerificationStatus().name();
            incentiveTier = provider.getIncentiveTier().name();
            notificationService.notifyUser(user, "ONBOARDING_STARTED", "Complete Provider Verification",
                "You earned 25 onboarding points! Upload your Bar/practice credentials to unlock verified status.", "PROVIDER", provider.getId(), true);
        }

        UserPrincipal principal = new UserPrincipal(user);
        String token = jwtTokenProvider.generateToken(principal);
        return AuthDtos.AuthResponse.builder()
            .token(token)
            .userId(user.getId())
            .email(user.getEmail())
            .role(user.getRole())
            .status(user.getStatus())
            .fullName(req.getFullName())
            .profileId(profileId)
            .verificationStatus(verificationStatus)
            .incentiveTier(incentiveTier)
            .build();
    }

    @Transactional
    public AuthDtos.AuthResponse login(AuthDtos.LoginRequest req) {
        Authentication auth = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(req.getEmail().trim().toLowerCase(), req.getPassword())
        );
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        User user = userRepository.findById(principal.getId())
            .orElseThrow(() -> ApiException.unauthorized("User not found"));
        if (user.getStatus() == Enums.UserStatus.SUSPENDED) {
            throw ApiException.forbidden("Account has been suspended by an administrator");
        }
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        return buildAuthResponse(user, jwtTokenProvider.generateToken(principal));
    }

    public AuthDtos.AuthResponse currentUser(Long userId) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.notFound("User not found"));
        return buildAuthResponse(user, null);
    }

    private AuthDtos.AuthResponse buildAuthResponse(User user, String token) {
        String fullName = "Platform Administrator";
        Long profileId = null;
        String verificationStatus = null;
        String incentiveTier = null;

        if (user.getRole() == Enums.Role.CITIZEN) {
            CitizenProfile cp = citizenProfileRepository.findByUserId(user.getId()).orElse(null);
            if (cp != null) {
                fullName = cp.getFullName();
                profileId = cp.getId();
            }
        } else if (user.getRole() == Enums.Role.PROVIDER) {
            ProviderProfile pp = providerProfileRepository.findByUserId(user.getId()).orElse(null);
            if (pp != null) {
                fullName = pp.getFullName();
                profileId = pp.getId();
                verificationStatus = pp.getVerificationStatus().name();
                incentiveTier = pp.getIncentiveTier().name();
            }
        }

        return AuthDtos.AuthResponse.builder()
            .token(token)
            .userId(user.getId())
            .email(user.getEmail())
            .role(user.getRole())
            .status(user.getStatus())
            .fullName(fullName)
            .profileId(profileId)
            .verificationStatus(verificationStatus)
            .incentiveTier(incentiveTier)
            .build();
    }
}
