package com.legalconnect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "provider_credentials")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class ProviderCredential {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_id", nullable = false)
    private ProviderProfile provider;

    @Enumerated(EnumType.STRING)
    @Column(name = "document_type", nullable = false, length = 30)
    private Enums.CredentialDocumentType documentType;

    @Column(name = "credential_number", nullable = false, length = 100)
    private String credentialNumber;

    @Column(name = "issuing_authority", nullable = false, length = 160)
    private String issuingAuthority;

    @Column(name = "original_filename", nullable = false, length = 255)
    private String originalFilename;

    @Column(name = "storage_key", nullable = false, length = 255)
    private String storageKey;

    @Enumerated(EnumType.STRING)
    @Column(name = "verification_status", nullable = false, length = 30)
    @Builder.Default
    private Enums.CredentialStatus verificationStatus = Enums.CredentialStatus.PENDING;

    @Column(name = "reviewer_remarks", length = 500)
    private String reviewerRemarks;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
