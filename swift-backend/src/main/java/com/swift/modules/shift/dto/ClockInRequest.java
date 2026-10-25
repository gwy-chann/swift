package com.swift.modules.shift.dto;

import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record ClockInRequest(
    @NotNull(message = "Staff profile ID is required")
    UUID staffId,
    String terminalId,
    String notes
) {}
