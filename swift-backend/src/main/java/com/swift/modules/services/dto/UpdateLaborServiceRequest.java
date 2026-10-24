package com.swift.modules.services.dto;

import jakarta.validation.constraints.DecimalMin;

import java.math.BigDecimal;

public record UpdateLaborServiceRequest(
    String name,
    String bay,
    @DecimalMin(value = "0.01", message = "Flat labor rate must be greater than ₱0.00.")
    BigDecimal rate,
    String duration,
    String description,
    Boolean active,
    String reason,
    String userName
) {}
