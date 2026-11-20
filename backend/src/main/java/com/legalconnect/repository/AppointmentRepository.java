package com.legalconnect.repository;

import com.legalconnect.entity.Appointment;
import com.legalconnect.entity.Enums;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<Appointment, Long> {
    Page<Appointment> findByCitizenIdOrderByScheduledDateDescStartTimeDesc(Long citizenId, Pageable pageable);
    Page<Appointment> findByProviderIdOrderByScheduledDateDescStartTimeDesc(Long providerId, Pageable pageable);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        SELECT a FROM Appointment a
        WHERE a.provider.id = :providerId
          AND a.scheduledDate = :scheduledDate
          AND a.status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED')
          AND a.startTime < :endTime
          AND a.endTime > :startTime
    """)
    List<Appointment> findConflictingAppointmentsForUpdate(
        @Param("providerId") Long providerId,
        @Param("scheduledDate") LocalDate scheduledDate,
        @Param("startTime") LocalTime startTime,
        @Param("endTime") LocalTime endTime
    );

    @Query("""
        SELECT a FROM Appointment a
        WHERE a.provider.id = :providerId
          AND a.scheduledDate = :scheduledDate
          AND a.status IN ('REQUESTED', 'CONFIRMED', 'RESCHEDULED')
    """)
    List<Appointment> findActiveByProviderAndDate(
        @Param("providerId") Long providerId,
        @Param("scheduledDate") LocalDate scheduledDate
    );

    long countByStatus(Enums.AppointmentStatus status);
}
