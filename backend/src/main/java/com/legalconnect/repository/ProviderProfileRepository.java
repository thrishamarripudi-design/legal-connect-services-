package com.legalconnect.repository;

import com.legalconnect.entity.Enums;
import com.legalconnect.entity.ProviderProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import java.util.List;
import java.util.Optional;

public interface ProviderProfileRepository extends JpaRepository<ProviderProfile, Long>, JpaSpecificationExecutor<ProviderProfile> {
    Optional<ProviderProfile> findByUserId(Long userId);
    List<ProviderProfile> findByVerificationStatusOrderByUpdatedAtDesc(Enums.VerificationStatus status);
    long countByVerificationStatus(Enums.VerificationStatus status);
}
