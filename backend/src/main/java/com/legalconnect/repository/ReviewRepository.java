package com.legalconnect.repository;

import com.legalconnect.entity.Review;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ReviewRepository extends JpaRepository<Review, Long> {
    boolean existsByAppointmentId(Long appointmentId);
    Page<Review> findByProviderIdAndIsVisibleTrueOrderByCreatedAtDesc(Long providerId, Pageable pageable);
    List<Review> findByProviderIdAndIsVisibleTrue(Long providerId);
}
