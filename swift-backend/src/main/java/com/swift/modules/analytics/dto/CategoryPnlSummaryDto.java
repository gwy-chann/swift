package com.swift.modules.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

/**
 * Summary totals for categorized P&L COGS report.
 */
public record CategoryPnlSummaryDto(
    @JsonProperty("totalUnitsSold") Integer totalUnitsSold,
    @JsonProperty("totalGrossRevenue") BigDecimal totalGrossRevenue,
    @JsonProperty("totalCogs") BigDecimal totalCogs,
    @JsonProperty("totalNetProfit") BigDecimal totalNetProfit,
    @JsonProperty("overallMarginPct") Double overallMarginPct
) {
    public static CategoryPnlSummaryDto empty() {
        return new CategoryPnlSummaryDto(
            0,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            0.0
        );
    }
}
