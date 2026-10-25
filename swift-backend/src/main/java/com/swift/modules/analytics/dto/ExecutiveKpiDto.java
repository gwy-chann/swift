package com.swift.modules.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

/**
 * Executive KPI performance aggregates matching public.get_executive_kpis.
 */
public record ExecutiveKpiDto(
    @JsonProperty("grossRevenueToday") BigDecimal grossRevenueToday,
    @JsonProperty("grossRevenueYesterday") BigDecimal grossRevenueYesterday,
    @JsonProperty("revenueGrowthPct") BigDecimal revenueGrowthPct,
    @JsonProperty("activeWorkOrdersCount") Integer activeWorkOrdersCount,
    @JsonProperty("pendingPartsCount") Integer pendingPartsCount,
    @JsonProperty("netProfitMarginPct") BigDecimal netProfitMarginPct,
    @JsonProperty("grossProfitAmount") BigDecimal grossProfitAmount,
    @JsonProperty("criticalLowStockCount") Integer criticalLowStockCount
) {
    public static ExecutiveKpiDto empty() {
        return new ExecutiveKpiDto(
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            0,
            0,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            0
        );
    }
}
