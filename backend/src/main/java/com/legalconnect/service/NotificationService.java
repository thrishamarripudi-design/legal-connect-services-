package com.legalconnect.service;

import com.legalconnect.entity.Notification;
import com.legalconnect.entity.User;
import com.legalconnect.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {
    private final NotificationRepository notificationRepository;
    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String mailUsername;

    @Transactional
    public void notifyUser(User user, String type, String title, String message, String refType, Long refId, boolean sendEmail) {
        Notification notification = Notification.builder()
            .user(user)
            .type(type)
            .title(title)
            .message(message)
            .referenceType(refType)
            .referenceId(refId)
            .isRead(false)
            .build();
        notificationRepository.save(notification);

        if (sendEmail && mailUsername != null && !mailUsername.isBlank()) {
            sendEmailAsync(user.getEmail(), "[LegalConnect] " + title, message);
        }
    }

    @Async
    public void sendEmailAsync(String to, String subject, String body) {
        try {
            SimpleMailMessage msg = new SimpleMailMessage();
            msg.setFrom(mailUsername);
            msg.setTo(to);
            msg.setSubject(subject);
            msg.setText(body);
            mailSender.send(msg);
        } catch (Exception ex) {
            log.warn("Email delivery skipped or failed for {}: {}", to, ex.getMessage());
        }
    }
}
