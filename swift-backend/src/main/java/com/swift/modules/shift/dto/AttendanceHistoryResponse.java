package com.swift.modules.shift.dto;

import java.util.List;

public record AttendanceHistoryResponse(
    List<ShiftResponse> shifts,
    ShiftResponse activeShift,
    long totalMinutesWorked,
    int page,
    int size,
    long totalElements,
    int totalPages
) {}
