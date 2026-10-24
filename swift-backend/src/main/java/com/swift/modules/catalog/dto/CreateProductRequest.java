package com.swift.modules.catalog.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.math.BigDecimal;

@JsonIgnoreProperties(ignoreUnknown = true)
public record CreateProductRequest(
    @NotBlank(message = "SKU is required.")
    String sku,

    @NotBlank(message = "Product name is required.")
    String name,

    @NotBlank(message = "Category is required.")
    String category,

    @NotBlank(message = "Brand is required.")
    String brand,

    String model,

    @NotNull(message = "Unit cost is required.")
    @Positive(message = "Unit cost must be greater than 0.")
    BigDecimal cost,

    BigDecimal wholesale,

    BigDecimal retail,

    @Min(value = 0, message = "Initial stock must be a non-negative number.")
    Integer stock,

    @Min(value = 1, message = "Low stock alert level must be at least 1.")
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

    String description
) {
    public CreateProductRequest {
        if (model == null || model.isBlank()) {
            model = "Universal";
        }
        if (stock == null) {
            stock = 0;
        }
        if (minThreshold == null) {
            minThreshold = 5;
        }
        if (oem == null) {
            oem = false;
        }
    }
}
