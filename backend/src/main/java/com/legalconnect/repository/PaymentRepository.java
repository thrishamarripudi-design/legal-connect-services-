package com.legalconnect.repository;

import com.legalconnect.entity.Enums;
import com.legalconnect.entity.Payment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import java.math.BigDecimal;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Long> {
    Optional<Payment> findByGatewayOrderId(String gatewayOrderId);
    Page<Payment> findByCitizenIdOrderByCreatedAtDesc(Long citizenId, Pageable pageable);
    Page<Payment> findByProviderIdOrderByCreatedAtDesc(Long providerId, Pageable pageable);

    @Query("SELECT COALESCE(SUM(p.amount), 0) FROM Payment p WHERE p.status = :status")
    BigDecimal sumAmountByStatus(Enums.PaymentStatus status);

    @Query("SELECT COALESCE(SUM(p.platformFee), 0) FROM Payment p WHERE p.status = 'PAID'")
    BigDecimal sumTotalPlatformFees();
}
