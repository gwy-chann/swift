package com.swift.modules.motomatcher.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonProperty;

@JsonIgnoreProperties(ignoreUnknown = true)
public record MotoMatcherMatrixPartDto(
    String id,
    String sku,
    String name,
    String brand,
    String category,
    @JsonProperty("retail_price") Double retailPrice,
    @JsonProperty("stock_level") Integer stockLevel,
    @JsonProperty("min_threshold") Integer minThreshold,
    @JsonProperty("shelf_location") String shelfLocation,
    @JsonProperty("fitment_type") String fitmentType,
    @JsonProperty("fitment_notes") String fitmentNotes,
    @JsonProperty("year_range") String yearRange,
    @JsonProperty("is_universal") Boolean isUniversal,
    @JsonProperty("upsell_delta_amount") Double upsellDeltaAmount,
    @JsonProperty("upsell_delta_percent") Double upsellDeltaPercent,
    @JsonProperty("upsell_badge") String upsellBadge,
    @JsonProperty("oem_reference_sku") String oemReferenceSku
) {}
