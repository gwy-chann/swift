package com.swift.modules.shift.dto;

public record ActiveShiftResponse(
    boolean hasActiveShift,
    ShiftResponse shift,
    Long activeDurationSeconds,
    String activeDurationFormatted
) {}
