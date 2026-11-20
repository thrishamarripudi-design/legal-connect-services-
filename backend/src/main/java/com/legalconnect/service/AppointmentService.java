package com.legalconnect.service;

import com.legalconnect.dto.request.AppointmentDtos;
import com.legalconnect.dto.response.PageResponse;
import com.legalconnect.entity.*;
import com.legalconnect.exception.ApiException;
import com.legalconnect.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AppointmentService {
    private final AppointmentRepository appointmentRepository;
    private final CitizenProfileRepository citizenRepository;
    private final ProviderProfileRepository providerRepository;
    private final ProviderServiceRepository serviceRepository;
    private final ReviewRepository reviewRepository;
    private final NotificationService notificationService;
    private final IncentiveService incentiveService;

    @Transactional
    public AppointmentDtos.AppointmentResponse createAppointment(Long citizenUserId, AppointmentDtos.CreateAppointmentRequest req) {
        CitizenProfile citizen = citizenRepository.findByUserId(citizenUserId)
            .orElseThrow(() -> ApiException.notFound("Citizen profile not found"));
        ProviderProfile provider = providerRepository.findById(req.getProviderId())
            .orElseThrow(() -> ApiException.notFound("Provider not found"));
        if (provider.getVerificationStatus() != Enums.VerificationStatus.APPROVED) {
            throw ApiException.badRequest("Selected provider is not yet verified");
        }
        ProviderService service = serviceRepository.findById(req.getServiceId())
            .orElseThrow(() -> ApiException.notFound("Service not found"));
        if (!service.getProvider().getId().equals(provider.getId())) {
            throw ApiException.badRequest("Service does not belong to selected provider");
        }

        LocalTime endTime = req.getStartTime().plusMinutes(service.getDurationMinutes());

        // Pessimistic row-level lock prevents concurrent double booking
        List<Appointment> conflicts = appointmentRepository.findConflictingAppointmentsForUpdate(
            provider.getId(), req.getScheduledDate(), req.getStartTime(), endTime
        );
        if (!conflicts.isEmpty()) {
            throw ApiException.conflict("This time slot is already booked. Please select another available slot.");
        }

        String code = "LC-APT-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        Appointment appt = Appointment.builder()
            .appointmentCode(code)
            .citizen(citizen)
            .provider(provider)
            .service(service)
            .scheduledDate(req.getScheduledDate())
            .startTime(req.getStartTime())
            .endTime(endTime)
            .mode(req.getMode())
            .status(Enums.AppointmentStatus.REQUESTED)
            .feeSnapshot(service.getFee())
            .notes(req.getNotes())
            .meetingLink("https://meet.legalconnect.in/" + code)
            .build();
        appt = appointmentRepository.save(appt);

        notificationService.notifyUser(provider.getUser(), "APPOINTMENT_REQUESTED",
            "New Consultation Request",
            citizen.getFullName() + " requested " + service.getTitle() + " on " + req.getScheduledDate(),
            "APPOINTMENT", appt.getId(), true);

        return toResponse(appt);
    }

    @Transactional(readOnly = true)
    public PageResponse<AppointmentDtos.AppointmentResponse> getMyAppointments(Long userId, Enums.Role role, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<Appointment> data;
        if (role == Enums.Role.CITIZEN) {
            CitizenProfile citizen = citizenRepository.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("Citizen profile not found"));
            data = appointmentRepository.findByCitizenIdOrderByScheduledDateDescStartTimeDesc(citizen.getId(), pageable);
        } else {
            ProviderProfile provider = providerRepository.findByUserId(userId)
                .orElseThrow(() -> ApiException.notFound("Provider profile not found"));
            data = appointmentRepository.findByProviderIdOrderByScheduledDateDescStartTimeDesc(provider.getId(), pageable);
        }
        return PageResponse.from(data.map(this::toResponse));
    }

    @Transactional
    public AppointmentDtos.AppointmentResponse updateStatus(Long userId, Enums.Role role, Long appointmentId, AppointmentDtos.UpdateAppointmentStatusRequest req) {
        Appointment appt = appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> ApiException.notFound("Appointment not found"));

        boolean isCitizenOwner = appt.getCitizen().getUser().getId().equals(userId);
        boolean isProviderOwner = appt.getProvider().getUser().getId().equals(userId);
        if (!isCitizenOwner && !isProviderOwner && role != Enums.Role.ADMIN) {
            throw ApiException.forbidden("Not authorized to update this appointment");
        }

        if (req.getStatus() == Enums.AppointmentStatus.RESCHEDULED) {
            if (req.getNewScheduledDate() == null || req.getNewStartTime() == null) {
                throw ApiException.badRequest("New scheduled date and start time are required to reschedule");
            }
            LocalTime newEnd = req.getNewStartTime().plusMinutes(appt.getService().getDurationMinutes());
            List<Appointment> conflicts = appointmentRepository.findConflictingAppointmentsForUpdate(
                appt.getProvider().getId(), req.getNewScheduledDate(), req.getNewStartTime(), newEnd
            ).stream().filter(a -> !a.getId().equals(appt.getId())).toList();
            if (!conflicts.isEmpty()) {
                throw ApiException.conflict("Requested reschedule time slot conflicts with an existing booking");
            }
            appt.setScheduledDate(req.getNewScheduledDate());
            appt.setStartTime(req.getNewStartTime());
            appt.setEndTime(newEnd);
        }

        if (req.getStatus() == Enums.AppointmentStatus.CANCELLED || req.getStatus() == Enums.AppointmentStatus.REJECTED) {
            appt.setCancellationReason(req.getReason());
        }

        if (req.getStatus() == Enums.AppointmentStatus.COMPLETED && isProviderOwner) {
            incentiveService.awardPoints(appt.getProvider(), 20);
            if (Boolean.TRUE.equals(appt.getService().getIsProBonoEligible())) {
                appt.getProvider().setProBonoCasesCompleted(appt.getProvider().getProBonoCasesCompleted() + 1);
                incentiveService.awardPoints(appt.getProvider(), 30);
            }
            providerRepository.save(appt.getProvider());
        }

        appt.setStatus(req.getStatus());
        appointmentRepository.save(appt);

        User targetUser = isProviderOwner ? appt.getCitizen().getUser() : appt.getProvider().getUser();
        notificationService.notifyUser(targetUser, "APPOINTMENT_" + req.getStatus().name(),
            "Appointment " + req.getStatus().name(),
            "Appointment " + appt.getAppointmentCode() + " is now " + req.getStatus().name(),
            "APPOINTMENT", appt.getId(), true);

        return toResponse(appt);
    }

    private AppointmentDtos.AppointmentResponse toResponse(Appointment a) {
        return AppointmentDtos.AppointmentResponse.builder()
            .id(a.getId())
            .appointmentCode(a.getAppointmentCode())
            .citizenId(a.getCitizen().getId())
            .citizenName(a.getCitizen().getFullName())
            .providerId(a.getProvider().getId())
            .providerName(a.getProvider().getFullName())
            .serviceId(a.getService().getId())
            .serviceTitle(a.getService().getTitle())
            .scheduledDate(a.getScheduledDate())
            .startTime(a.getStartTime())
            .endTime(a.getEndTime())
            .mode(a.getMode())
            .status(a.getStatus())
            .feeSnapshot(a.getFeeSnapshot())
            .notes(a.getNotes())
            .cancellationReason(a.getCancellationReason())
            .meetingLink(a.getMeetingLink())
            .hasReview(reviewRepository.existsByAppointmentId(a.getId()))
            .createdAt(a.getCreatedAt())
            .build();
    }
}
