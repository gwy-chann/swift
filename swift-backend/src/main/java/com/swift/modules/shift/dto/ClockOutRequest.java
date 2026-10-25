package com.swift.modules.shift.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ClockOutRequest(
    @NotNull(message = "Shift ID is required")
    UUID shiftId,
    UUID staffId,
    String notes
) {}
