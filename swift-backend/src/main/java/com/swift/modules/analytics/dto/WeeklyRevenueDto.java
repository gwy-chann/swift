package com.swift.modules.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

/**
 * 7-day rolling revenue trend collection.
 */
public record WeeklyRevenueDto(
    @JsonProperty("days") List<RevenueTrendDayDto> days,
    @JsonProperty("peakDayAmount") BigDecimal peakDayAmount,
    @JsonProperty("totalPartsWeekly") BigDecimal totalPartsWeekly,
    @JsonProperty("totalLaborWeekly") BigDecimal totalLaborWeekly,
    @JsonProperty("totalWeeklyRevenue") BigDecimal totalWeeklyRevenue
) {
    public static WeeklyRevenueDto empty() {
        return new WeeklyRevenueDto(
            Collections.emptyList(),
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO,
            BigDecimal.ZERO
        );
    }
}
