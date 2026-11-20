package com.legalconnect.repository;

import com.legalconnect.entity.ProviderCredential;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProviderCredentialRepository extends JpaRepository<ProviderCredential, Long> {
    List<ProviderCredential> findByProviderIdOrderByCreatedAtDesc(Long providerId);
}
