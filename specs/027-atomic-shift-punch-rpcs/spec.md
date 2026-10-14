# Feature Specification: Supabase Atomic Shift Punch RPCs & Concurrency Guards

**Feature Branch**: `feat/SIAA-61-atomic-shift-punch-rpcs`  
**Created**: 2026-10-14  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-61](https://the-three-devsketeers.atlassian.net/browse/SIAA-61) (STORY-5.7)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  
**Prerequisites**: [SIAA-60](https://the-three-devsketeers.atlassian.net/browse/SIAA-60) (STORY-5.6: Supabase Staff Shifts & Punch Clock Schema)  

## Clarifications

### Session 2026-10-14
- Q: How should double clock-in race conditions be guarded at the database level? → A: Enforced via stored procedure active check AND a unique partial index `WHERE (status IN ('on_shift', 'break'))` on `public.staff_shifts(profile_id)`.
- Q: What exact return format should RPCs emit? → A: JSONB structured object containing `success: boolean`, `shift: jsonb`, `duration_formatted?: string`, and `audit_log_id?: string`.
- Q: How are break toggles audited? → A: Transition from `on_shift` to `break` logs action `break_start`; transition from `break` to `on_shift` logs action `break_end`.
- Q: Can admins clock out shifts for other employees? → A: Yes, `clock_out_shift` permits execution if `auth.uid() = profile_id` OR `public.is_admin()`.


### User Story 1 - Atomic Clock-In RPC with Concurrency Guard (Priority: P1)

As a Floor Mechanic or Shop Cashier,  
I want an atomic PostgreSQL stored procedure `clock_in_shift(p_terminal_id TEXT, p_notes TEXT)` that validates active shift status and inserts a shift record in a single database transaction,  
so that double-punching is strictly prevented even under rapid double-clicks, concurrent tabs, or multi-terminal race conditions.

**Why this priority**: Preventing duplicate open shifts is foundational to labor compliance, accurate attendance reporting, and payroll calculations. Client-side checks alone are susceptible to network latency and race conditions.

**Independent Test**: Can be independently tested via direct Supabase RPC invocation: call `clock_in_shift` twice concurrently for the same authenticated user profile; verify the first call succeeds with status `on_shift` and the second call raises Postgres exception `ACTIVE_SHIFT_EXISTS (409)`.

**Acceptance Scenarios**:

1. **Given** an authenticated user session (`auth.uid()`) with no ongoing shift (`status NOT IN ('on_shift', 'break')`),  
   **When** `clock_in_shift(p_terminal_id TEXT, p_notes TEXT)` is executed,  
   **Then** a new row is inserted into `public.staff_shifts` with `status = 'on_shift'`, server-stamped `clock_in = timezone('utc', now())`, caller's `profile_id`, resolved `staff_name`, and specified `terminal_id`,  
   **And** an audit event of type `clock_in` is inserted into `public.staff_shift_audit_logs`,  
   **And** the procedure returns a JSONB payload containing the initialized shift record.
2. **Given** an authenticated user session with an existing active shift (`status = 'on_shift'` or `'break'`),  
   **When** `clock_in_shift` is executed,  
   **Then** the procedure aborts the transaction and raises a PostgreSQL exception with message `ACTIVE_SHIFT_EXISTS` and error code `P0409` (or HTTP 409 mapping),  
   **And** no duplicate shift row is created.
3. **Given** an unauthenticated session (`auth.uid()` is null),  
   **When** `clock_in_shift` is executed without explicit service bypass,  
   **Then** the procedure raises an exception `UNAUTHENTICATED (401)`.

---

### User Story 2 - Atomic Clock-Out RPC & Duration Calculation (Priority: P1)

As a Floor Mechanic or Shop Cashier,  
I want an atomic PostgreSQL stored procedure `clock_out_shift(p_shift_id UUID, p_notes TEXT)` with server-authoritative time extraction and duration computation,  
so that local device clock skew or offline timestamp manipulation cannot distort employee timesheets, and the shift is finalized with accurate duration hours and minutes.

**Why this priority**: Accurate duration recording directly drives timesheet auditing and payroll accuracy. Server-side timestamps prevent client machine clock inaccuracies or deliberate time tampering.

**Independent Test**: Can be independently tested by creating an active shift, executing `clock_out_shift`, and asserting that `clock_out` is populated with the database clock time, `duration_seconds` equals elapsed epoch seconds, `status` transitions to `'completed'`, and formatted duration string `HHh MMm` is returned.

**Acceptance Scenarios**:

1. **Given** an active shift record (`status IN ('on_shift', 'break')`) owned by the caller (`profile_id = auth.uid()` or caller is admin via `public.is_admin()`),  
   **When** `clock_out_shift(p_shift_id UUID, p_notes TEXT)` is executed,  
   **Then** the procedure acquires a pessimistic row lock (`FOR UPDATE`),  
   **And** sets `clock_out = timezone('utc', now())`,  
   **And** calculates `duration_seconds = EXTRACT(EPOCH FROM (timezone('utc', now()) - clock_in))::INTEGER`,  
   **And** transitions `status` to `'completed'`,  
   **And** updates `notes` if provided,  
   **And** records a `clock_out` audit event in `public.staff_shift_audit_logs`,  
   **And** returns a JSONB payload including the updated shift and formatted duration string (e.g. `08h 59m`).
2. **Given** a shift owned by another user when the caller is not an admin,  
   **When** `clock_out_shift` is executed,  
   **Then** the procedure raises an exception `UNAUTHORIZED (403)`.
3. **Given** a shift that is already `'completed'` or does not exist,  
   **When** `clock_out_shift` is executed,  
   **Then** the procedure raises an exception `SHIFT_NOT_ACTIVE (404)`.

---

### User Story 3 - Break Toggle Transition (Priority: P2)

As a Floor Mechanic,  
I want an atomic procedure `toggle_shift_break(p_shift_id UUID)` that alternates shift status between active work and break,  
so that rest periods are tracked accurately without ending the entire shift.

**Why this priority**: Break state tracking is required for statutory labor compliance and real-time floor terminal presence indicators.

**Independent Test**: Can be tested by invoking `toggle_shift_break` on an `'on_shift'` record and verifying status becomes `'break'`, then invoking it again and verifying status returns to `'on_shift'`.

**Acceptance Scenarios**:

1. **Given** an ongoing shift with `status = 'on_shift'` owned by the caller (or admin),  
   **When** `toggle_shift_break(p_shift_id UUID)` is executed,  
   **Then** `status` atomically transitions to `'break'`,  
   **And** an audit event of type `break_start` is recorded,  
   **And** the procedure returns the updated shift record.
2. **Given** an ongoing shift with `status = 'break'` owned by the caller (or admin),  
   **When** `toggle_shift_break(p_shift_id UUID)` is executed,  
   **Then** `status` atomically transitions to `'on_shift'`,  
   **And** an audit event of type `break_end` is recorded,  
   **And** the procedure returns the updated shift record.
3. **Given** a shift with `status = 'completed'`,  
   **When** `toggle_shift_break` is executed,  
   **Then** the procedure raises an exception `SHIFT_ALREADY_COMPLETED (400)`.

---

### User Story 4 - Immutable Attendance Audit Ledger (Priority: P2)

As a Store Manager or Compliance Auditor,  
I want an immutable attendance audit table `public.staff_shift_audit_logs` that logs every shift state mutation with an anti-tamper trigger,  
so that audit trails cannot be altered or deleted even by database administrators.

**Why this priority**: Non-repudiation and labor law audit compliance require append-only historical records for all time tracking mutations.

**Independent Test**: Can be tested by attempting an `UPDATE` or `DELETE` on `public.staff_shift_audit_logs` and asserting that Postgres raises exception `TAMPER_FORBIDDEN (55000)`.

**Acceptance Scenarios**:

1. **Given** any shift RPC execution (`clock_in_shift`, `clock_out_shift`, `toggle_shift_break`),  
   **When** the transaction commits,  
   **Then** a corresponding immutable row in `public.staff_shift_audit_logs` is persisted with timestamp, `profile_id`, `shift_id`, `terminal_id`, and `action`.
2. **Given** an existing row in `public.staff_shift_audit_logs`,  
   **When** any direct SQL `UPDATE` or `DELETE` is attempted,  
   **Then** the trigger `trigger_prevent_staff_shift_audit_tampering` intercepts the statement and raises exception `TAMPER_FORBIDDEN`.

---

### User Story 5 - Client-Side Store Guard & Concurrency Error Alerts (Priority: P3)

As a Shop Cashier using the Staff Terminal punch clock,  
I want the client-side state store (`punchStore`) to catch `ACTIVE_SHIFT_EXISTS` exceptions and present clear, informative toast notifications,  
so that I understand why an extra punch-in was prevented without facing silent failures or confusing technical error codes.

**Why this priority**: Enhances operator user experience on the terminal floor by cleanly translating database error codes into actionable feedback.

**Independent Test**: Can be tested by simulating or triggering an `ACTIVE_SHIFT_EXISTS` error and verifying that the store traps the error and triggers the UI toast notification.

**Acceptance Scenarios**:

1. **Given** the staff terminal punch clock interface,  
   **When** an `ACTIVE_SHIFT_EXISTS` error is returned by the RPC or server action,  
   **Then** `punchStore` captures the error code, prevents state corruption, and emits a toast message: *"Active shift already in progress. Please clock out before starting a new shift."*

---

## Edge Cases

- **Double-Click Clock-In**: Two rapid successive clicks on the "Clock In" button trigger parallel RPC requests; pessimistic lock / active check ensures the first transaction creates the shift and the second raises `ACTIVE_SHIFT_EXISTS` with zero orphaned rows.
- **Clock-Out on Non-Existent Shift**: Attempting to clock out with an invalid UUID returns `SHIFT_NOT_FOUND (404)`.
- **Clock-Out on Already Completed Shift**: Attempting to clock out a shift with `status = 'completed'` returns `SHIFT_NOT_ACTIVE (400)`.
- **Admin Elevation Punch**: A store manager can clock out an employee's forgotten active shift by specifying `p_shift_id` while possessing `role = 'admin'` (`public.is_admin() = true`).
- **Clock Skew Invariance**: Duration is calculated via Postgres server clock (`timezone('utc', now()) - clock_in`), ignoring client device time.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a PostgreSQL stored procedure `public.clock_in_shift(p_terminal_id TEXT DEFAULT 'Terminal #01', p_notes TEXT DEFAULT NULL)` executable by authenticated users.
- **FR-002**: `clock_in_shift` MUST verify that no shift exists with `profile_id = auth.uid()` and `status IN ('on_shift', 'break')` before inserting.
- **FR-003**: If an active shift exists for the caller, `clock_in_shift` MUST raise exception `ACTIVE_SHIFT_EXISTS` with SQLSTATE `P0409`.
- **FR-004**: System MUST provide a PostgreSQL stored procedure `public.clock_out_shift(p_shift_id UUID, p_notes TEXT DEFAULT NULL)` executable by authenticated users.
- **FR-005**: `clock_out_shift` MUST enforce that `profile_id = auth.uid()` OR `public.is_admin()` is true, raising `UNAUTHORIZED (403)` otherwise.
- **FR-006**: `clock_out_shift` MUST set `clock_out` to server UTC timestamp, compute `duration_seconds` as the epoch difference from `clock_in`, transition `status` to `'completed'`, and return the formatted duration string `HHh MMm`.
- **FR-007**: System MUST provide a PostgreSQL stored procedure `public.toggle_shift_break(p_shift_id UUID)` that atomically alternates an ongoing shift between `'on_shift'` and `'break'`.
- **FR-008**: System MUST provide an immutable audit ledger `public.staff_shift_audit_logs` recording all shift lifecycle events (`clock_in`, `clock_out`, `break_start`, `break_end`).
- **FR-009**: System MUST attach an anti-tamper trigger to `public.staff_shift_audit_logs` preventing `UPDATE` and `DELETE` operations.
- **FR-010**: All RPC procedures MUST be defined with `SECURITY DEFINER` and `SET search_path = public, auth`.
- **FR-011**: `lib/store/punch-store.ts` MUST include error-handling guards to catch `ACTIVE_SHIFT_EXISTS` and surface user-friendly notifications.
- **FR-012**: TypeScript contracts and RPC caller helpers MUST be defined in `lib/contracts/punch-clock-rpcs.ts` and unit tested.

### Key Entities

- **StaffShift** (`public.staff_shifts`): Core relational record of an employee work shift.
  - Key attributes: `id` (UUID), `profile_id` (UUID), `staff_name` (TEXT), `terminal_id` (TEXT), `clock_in` (TIMESTAMPTZ), `clock_out` (TIMESTAMPTZ), `duration_seconds` (INT), `status` ('on_shift' | 'break' | 'completed'), `notes` (TEXT).
- **StaffShiftAuditLog** (`public.staff_shift_audit_logs`): Immutable audit trail for shift state mutations.
  - Key attributes: `id` (UUID), `shift_id` (UUID), `profile_id` (UUID), `terminal_id` (TEXT), `action` ('clock_in' | 'clock_out' | 'break_start' | 'break_end'), `notes` (TEXT), `created_at` (TIMESTAMPTZ).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of concurrent or duplicate clock-in attempts for an active shift are blocked with zero orphaned rows.
- **SC-002**: Shift duration computation is 100% server-enforced, with duration errors due to client clock drift reduced to 0%.
- **SC-003**: 100% of shift state mutations generate a corresponding immutable record in `staff_shift_audit_logs`.
- **SC-004**: Stored procedures execute and return in under 50ms under standard database operating conditions.

---

## Assumptions

- Supabase PostgreSQL migration `20261015000000_staff_shifts.sql` (from SIAA-60) is already applied and defines `public.staff_shifts`.
- `public.profiles` contains employee profile records, and helper `public.is_admin()` exists for privilege checks.
- Audit records in `public.staff_shift_audit_logs` are retained indefinitely for compliance and cannot be truncated or purged by standard users.
