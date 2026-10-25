# Feature Specification: Employee Shift Attendance & Digital Punch Clock Lifecycle

**Feature Branch**: `feat/SIAA-95-employee-shift-attendance-punch-clock-lifecycle`  
**Created**: 2026-10-25  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-95](https://the-three-devsketeers.atlassian.net/browse/SIAA-95)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 4 (Core Transaction Engine)  
**Actions Replaced (5)**: `fetchStaffShiftAction`, `clockInShiftAction`, `clockOutShiftAction`, `toggleShiftBreakAction`, `getStaffAttendanceHistoryAction`  
**Stored Procedures Wrapped (3)**: `public.clock_in_shift`, `public.clock_out_shift`, `public.toggle_shift_break`  
**Target View / Scope**: Shift Attendance Module (`swift-backend/src/main/java/com/swift/modules/shift/*`, `gateway/nginx-strangler-gateway.conf`)

---

## 1. Executive Summary & Objective

In Phase 4 of the Next.js to Spring Boot migration, SWIFT migrates the **Employee Shift Attendance & Digital Punch Clock Lifecycle** from Next.js server actions to a high-concurrency Spring Boot 3.3 modular monolith backend.

Floor staff members (Cashiers, Mechanics, Inventory Clerks) and Store Managers rely on digital punch-clock terminals to track daily working hours, meal breaks, and overtime. Accurate attendance logging is critical for labor payroll compliance, terminal session auditing, and POS operational guards (ensuring only clocked-in employees process customer cash and card checkouts).

This specification establishes:
1. **Digital Punch Clock REST Endpoints (`/api/v1/shifts`)**:
   - `POST /api/v1/shifts/clock-in`: Atomically clocks in an employee with server UTC timestamp, terminal ID, optional notes, and prevents concurrent double clock-ins (`409 Conflict`).
   - `POST /api/v1/shifts/clock-out`: Finalizes an active shift, computes authoritative duration (seconds and `HHh MMm` format), stamps UTC `clock_out`, and writes immutable audit logs.
   - `POST /api/v1/shifts/toggle-break`: Toggles meal break intervals between `'on_shift'` and `'break'` state with microsecond accuracy.
   - `GET /api/v1/shifts/active/{staffId}`: Shift rehydration endpoint that retrieves active shift records upon browser hard-refresh (F5) or terminal crash, dynamically calculating elapsed time from server UTC `now() - clock_in`.
2. **Staff Attendance Timesheet History (`/api/v1/staff/attendance-history`)**:
   - `GET /api/v1/staff/attendance-history`: Paginated history of employee shifts with date-range filters (`startDate`, `endDate`), staff profile filtering, total hours calculations, and reverse-chronological ordering.
3. **PostgreSQL Stored Procedure Integration via Spring Data & `SimpleJdbcCall`**:
   - Calls existing atomic stored procedures (`public.clock_in_shift`, `public.clock_out_shift`, `public.toggle_shift_break`) with graceful fallback to repository/JPA execution for local/H2 testing profiles.
4. **Strangler Reverse Proxy Handover**:
   - Configures NGINX strangler reverse-proxy gateway rules for `/api/v1/shifts/` and `/api/v1/staff/attendance-history` with sub-second fallback to Next.js (`@fallback_to_nextjs`).

---

## 1.1 Clarifications & Architecture Decisions

### Session 2026-10-25
- **Q1: How are stored procedures `clock_in_shift`, `clock_out_shift`, and `toggle_shift_break` invoked?**
  - **A**: The primary path utilizes Spring JDBC `SimpleJdbcCall` or native SQL function calls against PostgreSQL. When running against standalone H2 test profiles where stored procedures are absent, the service falls back to transactional JPA repository methods to simulate identical state mutations and uniqueness validation.
- **Q2: What is the exact response and status code when an employee clocks in while already on an active shift?**
  - **A**: The server returns `HTTP 409 Conflict` with error code `ACTIVE_SHIFT_EXISTS` and message `"Active shift already in progress. Please clock out before starting a new shift."`
- **Q3: How does shift rehydration handle elapsed duration calculation?**
  - **A**: Duration is dynamically calculated on the server using `java.time.Duration.between(shift.getClockIn(), Instant.now()).getSeconds()` so that client clock skews, device reboots, or hard browser refreshes never tamper with or misrepresent true elapsed work hours.
- **Q4: How does toggle-break behave?**
  - **A**: If the shift is currently `on_shift`, it transitions to `break`. If currently `break`, it transitions back to `on_shift`. In both cases, a record is added to `staff_shift_audit_logs` (`break_start` or `break_end`). If the shift is `completed`, the request is rejected with `HTTP 400 Bad Request` (`SHIFT_NOT_ACTIVE`).
- **Q5: What are the security rules for clocking in/out?**
  - **A**: Floor kiosks allow staff to clock in using their authenticated session or their verified `staffId` / `profileId`. Shift attendance endpoints are accessible to authenticated staff and kiosk-authenticated terminals (`/api/v1/shifts/**`).

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-95)

* **As a** Floor Staff Member and Store Manager,  
* **I want** shift punch-ins and break toggles to execute atomically against server UTC timestamps and survive browser reloads,  
* **so that** payroll attendance records are 100% tamper-proof and never lost on device reboot.

---

### Scenario 1: Clocking in for a work shift via atomic PostgreSQL RPC (Priority: P1)

* **Given** an active staff member authenticated at the floor terminal with profile ID `"00000000-0000-0000-0000-000000000002"`
* **When** `"POST /api/v1/shifts/clock-in"` is invoked with `staffId` and `terminalId = "Terminal #01"`
* **Then** Spring Boot executes stored procedure `"public.clock_in_shift"`
* **And** table `"staff_shifts"` inserts a new active shift with status `"on_shift"` and server UTC timestamp
* **And** an audit event `"clock_in"` is recorded in `"staff_shift_audit_logs"`
* **And** returns `HTTP 200 OK` with shift ID, staff name, terminal ID, status, and clock-in time.

---

### Scenario 2: Preventing duplicate active clock-ins (Priority: P1)

* **Given** a staff member currently on an active shift (`status = "on_shift"` or `"break"`)
* **When** `"POST /api/v1/shifts/clock-in"` is called for the same `staffId`
* **Then** the request is rejected with `HTTP 409 Conflict`
* **And** response body contains `code = "ACTIVE_SHIFT_EXISTS"` and error message `"Active shift already in progress. Please clock out before starting a new shift."`.

---

### Scenario 3: Shift rehydration surviving browser refresh (Priority: P1)

* **Given** a staff member with an active shift clocked in 45 minutes ago
* **When** the browser is hard-refreshed (F5) and requests `"GET /api/v1/shifts/active/{staffId}"`
* **Then** Spring Boot queries `"public.staff_shifts"` and returns the active shift
* **And** active duration is dynamically computed from server UTC (`now() - clock_in`) returning `durationSeconds >= 2700` and formatted string `"00h 45m"`
* **And** returns `HTTP 200 OK` with full shift metadata.

---

### Scenario 4: Toggle meal break interval (Priority: P1)

* **Given** an active shift with status `"on_shift"`
* **When** `"POST /api/v1/shifts/toggle-break"` is called with the active `shiftId`
* **Then** stored procedure `"public.toggle_shift_break"` updates status to `"break"`
* **And** table `"staff_shift_audit_logs"` records an audit event `"break_start"`
* **And** returns `HTTP 200 OK` with `status = "break"`
* **When** `"POST /api/v1/shifts/toggle-break"` is called again on the same shift
* **Then** status reverts to `"on_shift"` and audit event records `"break_end"`.

---

### Scenario 5: Clocking out and calculating authoritative shift duration (Priority: P1)

* **Given** an active shift with `clock_in` timestamp 8 hours and 15 minutes prior
* **When** `"POST /api/v1/shifts/clock-out"` is called with `shiftId` and optional `notes = "Completed closing inventory check"`
* **Then** stored procedure `"public.clock_out_shift"` executes with a row lock (`FOR UPDATE`)
* **And** `clock_out` is set to UTC `now()`, `duration_seconds` is stored as `29700`, and `status = "completed"`
* **And** table `"staff_shift_audit_logs"` records `"clock_out"`
* **And** returns `HTTP 200 OK` with `durationFormatted = "08h 15m"` and status `"completed"`.

---

### Scenario 6: Rejection of clock-out on already finalized or non-existent shifts (Priority: P2)

* **Given** a shift that has already been finalized (`status = "completed"`)
* **When** `"POST /api/v1/shifts/clock-out"` is called with this `shiftId`
* **Then** Spring Boot returns `HTTP 400 Bad Request` with `code = "SHIFT_NOT_ACTIVE"`
* **When** `"POST /api/v1/shifts/clock-out"` is called with an invalid/unknown UUID
* **Then** Spring Boot returns `HTTP 404 Not Found` with `code = "SHIFT_NOT_FOUND"`.

---

### Scenario 7: Querying staff attendance timesheet history with pagination & filters (Priority: P2)

* **Given** multiple staff shift records exist across various employees and dates
* **When** `"GET /api/v1/staff/attendance-history?staffId={staffId}&page=0&size=20"` is called
* **Then** Spring Boot returns `HTTP 200 OK` with a paginated list of shifts ordered by `clock_in DESC`
* **And** payload includes `totalHoursWorked`, `activeShift` (if currently on shift), and page metadata (`totalPages`, `totalElements`).

---

## 3. Functional Requirements & Invariants

1. **FR-001 (Server UTC Time Source)**:
   - All punch timestamps (`clock_in`, `clock_out`, audit logs) MUST use authoritative server UTC `Instant.now()` / database `now()`. Client clock times are ignored.
2. **FR-002 (Active Shift Exclusivity)**:
   - A staff profile cannot have more than one shift with status `'on_shift'` or `'break'` concurrently. Violations return `409 Conflict`.
3. **FR-003 (Deterministic Break Transitions)**:
   - Break toggle must strictly alternate between `'on_shift'` and `'break'`. It cannot transition a `'completed'` shift.
4. **FR-004 (Authoritative Duration Math)**:
   - Shift duration is calculated as `max(0, epoch_seconds(clock_out) - epoch_seconds(clock_in))` and formatted as `HHh MMm`.
5. **FR-005 (Audit Logging Guarantee)**:
   - Every punch transition (`clock_in`, `clock_out`, `break_start`, `break_end`) MUST insert an immutable record into `staff_shift_audit_logs`.
6. **FR-006 (Strangler Reverse Proxy Routing)**:
   - All `/api/v1/shifts/**` and `/api/v1/staff/attendance-history` requests pass through NGINX to Spring Boot with `@fallback_to_nextjs` support.

---

## 4. API Endpoints Specification

### 4.1 Digital Punch Clock

| Method | Endpoint | Description | Auth Requirement |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/v1/shifts/clock-in` | Clock in for shift | Authenticated / Terminal Staff |
| `POST` | `/api/v1/shifts/clock-out` | Clock out of active shift | Authenticated / Terminal Staff |
| `POST` | `/api/v1/shifts/toggle-break` | Toggle break interval | Authenticated / Terminal Staff |
| `GET` | `/api/v1/shifts/active/{staffId}` | Rehydrate active shift & duration | Authenticated / Terminal Staff |

### 4.2 Attendance History

| Method | Endpoint | Description | Auth Requirement |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/v1/staff/attendance-history` | Query timesheet history & active shift | Authenticated / Staff / Admin |
