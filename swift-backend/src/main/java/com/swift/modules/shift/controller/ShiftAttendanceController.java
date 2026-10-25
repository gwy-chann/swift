package com.swift.modules.shift.controller;

import com.swift.modules.shift.dto.*;
import com.swift.modules.shift.service.ShiftAttendanceService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.UUID;

@RestController
@Tag(name = "Shift Attendance & Digital Punch Clock", description = "Endpoints for employee punch clock lifecycle, break toggling, rehydration, and timesheets")
public class ShiftAttendanceController {

    private final ShiftAttendanceService shiftAttendanceService;

    public ShiftAttendanceController(ShiftAttendanceService shiftAttendanceService) {
        this.shiftAttendanceService = shiftAttendanceService;
    }

    @PostMapping("/api/v1/shifts/clock-in")
    @Operation(summary = "Atomically clock in for a work shift at the floor terminal")
    public ResponseEntity<ShiftResponse> clockIn(@Valid @RequestBody ClockInRequest request) {
        ShiftResponse response = shiftAttendanceService.clockIn(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/v1/shifts/clock-out")
    @Operation(summary = "Clock out and finalize an active shift with calculated duration")
    public ResponseEntity<ShiftResponse> clockOut(@Valid @RequestBody ClockOutRequest request) {
        ShiftResponse response = shiftAttendanceService.clockOut(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/api/v1/shifts/toggle-break")
    @Operation(summary = "Toggle meal / rest break interval between on_shift and break")
    public ResponseEntity<ShiftResponse> toggleBreak(@Valid @RequestBody ToggleBreakRequest request) {
        ShiftResponse response = shiftAttendanceService.toggleBreak(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/shifts/active/{staffId}")
    @Operation(summary = "Rehydrate active shift and dynamically calculated duration surviving browser reloads")
    public ResponseEntity<ActiveShiftResponse> getActiveShift(@PathVariable UUID staffId) {
        ActiveShiftResponse response = shiftAttendanceService.getActiveShift(staffId);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/api/v1/staff/attendance-history")
    @Operation(summary = "Query paginated employee shift attendance timesheet history with date range filtering")
    public ResponseEntity<AttendanceHistoryResponse> getAttendanceHistory(
        @RequestParam(required = false) UUID staffId,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "20") int size
    ) {
        AttendanceHistoryResponse response = shiftAttendanceService.getAttendanceHistory(staffId, startDate, endDate, page, size);
        return ResponseEntity.ok(response);
    }
}
