package com.swift.modules.services.dto;

import jakarta.validation.constraints.NotNull;

public record UpdateLaborServiceStatusRequest(
    @NotNull(message = "Active status is required.")
    Boolean active
) {}
