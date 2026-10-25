# Research & Architecture Decisions: Employee Shift Attendance & Digital Punch Clock Lifecycle

**Feature**: `specs/095-employee-shift-attendance-punch-clock-lifecycle`  
**Jira Issue**: [SIAA-95](https://the-three-devsketeers.atlassian.net/browse/SIAA-95)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Approved Architecture  

---

## 1. Technical Context & Stack Constraints

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Runtime & Framework** | Java 21 + Spring Boot 3.3.4 | Modular monolith with Virtual Threads enabled for concurrent punch throughput. |
| **Domain Module** | `com.swift.modules.shift` | Dedicated domain module for digital punch clock lifecycle, break tracking, and attendance timesheets. |
| **Persistence Layer** | Spring Data JPA + `JdbcTemplate` / `SimpleJdbcCall` | Entities `StaffShift` and `StaffShiftAuditLog` backed by `public.staff_shifts` and `public.staff_shift_audit_logs`. |
| **Stored Procedures** | `public.clock_in_shift`, `clock_out_shift`, `toggle_shift_break` | Native PL/pgSQL RPC execution in PostgreSQL, with robust transactional JPA fallback in test environments. |
| **Server UTC Authority** | `java.time.Instant` / PostgreSQL `now()` | 100% tamper-proof timestamps unaffected by client device clock skew or OS restarts. |
| **Strangler Gateway** | NGINX Reverse Proxy | Routes `/api/v1/shifts/` and `/api/v1/staff/attendance-history` to Spring Boot with `@fallback_to_nextjs`. |

---

## 2. Architecture Decisions & Tradeoff Analysis

### Decision 1: Module Placement & Structure
- **Context**: SIAA-95 migrates 5 Next.js server actions: `fetchStaffShiftAction`, `clockInShiftAction`, `clockOutShiftAction`, `toggleShiftBreakAction`, and `getStaffAttendanceHistoryAction`.
- **Implementation**:
  - Module: `com.swift.modules.shift`
  - Controller: `ShiftAttendanceController` handling:
    - `POST /api/v1/shifts/clock-in`
    - `POST /api/v1/shifts/clock-out`
    - `POST /api/v1/shifts/toggle-break`
    - `GET /api/v1/shifts/active/{staffId}`
    - `GET /api/v1/staff/attendance-history`
  - Service: `ShiftAttendanceService` (interface) and `ShiftAttendanceServiceImpl`
  - Repositories: `StaffShiftRepository` and `StaffShiftAuditLogRepository`
  - Entities: `StaffShift` and `StaffShiftAuditLog`
  - DTOs: `ClockInRequest`, `ClockOutRequest`, `ToggleBreakRequest`, `ShiftResponse`, `ActiveShiftResponse`, `AttendanceHistoryResponse`

---

### Decision 2: Stored Procedure Wrapping Strategy
- **Context**: The Jira ticket mandates wrapping stored procedures:
  - `public.clock_in_shift(p_terminal_id, p_notes, p_profile_id)`
  - `public.clock_out_shift(p_shift_id, p_notes, p_profile_id)`
  - `public.toggle_shift_break(p_shift_id, p_profile_id)`
- **Strategy**:
  - In PostgreSQL production runtime:
    - Executes stored procedures using `JdbcTemplate` or `SimpleJdbcCall`.
    - If the database returns `ACTIVE_SHIFT_EXISTS`, maps to `HTTP 409 Conflict`.
    - If `SHIFT_NOT_FOUND`, maps to `HTTP 404 Not Found`.
    - If `SHIFT_NOT_ACTIVE`, maps to `HTTP 400 Bad Request`.
  - In H2 / In-Memory Mock Test runtime:
    - Executes the corresponding JPA repository logic in a `@Transactional` block with row-locking and uniqueness checks, returning the identical JSON structure.
- **Benefit**: Ensures seamless developer testing in CI without needing an external live Postgres cluster, while executing native stored procedures when Postgres is active.

---

### Decision 3: Shift Rehydration & Elapsed Duration Calculation
- **Context**: Scenario 2 specifies:
  - When the browser hard-refreshes (F5), `GET /api/v1/shifts/active/{staffId}` queries `public.staff_shifts` for status `IN ('on_shift', 'break')`.
  - The active elapsed duration is dynamically computed as `now() - clock_in`.
- **Implementation**:
  - `Duration elapsed = Duration.between(shift.getClockIn(), Instant.now());`
  - Formatted duration string: `String.format("%02dh %02dm", elapsed.toHours(), elapsed.toMinutesPart());`
  - Total elapsed seconds: `Math.max(0, elapsed.getSeconds());`
- **Benefit**: Client terminals never need to store state in unencrypted local storage; a simple refresh restores the running timer down to the exact second.

---

### Decision 4: Concurrency & Active Shift Exclusivity
- **Context**: Multiple terminals or network retries must never create duplicate active shifts for the same employee profile.
- **Implementation**:
  - Database table `staff_shifts` has a uniqueness constraint / RPC check preventing overlapping active shifts (`status IN ('on_shift', 'break')`).
  - Spring Boot checks active shift existence before insert, catching both optimistic uniqueness violations and throwing `ActiveShiftConflictException`.
  - Global exception handler maps `ActiveShiftConflictException` to `HTTP 409 Conflict` with code `ACTIVE_SHIFT_EXISTS`.
