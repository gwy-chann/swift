package com.swift.modules.shift;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.swift.modules.auth.model.StaffProfile;
import com.swift.modules.auth.repository.StaffProfileRepository;
import com.swift.modules.shift.dto.ClockInRequest;
import com.swift.modules.shift.dto.ClockOutRequest;
import com.swift.modules.shift.dto.ToggleBreakRequest;
import com.swift.modules.shift.model.StaffShift;
import com.swift.modules.shift.repository.StaffShiftAuditLogRepository;
import com.swift.modules.shift.repository.StaffShiftRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

import static org.hamcrest.Matchers.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ShiftAttendanceControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private StaffShiftRepository shiftRepository;

    @Autowired
    private StaffShiftAuditLogRepository auditLogRepository;

    @Autowired
    private StaffProfileRepository profileRepository;

    private UUID testStaffId;

    @BeforeEach
    void setUp() {
        auditLogRepository.deleteAll();
        shiftRepository.deleteAll();
        profileRepository.deleteAll();

        testStaffId = UUID.randomUUID();
        StaffProfile profile = new StaffProfile();
        profile.setId(testStaffId);
        profile.setEmail("mike.morales@swift.ph");
        profile.setFullName("Mike Morales");
        profile.setRole("cashier");
        profile.setStatus("Active");
        profileRepository.save(profile);
    }

    @Test
    @DisplayName("Scenario 1: Clock in for work shift returns 200 with shift ID and status on_shift")
    void testClockInSuccess() throws Exception {
        ClockInRequest request = new ClockInRequest(testStaffId, "Terminal #01", "Opening floor shift");

        mockMvc.perform(post("/api/v1/shifts/clock-in")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").isNotEmpty())
            .andExpect(jsonPath("$.staffId").value(testStaffId.toString()))
            .andExpect(jsonPath("$.staffName").value("Mike Morales"))
            .andExpect(jsonPath("$.terminalId").value("Terminal #01"))
            .andExpect(jsonPath("$.status").value("on_shift"))
            .andExpect(jsonPath("$.clockIn").isNotEmpty())
            .andExpect(jsonPath("$.clockOut").doesNotExist());

        assertEquals(1, shiftRepository.count());
        assertEquals(1, auditLogRepository.count());
        assertEquals("clock_in", auditLogRepository.findAll().get(0).getAction());
    }

    @Test
    @DisplayName("Scenario 2: Duplicate clock in returns 409 Conflict with ACTIVE_SHIFT_EXISTS")
    void testDuplicateClockInConflict() throws Exception {
        // First clock in
        ClockInRequest request1 = new ClockInRequest(testStaffId, "Terminal #01", "First punch");
        mockMvc.perform(post("/api/v1/shifts/clock-in")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1)))
            .andExpect(status().isOk());

        // Attempt second clock in while active
        ClockInRequest request2 = new ClockInRequest(testStaffId, "Terminal #02", "Second punch");
        mockMvc.perform(post("/api/v1/shifts/clock-in")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request2)))
            .andExpect(status().isConflict())
            .andExpect(jsonPath("$.status").value(409))
            .andExpect(jsonPath("$.error").value("ACTIVE_SHIFT_EXISTS"))
            .andExpect(jsonPath("$.message", containsString("Active shift already in progress")));
    }

    @Test
    @DisplayName("Scenario 3: Shift rehydration surviving browser reload returns dynamically computed duration")
    void testShiftRehydrationSurvivingReload() throws Exception {
        OffsetDateTime clockInTime = OffsetDateTime.now(ZoneOffset.UTC).minusMinutes(45);
        StaffShift activeShift = new StaffShift(testStaffId, "Mike Morales", "Terminal #01", "Morning Shift");
        activeShift.setClockIn(clockInTime);
        shiftRepository.save(activeShift);

        mockMvc.perform(get("/api/v1/shifts/active/" + testStaffId))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.hasActiveShift").value(true))
            .andExpect(jsonPath("$.shift.id").value(activeShift.getId().toString()))
            .andExpect(jsonPath("$.shift.status").value("on_shift"))
            .andExpect(jsonPath("$.activeDurationSeconds", greaterThanOrEqualTo(2690)))
            .andExpect(jsonPath("$.activeDurationFormatted", notNullValue()));
    }

    @Test
    @DisplayName("Scenario 4: Toggle meal break transitions between on_shift and break")
    void testToggleMealBreak() throws Exception {
        StaffShift shift = new StaffShift(testStaffId, "Mike Morales", "Terminal #01", "Break test");
        shift = shiftRepository.save(shift);

        // Toggle to break
        ToggleBreakRequest toggle1 = new ToggleBreakRequest(shift.getId(), testStaffId);
        mockMvc.perform(post("/api/v1/shifts/toggle-break")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(toggle1)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(shift.getId().toString()))
            .andExpect(jsonPath("$.status").value("break"));

        StaffShift onBreak = shiftRepository.findById(shift.getId()).orElseThrow();
        assertEquals("break", onBreak.getStatus());

        // Toggle back to on_shift
        mockMvc.perform(post("/api/v1/shifts/toggle-break")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(toggle1)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(shift.getId().toString()))
            .andExpect(jsonPath("$.status").value("on_shift"));

        StaffShift backOnShift = shiftRepository.findById(shift.getId()).orElseThrow();
        assertEquals("on_shift", backOnShift.getStatus());
        assertEquals(2, auditLogRepository.count());
    }

    @Test
    @DisplayName("Scenario 5: Clock out calculates authoritative duration and sets status completed")
    void testClockOutSuccess() throws Exception {
        OffsetDateTime clockInTime = OffsetDateTime.now(ZoneOffset.UTC).minusHours(8).minusMinutes(15);
        StaffShift shift = new StaffShift(testStaffId, "Mike Morales", "Terminal #01", "Full day shift");
        shift.setClockIn(clockInTime);
        shift = shiftRepository.save(shift);

        ClockOutRequest request = new ClockOutRequest(shift.getId(), testStaffId, "Closing store");
        mockMvc.perform(post("/api/v1/shifts/clock-out")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request)))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.id").value(shift.getId().toString()))
            .andExpect(jsonPath("$.status").value("completed"))
            .andExpect(jsonPath("$.clockOut").isNotEmpty())
            .andExpect(jsonPath("$.durationSeconds", greaterThanOrEqualTo(29600)))
            .andExpect(jsonPath("$.durationFormatted", containsString("08h 15m")));

        StaffShift completed = shiftRepository.findById(shift.getId()).orElseThrow();
        assertEquals("completed", completed.getStatus());
        assertTrue(completed.getDurationSeconds() >= 29600);
    }

    @Test
    @DisplayName("Scenario 6: Clock out on finalized shift returns 400 SHIFT_NOT_ACTIVE; non-existent returns 404")
    void testClockOutRejections() throws Exception {
        StaffShift shift = new StaffShift(testStaffId, "Mike Morales", "Terminal #01", "Done shift");
        shift.setStatus("completed");
        shift = shiftRepository.save(shift);

        // Attempt clock out on completed shift
        ClockOutRequest request1 = new ClockOutRequest(shift.getId(), testStaffId, "Repeat clockout");
        mockMvc.perform(post("/api/v1/shifts/clock-out")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request1)))
            .andExpect(status().isBadRequest())
            .andExpect(jsonPath("$.error").value("SHIFT_NOT_ACTIVE"));

        // Attempt clock out on non-existent shift
        UUID randomId = UUID.randomUUID();
        ClockOutRequest request2 = new ClockOutRequest(randomId, testStaffId, "Non existent");
        mockMvc.perform(post("/api/v1/shifts/clock-out")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(request2)))
            .andExpect(status().isNotFound())
            .andExpect(jsonPath("$.error").value("SHIFT_NOT_FOUND"));
    }

    @Test
    @DisplayName("Scenario 7: Attendance history returns paginated shifts and computed hours worked")
    void testAttendanceHistoryPagination() throws Exception {
        StaffShift shift1 = new StaffShift(testStaffId, "Mike Morales", "Terminal #01", "Shift 1");
        shift1.setStatus("completed");
        shift1.setDurationSeconds(14400); // 4 hours
        shiftRepository.save(shift1);

        StaffShift shift2 = new StaffShift(testStaffId, "Mike Morales", "Terminal #01", "Shift 2");
        shift2.setStatus("completed");
        shift2.setDurationSeconds(18000); // 5 hours
        shiftRepository.save(shift2);

        mockMvc.perform(get("/api/v1/staff/attendance-history?staffId=" + testStaffId + "&page=0&size=10"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.shifts", hasSize(2)))
            .andExpect(jsonPath("$.totalMinutesWorked").value(540)) // 9 hours = 540 minutes
            .andExpect(jsonPath("$.totalElements").value(2))
            .andExpect(jsonPath("$.page").value(0))
            .andExpect(jsonPath("$.size").value(10));
    }
}
