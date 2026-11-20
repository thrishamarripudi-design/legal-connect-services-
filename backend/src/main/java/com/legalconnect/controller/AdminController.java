package com.legalconnect.controller;

import com.legalconnect.dto.request.AdminDtos;
import com.legalconnect.dto.request.ProviderDtos;
import com.legalconnect.dto.response.PageResponse;
import com.legalconnect.security.UserPrincipal;
import com.legalconnect.service.AdminService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('ADMIN')")
@RequiredArgsConstructor
public class AdminController {
    private final AdminService adminService;

    @GetMapping("/analytics")
    public ResponseEntity<AdminDtos.AnalyticsResponse> analytics() {
        return ResponseEntity.ok(adminService.getAnalytics());
    }

    @GetMapping("/providers/pending")
    public ResponseEntity<List<ProviderDtos.ProviderDetailResponse>> pendingProviders() {
        return ResponseEntity.ok(adminService.getPendingProviders());
    }

    @PatchMapping("/providers/{id}/verify")
    public ResponseEntity<ProviderDtos.ProviderDetailResponse> verifyProvider(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody AdminDtos.VerifyProviderRequest req,
        HttpServletRequest httpReq
    ) {
        return ResponseEntity.ok(adminService.verifyProvider(principal.getId(), id, req, httpReq.getRemoteAddr()));
    }

    @PatchMapping("/users/{id}/status")
    public ResponseEntity<Void> updateUserStatus(
        @AuthenticationPrincipal UserPrincipal principal,
        @PathVariable Long id,
        @Valid @RequestBody AdminDtos.UpdateUserStatusRequest req,
        HttpServletRequest httpReq
    ) {
        adminService.updateUserStatus(principal.getId(), id, req, httpReq.getRemoteAddr());
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/audit-logs")
    public ResponseEntity<PageResponse<AdminDtos.AuditLogResponse>> auditLogs(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "15") int size
    ) {
        return ResponseEntity.ok(adminService.getAuditLogs(page, size));
    }
}
