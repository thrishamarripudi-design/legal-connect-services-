package com.legalconnect.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import java.time.LocalDateTime;

@Entity
@Table(name = "citizen_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class CitizenProfile {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "full_name", nullable = false, length = 120)
    private String fullName;

    @Column(length = 20)
    private String phone;

    @Column(length = 80)
    private String city;

    @Column(length = 80)
    private String state;

    @Column(name = "preferred_language", nullable = false, length = 40)
    @Builder.Default
    private String preferredLanguage = "English";

    @Column(name = "address_line", length = 255)
    private String addressLine;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
