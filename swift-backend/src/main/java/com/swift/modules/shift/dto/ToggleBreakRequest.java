package com.swift.modules.shift.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ToggleBreakRequest(
    @NotNull(message = "Shift ID is required")
    UUID shiftId,
    UUID staffId
) {}
