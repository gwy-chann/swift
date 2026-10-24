package com.swift.modules.inventory.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record StockAdjustmentResponse(
    boolean success,
    String sku,
    @JsonProperty("previousStock") Integer previousStock,
    @JsonProperty("newStock") Integer newStock,
    @JsonProperty("quantityDelta") Integer quantityDelta,
    @JsonProperty("adjustmentType") String adjustmentType,
    @JsonProperty("logId") String logId,
    @JsonProperty("userName") String userName,
    String error,
    String code
) {
    public static StockAdjustmentResponse success(String sku, int previousStock, int newStock,
                                                  int delta, String type, String logId, String userName) {
        return new StockAdjustmentResponse(true, sku, previousStock, newStock, delta, type, logId, userName, null, null);
    }

    public static StockAdjustmentResponse failure(String sku, String error, String code) {
        return new StockAdjustmentResponse(false, sku, null, null, null, null, null, null, error, code);
    }
}
