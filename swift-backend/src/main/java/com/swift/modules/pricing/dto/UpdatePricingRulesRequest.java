package com.swift.modules.pricing.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record UpdatePricingRulesRequest(
    @DecimalMin(value = "0.01", message = "Retail markup must be greater than 0%")
    @DecimalMax(value = "200.00", message = "Retail markup cannot exceed 200%")
    @JsonProperty("retailMarkup")
    BigDecimal retailMarkup,

    @DecimalMin(value = "0.01", message = "Wholesale markup must be greater than 0%")
    @DecimalMax(value = "200.00", message = "Wholesale markup cannot exceed 200%")
    @JsonProperty("wholesaleMarkup")
    BigDecimal wholesaleMarkup,

    @DecimalMin(value = "0.01", message = "Aftermarket markup must be greater than 0%")
    @DecimalMax(value = "200.00", message = "Aftermarket markup cannot exceed 200%")
    @JsonProperty("aftermarketMarkup")
    BigDecimal aftermarketMarkup,

    @DecimalMin(value = "0.00", message = "Hourly labor rate cannot be negative")
    @JsonProperty("hourlyLaborRate")
    BigDecimal hourlyLaborRate,

    @JsonProperty("userName")
    String userName,

    String reason
) {}
