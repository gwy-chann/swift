package com.swift.modules.motomatcher.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.UUID;

public record MotorcycleModelDto(
    UUID id,
    String make,
    String model,
    @JsonProperty("displacement_cc") Integer displacementCc,
    @JsonProperty("year_start") Integer yearStart,
    @JsonProperty("year_end") Integer yearEnd,
    String category,
    @JsonProperty("image_url") String imageUrl,
    @JsonProperty("created_at") String createdAt,
    @JsonProperty("updated_at") String updatedAt
) {}
