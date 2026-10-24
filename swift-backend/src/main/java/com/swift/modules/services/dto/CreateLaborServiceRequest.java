package com.swift.modules.services.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.math.BigDecimal;

public record CreateLaborServiceRequest(
    @NotBlank(message = "Service code is required.")
    @Pattern(regexp = "^[A-Za-z0-9_-]+$", message = "Service code must contain only alphanumeric characters, dashes, or underscores.")
    String code,

    @NotBlank(message = "Service title is required.")
    String name,

    @NotBlank(message = "Repair bay allocation is required.")
    String bay,

    @NotNull(message = "Flat labor rate is required.")
    @DecimalMin(value = "0.01", message = "Flat labor rate must be greater than ₱0.00.")
    BigDecimal rate,

    @NotBlank(message = "Estimated duration is required.")
    String duration,

    String description,

    Boolean active
) {}
