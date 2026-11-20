package com.legalconnect;

import com.legalconnect.dto.request.AppointmentDtos;
import com.legalconnect.entity.*;
import com.legalconnect.exception.ApiException;
import com.legalconnect.repository.*;
import com.legalconnect.service.AppointmentService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AppointmentWorkflowIntegrationTest {

    @Mock private AppointmentRepository appointmentRepository;
    @Mock private CitizenProfileRepository citizenRepository;
    @Mock private ProviderProfileRepository providerRepository;
    @Mock private ProviderServiceRepository serviceRepository;
    @Mock private ReviewRepository reviewRepository;

    @InjectMocks private AppointmentService appointmentService;

    @Test
    void rejectsDoubleBookingWhenConflictingAppointmentExists() {
        User citizenUser = User.builder().id(10L).email("citizen@test.in").role(Enums.Role.CITIZEN).build();
        CitizenProfile citizen = CitizenProfile.builder().id(1L).user(citizenUser).fullName("Test Citizen").build();
        User providerUser = User.builder().id(20L).email("adv@test.in").role(Enums.Role.PROVIDER).build();
        ProviderProfile provider = ProviderProfile.builder()
            .id(2L).user(providerUser).verificationStatus(Enums.VerificationStatus.APPROVED).build();
        ProviderService service = ProviderService.builder()
            .id(3L).provider(provider).durationMinutes(30).fee(new BigDecimal("1000.00")).build();

        when(citizenRepository.findByUserId(10L)).thenReturn(Optional.of(citizen));
        when(providerRepository.findById(2L)).thenReturn(Optional.of(provider));
        when(serviceRepository.findById(3L)).thenReturn(Optional.of(service));
        when(appointmentRepository.findConflictingAppointmentsForUpdate(any(), any(), any(), any()))
            .thenReturn(List.of(Appointment.builder().id(99L).build()));

        AppointmentDtos.CreateAppointmentRequest req = new AppointmentDtos.CreateAppointmentRequest();
        req.setProviderId(2L);
        req.setServiceId(3L);
        req.setScheduledDate(LocalDate.now().plusDays(2));
        req.setStartTime(LocalTime.of(11, 0));
        req.setMode(Enums.ServiceMode.VIDEO);

        ApiException ex = assertThrows(ApiException.class, () -> appointmentService.createAppointment(10L, req));
        assertEquals("CONFLICT", ex.getCode());
    }
}
