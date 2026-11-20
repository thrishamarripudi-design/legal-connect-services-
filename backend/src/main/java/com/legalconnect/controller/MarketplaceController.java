package com.legalconnect.controller;

import com.legalconnect.dto.request.AppointmentDtos;
import com.legalconnect.dto.request.ProviderDtos;
import com.legalconnect.dto.response.PageResponse;
import com.legalconnect.entity.Enums;
import com.legalconnect.entity.LegalSpecialization;
import com.legalconnect.service.MarketplaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/v1/marketplace")
@RequiredArgsConstructor
public class MarketplaceController {
    private final MarketplaceService marketplaceService;

    @GetMapping("/specializations")
    public ResponseEntity<List<LegalSpecialization>> specializations() {
        return ResponseEntity.ok(marketplaceService.listSpecializations());
    }

    @GetMapping("/providers")
    public ResponseEntity<PageResponse<ProviderDtos.ProviderSummaryResponse>> searchProviders(
        @RequestParam(required = false) String q,
        @RequestParam(required = false) Long specializationId,
        @RequestParam(required = false) Enums.ProviderType providerType,
        @RequestParam(required = false) String city,
        @RequestParam(required = false) BigDecimal maxFee,
        @RequestParam(required = false) Integer minExperience,
        @RequestParam(required = false) BigDecimal minRating,
        @RequestParam(required = false) Enums.DayOfWeekEnum dayOfWeek,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "9") int size,
        @RequestParam(defaultValue = "merit") String sort
    ) {
        return ResponseEntity.ok(marketplaceService.searchProviders(
            q, specializationId, providerType, city, maxFee, minExperience, minRating, dayOfWeek, page, size, sort
        ));
    }

    @GetMapping("/providers/{id}")
    public ResponseEntity<ProviderDtos.ProviderDetailResponse> providerDetail(@PathVariable Long id) {
        return ResponseEntity.ok(marketplaceService.getProviderDetail(id));
    }

    @GetMapping("/providers/{id}/slots")
    public ResponseEntity<List<AppointmentDtos.SlotResponse>> availableSlots(
        @PathVariable Long id,
        @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date
    ) {
        return ResponseEntity.ok(marketplaceService.getAvailableSlots(id, date));
    }
}
