package com.swift.modules.analytics.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;

public record UpdateWorkOrderStatusRequest(
    @NotBlank(message = "status is required")
    @JsonProperty("status") String status,

    @JsonProperty("notes") String notes
) {}
