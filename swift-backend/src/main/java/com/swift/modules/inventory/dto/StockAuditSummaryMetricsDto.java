package com.swift.modules.inventory.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public record StockAuditSummaryMetricsDto(
    @JsonProperty("totalCount") int totalCount,
    @JsonProperty("netDelta") int netDelta,
    @JsonProperty("totalShrinkage") int totalShrinkage,
    @JsonProperty("totalIntake") int totalIntake
) {}
