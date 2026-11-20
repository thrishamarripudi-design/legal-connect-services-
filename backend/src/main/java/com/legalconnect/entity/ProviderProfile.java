package com.legalconnect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "provider_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProviderProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(name = "provider_type", nullable = false, length = 30)
    private Enums.ProviderType providerType;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(nullable = false, length = 20)
    private String phone;

    @Column(name = "bar_registration_no", unique = true, length = 80)
    private String barRegistrationNo;

    @Column(name = "experience_years", nullable = false)
    @Builder.Default
    private Integer experienceYears = 0;

    @Column(nullable = false, length = 80)
    private String city;

    @Column(nullable = false, length = 80)
    private String state;

    @Column(name = "languages_spoken", nullable = false, length = 200)
    @Builder.Default
    private String languagesSpoken = "English, Hindi";

    @Column(columnDefinition = "TEXT")
    private String bio;

    @Column(name = "avatar_url", length = 500)
    private String avatarUrl;

    @Column(name = "consultation_fee", nullable = false, precision = 10, scale = 2)
    @Builder.Default
    private BigDecimal consultationFee = new BigDecimal("500.00");

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 30)
    @Builder.Default
    private Enums.VerificationStatus verificationStatus = Enums.VerificationStatus.DRAFT;

    @Column(name = "verification_remarks", length = 500)
    private String verificationRemarks;

    @Column(name = "verified_at")
    private LocalDateTime verifiedAt;

    @Column(name = "incentive_points", nullable = false)
    @Builder.Default
    private Integer incentivePoints = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "incentive_tier", nullable = false, length = 20)
    @Builder.Default
    private Enums.IncentiveTier incentiveTier = Enums.IncentiveTier.BRONZE;

    @Column(name = "commission_rate_pct", nullable = false, precision = 5, scale = 2)
    @Builder.Default
    private BigDecimal commissionRatePct = new BigDecimal("15.00");

    @Column(name = "pro_bono_cases_completed", nullable = false)
    @Builder.Default
    private Integer proBonoCasesCompleted = 0;

    @Column(name = "avg_rating", nullable = false, precision = 3, scale = 2)
    @Builder.Default
    private BigDecimal avgRating = BigDecimal.ZERO;

    @Column(name = "total_reviews", nullable = false)
    @Builder.Default
    private Integer totalReviews = 0;

    @Column(name = "is_accepting_clients", nullable = false)
    @Builder.Default
    private Boolean isAcceptingClients = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
