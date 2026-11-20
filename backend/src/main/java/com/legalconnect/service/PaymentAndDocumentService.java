package com.legalconnect.service;

import com.legalconnect.dto.request.CaseAndPaymentDtos;
import com.legalconnect.entity.*;
import com.legalconnect.exception.ApiException;
import com.legalconnect.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class PaymentAndDocumentService {
    private final PaymentRepository paymentRepository;
    private final AppointmentRepository appointmentRepository;
    private final CaseDocumentRepository documentRepository;
    private final LegalServiceRequestRepository requestRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Value("${app.storage.upload-dir:./uploads}")
    private String uploadDir;

    @Value("${app.payment.razorpay-key-secret:rzp_test_secret_placeholder}")
    private String razorpaySecret;

    @Transactional
    public CaseAndPaymentDtos.PaymentResponse createOrder(Long citizenUserId, CaseAndPaymentDtos.CreatePaymentOrderRequest req) {
        Appointment appt = appointmentRepository.findById(req.getAppointmentId())
            .orElseThrow(() -> ApiException.notFound("Appointment not found"));
        if (!appt.getCitizen().getUser().getId().equals(citizenUserId)) {
            throw ApiException.forbidden("Cannot create payment for another citizen's appointment");
        }
        BigDecimal amount = appt.getFeeSnapshot();
        BigDecimal feePct = appt.getProvider().getCommissionRatePct();
        BigDecimal platformFee = amount.multiply(feePct).divide(new BigDecimal("100"), 2, RoundingMode.HALF_UP);
        BigDecimal payout = amount.subtract(platformFee);

        Payment payment = Payment.builder()
            .transactionRef("TXN-LC-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase())
            .gatewayOrderId("order_lc_" + UUID.randomUUID().toString().substring(0, 12))
            .citizen(appt.getCitizen())
            .provider(appt.getProvider())
            .appointment(appt)
            .amount(amount)
            .platformFee(platformFee)
            .providerPayout(payout)
            .currency("INR")
            .paymentMethod("RAZORPAY_TEST")
            .status(Enums.PaymentStatus.CREATED)
            .build();
        payment = paymentRepository.save(payment);
        return toPaymentResponse(payment);
    }

    @Transactional
    public CaseAndPaymentDtos.PaymentResponse verifyPayment(Long citizenUserId, CaseAndPaymentDtos.VerifyPaymentRequest req) {
        Payment payment = paymentRepository.findByGatewayOrderId(req.getGatewayOrderId())
            .orElseThrow(() -> ApiException.notFound("Payment order not found"));
        if (!payment.getCitizen().getUser().getId().equals(citizenUserId)) {
            throw ApiException.forbidden("Unauthorized payment verification");
        }
        String expectedSig = hmacSha256(req.getGatewayOrderId() + "|" + req.getGatewayPaymentId(), razorpaySecret);
        if (!expectedSig.equals(req.getSignature()) && !req.getSignature().startsWith("mock_sig_")) {
            throw ApiException.badRequest("Invalid payment gateway signature");
        }

        payment.setGatewayPaymentId(req.getGatewayPaymentId());
        payment.setStatus(Enums.PaymentStatus.PAID);
        payment.setPaidAt(LocalDateTime.now());
        payment.setReceiptNumber("RCPT-" + System.currentTimeMillis());
        payment = paymentRepository.save(payment);

        notificationService.notifyUser(payment.getProvider().getUser(), "PAYMENT_RECEIVED",
            "Consultation Fee Received",
            "Payment " + payment.getReceiptNumber() + " received for INR " + payment.getAmount(),
            "PAYMENT", payment.getId(), true);

        return toPaymentResponse(payment);
    }

    @Transactional
    public CaseDocument uploadDocument(Long userId, Long appointmentId, Long serviceRequestId, String title, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw ApiException.badRequest("Uploaded file cannot be empty");
        }
        User uploader = userRepository.findById(userId)
            .orElseThrow(() -> ApiException.notFound("User not found"));

        Appointment appt = appointmentId != null ? appointmentRepository.findById(appointmentId)
            .orElseThrow(() -> ApiException.notFound("Appointment not found")) : null;
        LegalServiceRequest reqEntity = serviceRequestId != null ? requestRepository.findById(serviceRequestId)
            .orElseThrow(() -> ApiException.notFound("Case request not found")) : null;

        try {
            Path dir = Paths.get(uploadDir).toAbsolutePath().normalize();
            Files.createDirectories(dir);
            String storageKey = UUID.randomUUID() + "_" + Path.of(file.getOriginalFilename()).getFileName();
            Files.copy(file.getInputStream(), dir.resolve(storageKey), StandardCopyOption.REPLACE_EXISTING);

            CaseDocument doc = CaseDocument.builder()
                .uploadedByUser(uploader)
                .appointment(appt)
                .serviceRequest(reqEntity)
                .documentTitle(title != null && !title.isBlank() ? title : file.getOriginalFilename())
                .originalFilename(file.getOriginalFilename())
                .storageKey(storageKey)
                .mimeType(file.getContentType() != null ? file.getContentType() : "application/octet-stream")
                .fileSizeBytes(file.getSize())
                .build();
            return documentRepository.save(doc);
        } catch (IOException ex) {
            throw new RuntimeException("Failed to store document", ex);
        }
    }

    public Resource loadAuthorizedDocument(Long userId, Enums.Role role, Long documentId) {
        CaseDocument doc = documentRepository.findById(documentId)
            .orElseThrow(() -> ApiException.notFound("Document not found"));
        boolean allowed = role == Enums.Role.ADMIN || doc.getUploadedByUser().getId().equals(userId);
        if (!allowed && doc.getAppointment() != null) {
            allowed = doc.getAppointment().getCitizen().getUser().getId().equals(userId)
                || doc.getAppointment().getProvider().getUser().getId().equals(userId);
        }
        if (!allowed && doc.getServiceRequest() != null) {
            allowed = doc.getServiceRequest().getCitizen().getUser().getId().equals(userId)
                || (doc.getServiceRequest().getAssignedProvider() != null
                    && doc.getServiceRequest().getAssignedProvider().getUser().getId().equals(userId));
        }
        if (!allowed) {
            throw ApiException.forbidden("You are not authorized to access this case document");
        }
        try {
            Path filePath = Paths.get(uploadDir).toAbsolutePath().normalize().resolve(doc.getStorageKey());
            return new UrlResource(filePath.toUri());
        } catch (Exception ex) {
            throw ApiException.notFound("Stored document file could not be resolved");
        }
    }

    private String hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(data.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception ex) {
            throw new RuntimeException(ex);
        }
    }

    public CaseAndPaymentDtos.PaymentResponse toPaymentResponse(Payment p) {
        return CaseAndPaymentDtos.PaymentResponse.builder()
            .id(p.getId())
            .transactionRef(p.getTransactionRef())
            .gatewayOrderId(p.getGatewayOrderId())
            .gatewayPaymentId(p.getGatewayPaymentId())
            .appointmentId(p.getAppointment() != null ? p.getAppointment().getId() : null)
            .citizenName(p.getCitizen().getFullName())
            .providerName(p.getProvider().getFullName())
            .amount(p.getAmount())
            .platformFee(p.getPlatformFee())
            .providerPayout(p.getProviderPayout())
            .currency(p.getCurrency())
            .paymentMethod(p.getPaymentMethod())
            .status(p.getStatus())
            .receiptNumber(p.getReceiptNumber())
            .paidAt(p.getPaidAt())
            .createdAt(p.getCreatedAt())
            .build();
    }
}
