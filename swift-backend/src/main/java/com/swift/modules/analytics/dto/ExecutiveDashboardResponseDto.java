package com.swift.modules.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

/**
 * Aggregated executive dashboard telemetry container.
 * Dispatched concurrently via Java 21 StructuredTaskScope on virtual threads.
 */
public record ExecutiveDashboardResponseDto(
    @JsonProperty("kpis") ExecutiveKpiDto kpis,
    @JsonProperty("revenueTrend") WeeklyRevenueDto revenueTrend,
    @JsonProperty("categoryPnl") CategoryPnlDto categoryPnl,
    @JsonProperty("serviceBays") List<ServiceBayDisplayDto> serviceBays
) {}
