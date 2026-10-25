package com.swift.modules.shift.service.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.swift.modules.auth.model.StaffProfile;
import com.swift.modules.auth.repository.StaffProfileRepository;
import com.swift.modules.shift.dto.*;
import com.swift.modules.shift.exception.ActiveShiftConflictException;
import com.swift.modules.shift.exception.ShiftNotActiveException;
import com.swift.modules.shift.exception.ShiftNotFoundException;
import com.swift.modules.shift.model.StaffShift;
import com.swift.modules.shift.model.StaffShiftAuditLog;
import com.swift.modules.shift.repository.StaffShiftAuditLogRepository;
import com.swift.modules.shift.repository.StaffShiftRepository;
import com.swift.modules.shift.service.ShiftAttendanceService;
import com.swift.modules.shift.service.ShiftStoredProcedureWrapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ShiftAttendanceServiceImpl implements ShiftAttendanceService {

    private static final Logger log = LoggerFactory.getLogger(ShiftAttendanceServiceImpl.class);

    private final StaffShiftRepository shiftRepository;
    private final StaffShiftAuditLogRepository auditLogRepository;
    private final StaffProfileRepository profileRepository;
    private final ShiftStoredProcedureWrapper spWrapper;

    public ShiftAttendanceServiceImpl(
        StaffShiftRepository shiftRepository,
        StaffShiftAuditLogRepository auditLogRepository,
        StaffProfileRepository profileRepository,
        ShiftStoredProcedureWrapper spWrapper
    ) {
        this.shiftRepository = shiftRepository;
        this.auditLogRepository = auditLogRepository;
        this.profileRepository = profileRepository;
        this.spWrapper = spWrapper;
    }

    @Override
    @Transactional
    public ShiftResponse clockIn(ClockInRequest request) {
        UUID staffId = request.staffId();
        String terminalId = (request.terminalId() != null && !request.terminalId().isBlank())
            ? request.terminalId().trim()
            : "Terminal #01";

        // Active shift exclusivity check
        if (shiftRepository.existsByProfileIdAndStatusIn(staffId, List.of("on_shift", "break"))) {
            throw new ActiveShiftConflictException("Active shift already in progress. Please clock out before starting a new shift.");
        }

        // Try calling the atomic stored procedure public.clock_in_shift
        Optional<JsonNode> spResult = spWrapper.callClockInShift(terminalId, request.notes(), staffId);
        if (spResult.isPresent()) {
            JsonNode root = spResult.get();
            if (root.has("shift") && root.get("shift").has("id")) {
                UUID shiftId = UUID.fromString(root.get("shift").get("id").asText());
                Optional<StaffShift> saved = shiftRepository.findById(shiftId);
                if (saved.isPresent()) {
                    return mapToResponse(saved.get());
                }
            }
        }

        // Fallback transactional execution (for tests and local runtime)
        String staffName = resolveStaffName(staffId);
        StaffShift shift = new StaffShift(staffId, staffName, terminalId, request.notes());
        StaffShift savedShift = shiftRepository.save(shift);

        StaffShiftAuditLog auditLog = new StaffShiftAuditLog(
            savedShift.getId(),
            staffId,
            terminalId,
            "clock_in",
            request.notes()
        );
        auditLogRepository.save(auditLog);

        log.info("Staff member {} clocked in at {} on terminal {}", staffId, savedShift.getClockIn(), terminalId);
        return mapToResponse(savedShift);
    }

    @Override
    @Transactional
    public ShiftResponse clockOut(ClockOutRequest request) {
        UUID shiftId = request.shiftId();
        StaffShift shift = shiftRepository.findById(shiftId)
            .orElseThrow(() -> new ShiftNotFoundException("Shift record with ID " + shiftId + " not found."));

        if ("completed".equalsIgnoreCase(shift.getStatus())) {
            throw new ShiftNotActiveException("Shift has already been clocked out and finalized.");
        }

        // Try calling the atomic stored procedure public.clock_out_shift
        Optional<JsonNode> spResult = spWrapper.callClockOutShift(shiftId, request.notes(), request.staffId());
        if (spResult.isPresent()) {
            Optional<StaffShift> refreshed = shiftRepository.findById(shiftId);
            if (refreshed.isPresent()) {
                return mapToResponse(refreshed.get());
            }
        }

        // Fallback transactional execution
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        long elapsedSeconds = Math.max(0, Duration.between(shift.getClockIn(), now).getSeconds());

        shift.setClockOut(now);
        shift.setDurationSeconds((int) elapsedSeconds);
        shift.setStatus("completed");
        if (request.notes() != null && !request.notes().isBlank()) {
            shift.setNotes(request.notes().trim());
        }
        shift.setUpdatedAt(now);
        StaffShift updated = shiftRepository.save(shift);

        StaffShiftAuditLog auditLog = new StaffShiftAuditLog(
            updated.getId(),
            updated.getProfileId(),
            updated.getTerminalId(),
            "clock_out",
            request.notes()
        );
        auditLogRepository.save(auditLog);

        log.info("Shift {} clocked out with duration {}s", shiftId, elapsedSeconds);
        return mapToResponse(updated);
    }

    @Override
    @Transactional
    public ShiftResponse toggleBreak(ToggleBreakRequest request) {
        UUID shiftId = request.shiftId();
        StaffShift shift = shiftRepository.findById(shiftId)
            .orElseThrow(() -> new ShiftNotFoundException("Shift record with ID " + shiftId + " not found."));

        if ("completed".equalsIgnoreCase(shift.getStatus())) {
            throw new ShiftNotActiveException("Shift is already completed and cannot toggle break.");
        }

        // Try calling the atomic stored procedure public.toggle_shift_break
        Optional<JsonNode> spResult = spWrapper.callToggleShiftBreak(shiftId, request.staffId());
        if (spResult.isPresent()) {
            Optional<StaffShift> refreshed = shiftRepository.findById(shiftId);
            if (refreshed.isPresent()) {
                return mapToResponse(refreshed.get());
            }
        }

        // Fallback transactional execution
        String currentStatus = shift.getStatus();
        String newStatus;
        String auditAction;

        if ("on_shift".equalsIgnoreCase(currentStatus)) {
            newStatus = "break";
            auditAction = "break_start";
        } else {
            newStatus = "on_shift";
            auditAction = "break_end";
        }

        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        shift.setStatus(newStatus);
        shift.setUpdatedAt(now);
        StaffShift updated = shiftRepository.save(shift);

        StaffShiftAuditLog auditLog = new StaffShiftAuditLog(
            updated.getId(),
            updated.getProfileId(),
            updated.getTerminalId(),
            auditAction,
            null
        );
        auditLogRepository.save(auditLog);

        log.info("Shift {} toggled break state to {}", shiftId, newStatus);
        return mapToResponse(updated);
    }

    @Override
    @Transactional(readOnly = true)
    public ActiveShiftResponse getActiveShift(UUID staffId) {
        Optional<StaffShift> activeOpt = shiftRepository.findFirstByProfileIdAndStatusInOrderByClockInDesc(
            staffId,
            List.of("on_shift", "break")
        );

        if (activeOpt.isEmpty()) {
            return new ActiveShiftResponse(false, null, 0L, "00h 00m");
        }

        StaffShift shift = activeOpt.get();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        long elapsedSeconds = Math.max(0, Duration.between(shift.getClockIn(), now).getSeconds());
        String formattedDuration = formatDuration(elapsedSeconds);

        ShiftResponse shiftResponse = mapToResponse(shift, (int) elapsedSeconds, formattedDuration);
        return new ActiveShiftResponse(true, shiftResponse, elapsedSeconds, formattedDuration);
    }

    @Override
    @Transactional(readOnly = true)
    public AttendanceHistoryResponse getAttendanceHistory(
        UUID staffId,
        LocalDate startDate,
        LocalDate endDate,
        int page,
        int size
    ) {
        Pageable pageable = PageRequest.of(Math.max(0, page), Math.max(1, size));
        Page<StaffShift> shiftPage;

        if (startDate != null && endDate != null) {
            OffsetDateTime startDt = startDate.atStartOfDay().atOffset(ZoneOffset.UTC);
            OffsetDateTime endDt = endDate.atTime(LocalTime.MAX).atOffset(ZoneOffset.UTC);

            if (staffId != null) {
                shiftPage = shiftRepository.findByProfileIdAndClockInBetween(staffId, startDt, endDt, pageable);
            } else {
                shiftPage = shiftRepository.findByClockInBetween(startDt, endDt, pageable);
            }
        } else if (staffId != null) {
            shiftPage = shiftRepository.findByProfileIdOrderByClockInDesc(staffId, pageable);
        } else {
            shiftPage = shiftRepository.findAllByOrderByClockInDesc(pageable);
        }

        List<ShiftResponse> shiftResponses = shiftPage.getContent().stream()
            .map(this::mapToResponse)
            .toList();

        ShiftResponse activeShiftResponse = null;
        if (staffId != null) {
            Optional<StaffShift> activeOpt = shiftRepository.findFirstByProfileIdAndStatusInOrderByClockInDesc(
                staffId,
                List.of("on_shift", "break")
            );
            if (activeOpt.isPresent()) {
                activeShiftResponse = mapToResponse(activeOpt.get());
            }
        }

        long totalSeconds = shiftPage.getContent().stream()
            .filter(s -> s.getDurationSeconds() != null)
            .mapToLong(StaffShift::getDurationSeconds)
            .sum();
        long totalMinutes = totalSeconds / 60;

        return new AttendanceHistoryResponse(
            shiftResponses,
            activeShiftResponse,
            totalMinutes,
            shiftPage.getNumber(),
            shiftPage.getSize(),
            shiftPage.getTotalElements(),
            shiftPage.getTotalPages()
        );
    }

    private String resolveStaffName(UUID staffId) {
        return profileRepository.findById(staffId)
            .map(StaffProfile::getFullName)
            .filter(name -> name != null && !name.isBlank())
            .orElse("Staff Member");
    }

    private ShiftResponse mapToResponse(StaffShift shift) {
        int durationSec = shift.getDurationSeconds() != null ? shift.getDurationSeconds() : 0;
        String formatted = formatDuration(durationSec);
        return mapToResponse(shift, durationSec, formatted);
    }

    private ShiftResponse mapToResponse(StaffShift shift, int durationSec, String formatted) {
        return new ShiftResponse(
            shift.getId(),
            shift.getProfileId(),
            shift.getStaffName(),
            shift.getTerminalId(),
            shift.getClockIn(),
            shift.getClockOut(),
            durationSec,
            formatted,
            shift.getStatus(),
            shift.getNotes(),
            shift.getCreatedAt()
        );
    }

    private String formatDuration(long seconds) {
        long hours = seconds / 3600;
        long minutes = (seconds % 3600) / 60;
        return String.format("%02dh %02dm", hours, minutes);
    }
}
