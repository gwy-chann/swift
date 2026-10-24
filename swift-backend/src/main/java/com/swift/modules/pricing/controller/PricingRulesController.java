package com.swift.modules.pricing.controller;

import com.swift.modules.pricing.dto.PricingRulesDto;
import com.swift.modules.pricing.dto.UpdatePricingRulesRequest;
import com.swift.modules.pricing.service.PricingRulesService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/pricing/rules")
public class PricingRulesController {

    private final PricingRulesService pricingRulesService;

    public PricingRulesController(PricingRulesService pricingRulesService) {
        this.pricingRulesService = pricingRulesService;
    }

    @GetMapping
    public ResponseEntity<PricingRulesDto> getPricingRules() {
        PricingRulesDto rules = pricingRulesService.getActivePricingRules();
        return ResponseEntity.ok(rules);
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'STAFF') or isAuthenticated()")
    public ResponseEntity<PricingRulesDto> updatePricingRules(@Valid @RequestBody UpdatePricingRulesRequest request) {
        PricingRulesDto updated = pricingRulesService.updatePricingRules(request);
        return ResponseEntity.ok(updated);
    }
}
