package com.legalconnect.repository;

import com.legalconnect.entity.LegalSpecialization;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface LegalSpecializationRepository extends JpaRepository<LegalSpecialization, Long> {
    List<LegalSpecialization> findByIsActiveTrueOrderByNameAsc();
}
