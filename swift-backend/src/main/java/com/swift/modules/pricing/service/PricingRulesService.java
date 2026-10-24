package com.swift.modules.pricing.service;

import com.swift.modules.pricing.dto.PricingRulesDto;
import com.swift.modules.pricing.dto.UpdatePricingRulesRequest;

public interface PricingRulesService {
    PricingRulesDto getActivePricingRules();
    PricingRulesDto updatePricingRules(UpdatePricingRulesRequest request);
}
