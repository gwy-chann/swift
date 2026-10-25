package com.swift.modules.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.math.BigDecimal;

/**
 * Single day revenue breakdown in rolling 7-day trend.
 */
public record RevenueTrendDayDto(
    @JsonProperty("date") String date,
    @JsonProperty("dayLabel") String dayLabel,
    @JsonProperty("partsAmount") BigDecimal partsAmount,
    @JsonProperty("partsDisplay") String partsDisplay,
    @JsonProperty("laborAmount") BigDecimal laborAmount,
    @JsonProperty("laborDisplay") String laborDisplay,
    @JsonProperty("totalAmount") BigDecimal totalAmount,
    @JsonProperty("partsHeightPercent") Double partsHeightPercent,
    @JsonProperty("laborHeightPercent") Double laborHeightPercent
) {}
