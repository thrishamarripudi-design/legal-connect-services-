package com.legalconnect.controller;

import com.legalconnect.dto.request.*;
import com.legalconnect.dto.response.PageResponse;
import com.legalconnect.entity.CaseDocument;
import com.legalconnect.security.UserPrincipal;
import com.legalconnect.service.*;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.core.io.Resource;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class WorkflowController {
    private final AppointmentService appointmentService;
    private final CaseRequestAndReviewService caseAndReviewService;
    private final PaymentAndDocumentService paymentAndDocumentService;

    @PostMapping("/appointments")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<AppointmentDtos.AppointmentResponse> bookAppointment(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody AppointmentDtos.CreateAppointmentRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(appointmentService.createAppointment(principal.getId(), req));
    }

    @GetMapping("/appointments/my")
    public ResponseEntity<PageResponse<AppointmentDtos.AppointmentResponse>> myAppointments(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(appointmentService.getMyAppointments(principal.getId(), principal.getRole(), page, size));
    }

    @PatchMapping("/appointments/{id}/status")
    public ResponseEntity<AppointmentDtos.AppointmentResponse> updateAppointmentStatus(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody AppointmentDtos.UpdateAppointmentStatusRequest req
    ) {
        return ResponseEntity.ok(appointmentService.updateStatus(principal.getId(), principal.getRole(), id, req));
    }

    @PostMapping("/requests")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<CaseAndPaymentDtos.CaseRequestResponse> createCaseRequest(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CaseAndPaymentDtos.CreateCaseRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(caseAndReviewService.createCaseRequest(principal.getId(), req));
    }

    @GetMapping("/requests")
    public ResponseEntity<PageResponse<CaseAndPaymentDtos.CaseRequestResponse>> listCaseRequests(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(caseAndReviewService.listRequests(principal.getId(), principal.getRole(), page, size));
    }

    @PatchMapping("/requests/{id}/status")
    @PreAuthorize("hasAnyRole('PROVIDER', 'ADMIN')")
    public ResponseEntity<CaseAndPaymentDtos.CaseRequestResponse> updateCaseStatus(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody CaseAndPaymentDtos.UpdateCaseStatusRequest req
    ) {
        return ResponseEntity.ok(caseAndReviewService.updateCaseStatus(principal.getId(), principal.getRole(), id, req));
    }

    @PostMapping("/documents/upload")
    public ResponseEntity<CaseDocument> uploadDocument(
        @AuthenticationPrincipal UserPrincipal principal,
        @RequestParam(required = false) Long appointmentId,
        @RequestParam(required = false) Long serviceRequestId,
        @RequestParam(required = false) String documentTitle,
        @RequestParam("file") MultipartFile file
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(paymentAndDocumentService.uploadDocument(principal.getId(), appointmentId, serviceRequestId, documentTitle, file));
    }

    @GetMapping("/documents/{id}/download")
    public ResponseEntity<Resource> downloadDocument(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id
    ) {
        Resource resource = paymentAndDocumentService.loadAuthorizedDocument(principal.getId(), principal.getRole(), id);
        return ResponseEntity.ok()
            .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + resource.getFilename() + "\"")
            .body(resource);
    }

    @PostMapping("/payments/create-order")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<CaseAndPaymentDtos.PaymentResponse> createPaymentOrder(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CaseAndPaymentDtos.CreatePaymentOrderRequest req
    ) {
        return ResponseEntity.ok(paymentAndDocumentService.createOrder(principal.getId(), req));
    }

    @PostMapping("/payments/verify")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<CaseAndPaymentDtos.PaymentResponse> verifyPayment(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CaseAndPaymentDtos.VerifyPaymentRequest req
    ) {
        return ResponseEntity.ok(paymentAndDocumentService.verifyPayment(principal.getId(), req));
    }

    @PostMapping("/reviews")
    @PreAuthorize("hasRole('CITIZEN')")
    public ResponseEntity<CaseAndPaymentDtos.ReviewResponse> createReview(
        @AuthenticationPrincipal UserPrincipal principal,
        @Valid @RequestBody CaseAndPaymentDtos.CreateReviewRequest req
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(caseAndReviewService.createReview(principal.getId(), req));
    }
}
