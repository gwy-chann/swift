package com.swift.modules.inventory.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.swift.modules.inventory.model.StockAdjustmentLog;

import java.time.OffsetDateTime;
import java.util.UUID;

public record StockAuditLogDto(
    UUID id,
    String sku,
    @JsonProperty("adjustmentType") String adjustmentType,
    @JsonProperty("quantityDelta") Integer quantityDelta,
    @JsonProperty("previousStock") Integer previousStock,
    @JsonProperty("newStock") Integer newStock,
    String reason,
    @JsonProperty("userId") UUID userId,
    @JsonProperty("userName") String userName,
    @JsonProperty("createdAt") OffsetDateTime createdAt
) {
    public static StockAuditLogDto fromEntity(StockAdjustmentLog entity) {
        return new StockAuditLogDto(
            entity.getId(),
            entity.getSku(),
            entity.getAdjustmentType(),
            entity.getQuantityDelta(),
            entity.getPreviousStock(),
            entity.getNewStock(),
            entity.getReason(),
            entity.getUserId(),
            entity.getUserName(),
            entity.getCreatedAt()
        );
    }
}
