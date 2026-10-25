# Implementation Tasks: Employee Shift Attendance & Digital Punch Clock Lifecycle

**Feature**: `specs/095-employee-shift-attendance-punch-clock-lifecycle`  
**Jira Issue**: [SIAA-95](https://the-three-devsketeers.atlassian.net/browse/SIAA-95)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Implementation  

---

## Task Breakdown & Dependencies

### Phase 1: Domain Entities, Repositories & DTOs
- [ ] **Task 1.1**: Create JPA entities `StaffShift` and `StaffShiftAuditLog` in `com.swift.modules.shift.model`.
- [ ] **Task 1.2**: Create Spring Data JPA repositories `StaffShiftRepository` and `StaffShiftAuditLogRepository` in `com.swift.modules.shift.repository`.
- [ ] **Task 1.3**: Create DTO records under `com.swift.modules.shift.dto`:
  - `ClockInRequest`
  - `ClockOutRequest`
  - `ToggleBreakRequest`
  - `ShiftResponse`
  - `ActiveShiftResponse`
  - `AttendanceHistoryResponse`
- [ ] **Task 1.4**: Create domain exceptions in `com.swift.modules.shift.exception`:
  - `ActiveShiftConflictException` (409 Conflict: `ACTIVE_SHIFT_EXISTS`)
  - `ShiftNotFoundException` (404 Not Found: `SHIFT_NOT_FOUND`)
  - `ShiftNotActiveException` (400 Bad Request: `SHIFT_NOT_ACTIVE`)

### Phase 2: Core Shift Attendance Service & Stored Procedure Wrapper
- [ ] **Task 2.1**: Implement `ShiftStoredProcedureWrapper` to call `public.clock_in_shift`, `clock_out_shift`, and `toggle_shift_break` via `JdbcTemplate` / `SimpleJdbcCall`, with fallback support for H2 test profiles.
- [ ] **Task 2.2**: Implement `ShiftAttendanceService` interface and `ShiftAttendanceServiceImpl` handling:
  - `clockIn(ClockInRequest)`: validates active shift absence, executes clock in, writes audit log, returns shift.
  - `clockOut(ClockOutRequest)`: acquires shift, calculates duration, stamps UTC `clock_out`, marks `completed`, writes audit log.
  - `toggleBreak(ToggleBreakRequest)`: toggles `on_shift` <-> `break`, writes audit log.
  - `getActiveShift(UUID staffId)`: queries active shift, dynamically calculates running duration from UTC `now() - clock_in`.
  - `getAttendanceHistory(UUID staffId, LocalDate startDate, LocalDate endDate, Pageable pageable)`: queries history, calculates total hours worked.

### Phase 3: REST Controller
- [ ] **Task 3.1**: Implement `ShiftAttendanceController` in `com.swift.modules.shift.controller`:
  - `POST /api/v1/shifts/clock-in`
  - `POST /api/v1/shifts/clock-out`
  - `POST /api/v1/shifts/toggle-break`
  - `GET /api/v1/shifts/active/{staffId}`
  - `GET /api/v1/staff/attendance-history`

### Phase 4: Gateway Reverse Proxy & Security Configuration
- [ ] **Task 4.1**: Configure `SecurityConfig.java` to allow authenticated and floor kiosk terminal access to `/api/v1/shifts/**` and `/api/v1/staff/attendance-history`.
- [ ] **Task 4.2**: Update NGINX Strangler reverse proxy configuration (`gateway/nginx-strangler-gateway.conf`) to route `/api/v1/shifts/` and `/api/v1/staff/attendance-history` to Spring Boot with `@fallback_to_nextjs`.

### Phase 5: Verification & Integration Testing
- [ ] **Task 5.1**: Build `ShiftAttendanceControllerTests.java` covering Scenarios 1 to 7:
  - Scenario 1: Clock in via stored procedure returning 200 with shift ID and timestamp.
  - Scenario 2: Duplicate clock in returns 409 Conflict with `ACTIVE_SHIFT_EXISTS`.
  - Scenario 3: Shift rehydration surviving refresh returning dynamically calculated duration.
  - Scenario 4: Toggle meal break transitions `on_shift` to `break` and back.
  - Scenario 5: Clock out calculates authoritative duration and sets `completed` status.
  - Scenario 6: Clock out on finalized shift returns 400 `SHIFT_NOT_ACTIVE`; non-existent returns 404 `SHIFT_NOT_FOUND`.
  - Scenario 7: Attendance history pagination and date-range filtering.
