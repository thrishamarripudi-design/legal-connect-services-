package com.legalconnect.service;

import com.legalconnect.entity.Enums;
import com.legalconnect.entity.ProviderProfile;
import org.springframework.stereotype.Service;
import java.math.BigDecimal;

@Service
public class IncentiveService {

    public void awardPoints(ProviderProfile provider, int points) {
        int updated = Math.max(0, provider.getIncentivePoints() + points);
        provider.setIncentivePoints(updated);
        recalculateTierAndCommission(provider);
    }

    public void recalculateTierAndCommission(ProviderProfile provider) {
        int pts = provider.getIncentivePoints();
        if (pts >= 750) {
            provider.setIncentiveTier(Enums.IncentiveTier.PLATINUM);
            provider.setCommissionRatePct(new BigDecimal("5.00"));
        } else if (pts >= 500) {
            provider.setIncentiveTier(Enums.IncentiveTier.GOLD);
            provider.setCommissionRatePct(new BigDecimal("8.00"));
        } else if (pts >= 250) {
            provider.setIncentiveTier(Enums.IncentiveTier.SILVER);
            provider.setCommissionRatePct(new BigDecimal("11.00"));
        } else {
            provider.setIncentiveTier(Enums.IncentiveTier.BRONZE);
            provider.setCommissionRatePct(new BigDecimal("15.00"));
        }
    }
}
