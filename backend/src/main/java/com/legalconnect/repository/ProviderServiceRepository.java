package com.legalconnect.repository;

import com.legalconnect.entity.ProviderService;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ProviderServiceRepository extends JpaRepository<ProviderService, Long> {
    List<ProviderService> findByProviderIdAndIsActiveTrue(Long providerId);
    List<ProviderService> findByProviderIdOrderByCreatedAtDesc(Long providerId);
}
