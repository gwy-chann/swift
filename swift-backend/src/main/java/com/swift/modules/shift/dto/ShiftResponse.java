package com.swift.modules.shift.dto;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ShiftResponse(
    UUID id,
    UUID staffId,
    String staffName,
    String terminalId,
    OffsetDateTime clockIn,
    OffsetDateTime clockOut,
    Integer durationSeconds,
    String durationFormatted,
    String status,
    String notes,
    OffsetDateTime createdAt
) {}
