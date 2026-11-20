package com.legalconnect;

import com.legalconnect.entity.Enums;
import com.legalconnect.entity.ProviderProfile;
import com.legalconnect.service.IncentiveService;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import static org.junit.jupiter.api.Assertions.*;

class AuthAndIncentiveTests {

    private final IncentiveService incentiveService = new IncentiveService();

    @Test
    void awardsPointsAndUpgradesIncentiveTierWithLowerCommission() {
        ProviderProfile provider = ProviderProfile.builder()
            .incentivePoints(200)
            .incentiveTier(Enums.IncentiveTier.BRONZE)
            .commissionRatePct(new BigDecimal("15.00"))
            .build();

        incentiveService.awardPoints(provider, 100);
        assertEquals(300, provider.getIncentivePoints());
        assertEquals(Enums.IncentiveTier.SILVER, provider.getIncentiveTier());
        assertEquals(new BigDecimal("11.00"), provider.getCommissionRatePct());

        incentiveService.awardPoints(provider, 500);
        assertEquals(800, provider.getIncentivePoints());
        assertEquals(Enums.IncentiveTier.PLATINUM, provider.getIncentiveTier());
        assertEquals(new BigDecimal("5.00"), provider.getCommissionRatePct());
    }
}
