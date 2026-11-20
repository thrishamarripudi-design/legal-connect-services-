package com.legalconnect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.math.BigDecimal;
import java.time.LocalDateTime;

@Entity
@Table(name = "legal_service_requests")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class LegalServiceRequest {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "request_code", nullable = false, unique = true, length = 32)
    private String requestCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "citizen_id", nullable = false)
    private CitizenProfile citizen;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_provider_id")
    private ProviderProfile assignedProvider;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "specialization_id", nullable = false)
    private LegalSpecialization specialization;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Enums.RequestUrgency urgency = Enums.RequestUrgency.MEDIUM;

    @Column(name = "budget_max", precision = 10, scale = 2)
    private BigDecimal budgetMax;

    @Column(name = "is_pro_bono_requested", nullable = false)
    @Builder.Default
    private Boolean isProBonoRequested = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private Enums.RequestStatus status = Enums.RequestStatus.OPEN;

    @Column(name = "provider_notes", columnDefinition = "TEXT")
    private String providerNotes;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
