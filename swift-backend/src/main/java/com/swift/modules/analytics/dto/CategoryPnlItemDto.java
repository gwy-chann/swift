package com.swift.modules.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

/**
 * Single category row for P&L COGS breakdown.
 */
public record CategoryPnlItemDto(
    @JsonProperty("category") String category,
    @JsonProperty("unitsSold") Integer unitsSold,
    @JsonProperty("grossRevenue") BigDecimal grossRevenue,
    @JsonProperty("cogs") BigDecimal cogs,
    @JsonProperty("netProfit") BigDecimal netProfit,
    @JsonProperty("marginPct") Double marginPct
) {}
