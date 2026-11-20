package com.legalconnect.repository;

import com.legalconnect.entity.CaseDocument;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CaseDocumentRepository extends JpaRepository<CaseDocument, Long> {
    List<CaseDocument> findByAppointmentIdOrderByCreatedAtDesc(Long appointmentId);
    List<CaseDocument> findByServiceRequestIdOrderByCreatedAtDesc(Long serviceRequestId);
    List<CaseDocument> findByUploadedByUserIdOrderByCreatedAtDesc(Long userId);
}
