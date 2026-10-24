package com.swift.modules.pricing.service.impl;

import com.swift.modules.pricing.dto.PricingRulesDto;
import com.swift.modules.pricing.dto.UpdatePricingRulesRequest;
import com.swift.modules.pricing.model.PricingRules;
import com.swift.modules.pricing.model.PricingRulesAuditLog;
import com.swift.modules.pricing.repository.PricingRulesAuditLogRepository;
import com.swift.modules.pricing.repository.PricingRulesRepository;
import com.swift.modules.pricing.service.PricingRulesService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Service
public class PricingRulesServiceImpl implements PricingRulesService {

    private final PricingRulesRepository pricingRulesRepository;
    private final PricingRulesAuditLogRepository auditLogRepository;

    public PricingRulesServiceImpl(
            PricingRulesRepository pricingRulesRepository,
            PricingRulesAuditLogRepository auditLogRepository
    ) {
        this.pricingRulesRepository = pricingRulesRepository;
        this.auditLogRepository = auditLogRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PricingRulesDto getActivePricingRules() {
        PricingRules rules = pricingRulesRepository.findActiveRules()
                .orElseGet(() -> pricingRulesRepository.save(new PricingRules()));
        return PricingRulesDto.fromEntity(rules);
    }

    @Override
    @Transactional
    public PricingRulesDto updatePricingRules(UpdatePricingRulesRequest request) {
        PricingRules rules = pricingRulesRepository.findActiveRules()
                .orElseGet(() -> new PricingRules());

        BigDecimal oldRetail = rules.getRetailMarkup();
        BigDecimal oldWholesale = rules.getWholesaleMarkup();
        BigDecimal oldAftermarket = rules.getAftermarketMarkup();
        BigDecimal oldLabor = rules.getHourlyLaborRate();

        if (request.retailMarkup() != null) {
            rules.setRetailMarkup(request.retailMarkup());
        }
        if (request.wholesaleMarkup() != null) {
            rules.setWholesaleMarkup(request.wholesaleMarkup());
        }
        if (request.aftermarketMarkup() != null) {
            rules.setAftermarketMarkup(request.aftermarketMarkup());
        }
        if (request.hourlyLaborRate() != null) {
            rules.setHourlyLaborRate(request.hourlyLaborRate());
        }

        rules.setUpdatedAt(OffsetDateTime.now());
        PricingRules savedRules = pricingRulesRepository.save(rules);

        String userName = request.userName() != null && !request.userName().isBlank()
                ? request.userName()
                : "Admin";
        String reason = request.reason() != null && !request.reason().isBlank()
                ? request.reason()
                : "Admin global pricing update";

        PricingRulesAuditLog auditLog = new PricingRulesAuditLog(
                null,
                null,
                userName,
                oldRetail,
                savedRules.getRetailMarkup(),
                oldWholesale,
                savedRules.getWholesaleMarkup(),
                oldAftermarket,
                savedRules.getAftermarketMarkup(),
                oldLabor,
                savedRules.getHourlyLaborRate(),
                reason,
                OffsetDateTime.now()
        );
        auditLogRepository.save(auditLog);

        return PricingRulesDto.fromEntity(savedRules);
    }
}
