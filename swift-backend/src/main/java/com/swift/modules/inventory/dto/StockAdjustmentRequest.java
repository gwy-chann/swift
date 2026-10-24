package com.swift.modules.inventory.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record StockAdjustmentRequest(
    @NotBlank(message = "SKU is required")
    String sku,

    @NotNull(message = "Quantity delta is required")
    @JsonProperty("quantityDelta")
    Integer quantityDelta,

    @JsonProperty("adjustmentType")
    String adjustmentType,

    String reason,

    @JsonProperty("userName")
    String userName
) {}
