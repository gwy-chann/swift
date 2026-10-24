package com.swift.modules.catalog.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.swift.modules.catalog.model.Product;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ProductResponse(
    UUID id,
    String sku,
    String name,
    String category,
    String brand,
    String model,
    BigDecimal cost,
    BigDecimal wholesale,
    BigDecimal retail,
    Integer stock,
    @JsonProperty("min_threshold")
    Integer minThreshold,
    @JsonProperty("rack_id")
    String rackId,
    @JsonProperty("shelf_id")
    String shelfId,
    @JsonProperty("bin_locator")
    String binLocator,
    String location,
    Boolean oem,
    @JsonProperty("image_url")
    String imageUrl,
    String description,
    @JsonProperty("created_at")
    OffsetDateTime createdAt,
    @JsonProperty("updated_at")
    OffsetDateTime updatedAt
) {
    public static ProductResponse fromEntity(Product p) {
        if (p == null) return null;
        return new ProductResponse(
            p.getId(),
            p.getSku(),
            p.getName(),
            p.getCategory(),
            p.getBrand(),
            p.getModel(),
            p.getCost(),
            p.getWholesale(),
            p.getRetail(),
            p.getStock(),
            p.getMinThreshold(),
            p.getRackId(),
            p.getShelfId(),
            p.getBinLocator(),
            p.getLocation(),
            p.getOem(),
            p.getImageUrl(),
            p.getDescription(),
            p.getCreatedAt(),
            p.getUpdatedAt()
        );
    }
}
