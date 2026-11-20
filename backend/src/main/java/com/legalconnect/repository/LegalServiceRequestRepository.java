package com.legalconnect.repository;

import com.legalconnect.entity.Enums;
import com.legalconnect.entity.LegalServiceRequest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface LegalServiceRequestRepository extends JpaRepository<LegalServiceRequest, Long> {
    Page<LegalServiceRequest> findByCitizenIdOrderByCreatedAtDesc(Long citizenId, Pageable pageable);
    Page<LegalServiceRequest> findByAssignedProviderIdOrderByCreatedAtDesc(Long providerId, Pageable pageable);
    Page<LegalServiceRequest> findByStatusOrderByCreatedAtDesc(Enums.RequestStatus status, Pageable pageable);
}
