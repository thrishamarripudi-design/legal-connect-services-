package com.legalconnect.repository;

import com.legalconnect.entity.Enums;
import com.legalconnect.entity.ProviderAvailability;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ProviderAvailabilityRepository extends JpaRepository<ProviderAvailability, Long> {
    List<ProviderAvailability> findByProviderIdAndIsAvailableTrue(Long providerId);
    List<ProviderAvailability> findByProviderIdOrderByIdAsc(Long providerId);
    Optional<ProviderAvailability> findByProviderIdAndDayOfWeek(Long providerId, Enums.DayOfWeekEnum dayOfWeek);
}
