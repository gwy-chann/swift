package com.swift.modules.shift.service;

import com.swift.modules.shift.dto.*;
import java.time.LocalDate;
import java.util.UUID;

public interface ShiftAttendanceService {

    ShiftResponse clockIn(ClockInRequest request);

    ShiftResponse clockOut(ClockOutRequest request);

    ShiftResponse toggleBreak(ToggleBreakRequest request);

    ActiveShiftResponse getActiveShift(UUID staffId);

    AttendanceHistoryResponse getAttendanceHistory(UUID staffId, LocalDate startDate, LocalDate endDate, int page, int size);
}
