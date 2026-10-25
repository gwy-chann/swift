package com.swift.modules.pricing.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.swift.modules.pricing.model.PricingRules;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record PricingRulesDto(
    Integer id,
    @JsonProperty("retailMarkup") BigDecimal retailMarkup,
    @JsonProperty("wholesaleMarkup") BigDecimal wholesaleMarkup,
    @JsonProperty("aftermarketMarkup") BigDecimal aftermarketMarkup,
    @JsonProperty("hourlyLaborRate") BigDecimal hourlyLaborRate,
    @JsonProperty("updatedAt") OffsetDateTime updatedAt,
    @JsonProperty("updatedBy") UUID updatedBy
) {
    public static PricingRulesDto fromEntity(PricingRules entity) {
        return new PricingRulesDto(
            entity.getId(),
            entity.getRetailMarkup(),
            entity.getWholesaleMarkup(),
            entity.getAftermarketMarkup(),
            entity.getHourlyLaborRate(),
            entity.getUpdatedAt(),
            entity.getUpdatedBy()
        );
    }
}
