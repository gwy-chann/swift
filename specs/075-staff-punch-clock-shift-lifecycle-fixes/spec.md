# Feature Specification: Fix Staff Punch Clock Shift Lifecycle, Time-Out History Recording, and Route Persistence

**Feature Branch**: `feat/SIAA-75-staff-punch-clock-fixes`  
**Created**: 2026-10-20  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-75](https://the-three-devsketeers.atlassian.net/browse/SIAA-75)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (Staff Shop Floor Terminal & Time Clock)  
**Target View**: Digital Shift Punch Clock terminal (`/staff/clock`) and Staff Portal Global Navigation

---

## 1. Executive Summary & Problem Statement

Staff members and shop floor managers reported multiple critical defects on the Digital Shift Punch Clock terminal (`/staff/clock`) impacting attendance logging, timesheet accuracy, and shift lifecycle control:

1. **Time-Out Not Displayed in Log History**: When an employee clocks out via "TIME OUT (SHIFT END)", the attendance history row fails to record or display the time-out timestamp in the "Time-Out" column. The row remains displayed as `-- Active Shift --`, the duration displays as `00:00:00`, and status stays as `On Shift` even though the terminal status badge displays `CURRENT STATUS: CLOCKED OUT`.
2. **Unintended Automatic Time-In on Initial Login**: When logging in as a staff member or launching a fresh browser session, the system automatically initializes in an active "On Shift" state without the staff member explicitly pressing "TIME IN (SHIFT START)". Attendance shifts must be manually initiated by the employee.
3. **Unwanted Automatic Time-Out on Page Navigation**: If an employee manually clocks in and subsequently navigates to other staff views (e.g. `/staff/pos`, `/staff/lookup`) and returns to `/staff/clock`, the punch clock automatically reverts to "CURRENT STATUS: CLOCKED OUT" / idle, prematurely resetting their active shift.

This specification defines the corrected shift lifecycle state transitions, robust attendance log history synchronization, persistent client shift tracking across portal route transitions, and accurate display formatting.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-75)

* **As a** Shop Floor Staff Member or Cashier,  
* **I want** the punch clock to initialize in a clocked-out state, accurately record and display my clock-out timestamps and durations upon ending a shift, and reliably preserve my active shift across page navigations in the Staff Portal,  
* **So that** my attendance records and payroll timesheets are 100% accurate without accidental time-ins, dropped shifts, or phantom active rows.

---

### Scenario 1: Clean Session Initialization (Defect 2 Fix) (Priority: P1)

* **Given** a staff member logs in with fresh credentials or opens the Staff Portal (`/staff/clock`)
* **When** the punch clock interface loads
* **Then** the shift status MUST initialize to `CURRENT STATUS: CLOCKED OUT` (`idle`)
* **And** the live duration counter MUST display `00:00:00` (or `00h 00m` stopped)
* **And** no automatic shift clock-in MUST occur until the employee explicitly clicks `TIME IN (SHIFT START)`.

---

### Scenario 2: Active Shift Persistence Across Route Transitions (Defect 3 Fix) (Priority: P1)

* **Given** an employee has explicitly clocked in on `/staff/clock` (Status: `CURRENT STATUS: ON SHIFT`)
* **When** the employee navigates to other staff routes (such as `/staff/pos`, `/staff/lookup`, or `/staff/service-bay`)
* **And When** the employee returns to `/staff/clock`
* **Then** the terminal MUST remain in `CURRENT STATUS: ON SHIFT`
* **And** the elapsed shift timer MUST continue accurately reflecting the total active elapsed seconds
* **And** the active shift MUST NOT be prematurely reset to `CLOCKED OUT`.

---

### Scenario 3: Accurate Time-Out Recording in Timesheet History (Defect 1 Fix) (Priority: P1)

* **Given** an employee is currently on an active shift on `/staff/clock`
* **When** the employee clicks `TIME OUT (SHIFT END)`
* **Then** the active shift record MUST be finalized with the exact clock-out timestamp (e.g. `12:45:10 AM`)
* **And** the shift record's duration MUST be calculated and displayed (e.g. `00h 05m`)
* **And** the status in the attendance history row MUST transition from `On Shift` to `Completed`
* **And** the "Time-Out" column MUST display the recorded clock-out timestamp instead of `-- Active Shift --`
* **And** the terminal header status badge MUST update to `CURRENT STATUS: CLOCKED OUT`.

---

### Scenario 4: Historical Completed Shift Isolation (Priority: P1)

* **Given** attendance history contains past completed shifts or baseline seed records
* **When** the attendance history table renders
* **Then** only genuinely active shifts (`status === 'on_shift'` or `status === 'break'` with active timer) may display `-- Active Shift --`
* **And** past completed shifts MUST always display their recorded `timeOut` timestamp and historical duration regardless of sorting order or array prepends.

---

### Scenario 5: Duplicate Punch & Guard Interception (Priority: P2)

* **Given** an employee is already on an active shift
* **When** the employee clicks `TIME IN (SHIFT START)`
* **Then** the action is intercepted with an error alert: "Active shift already in progress. Please clock out before starting a new shift."
* **And** no duplicate shift entry is created.

---

### Scenario 6: Meal / Rest Break State Management (Priority: P2)

* **Given** an employee is on an active shift
* **When** the employee clicks "Take Meal / Rest Break"
* **Then** status transitions to `CURRENT STATUS: ON BREAK`
* **And** the live timer progression freezes during break duration
* **And** clicking "End Break & Resume Shift" transitions status back to `CURRENT STATUS: ON SHIFT` and resumes the timer.

---

## 3. Edge Cases & Boundary Conditions

1. **Remote Attendance History Query Returns Null Active Shift**:
   When `getStaffAttendanceHistoryAction()` executes on route mount and returns `activeShift: null` (such as in offline development or before Supabase RPCs run), the client store MUST NOT wipe out an active shift that was already explicitly initiated in the current session.
2. **Reverse Chronological Reordering with Prepended Logs**:
   When new punch logs are recorded or rehydrated, the active shift identification must be based on unique shift ID or explicit active status flags, NOT on fixed array index `0`.
3. **Session Rehydration with Valid Database Active Shift**:
   If the remote database returns a legitimate active shift with a valid `clock_in` timestamp, the store MUST rehydrate the elapsed time accurately from `clock_in` to the current timestamp.
4. **Zero Duration Clock-Out**:
   If an employee clocks out within seconds of clocking in, duration must display `00h 00m` or `00h 01m` gracefully without NaN or negative values.

---

## 4. Functional Requirements

- **FR-001**: `PunchStore` default constructor state MUST set `isShiftActive: false`, `shiftStatus: 'idle'`, and `shiftSeconds: 0`.
- **FR-002**: Initial mock or seed punch logs MUST NOT contain lingering unclosed active shifts unless explicitly intended for mock testing; baseline logs for standard staff sessions must be in `Completed` state.
- **FR-003**: `rehydrateShift(activeShift, recentLogs)` in `PunchStore` MUST preserve an active client-initiated shift if `activeShift` from remote query is `null` and the client already has an active shift running locally.
- **FR-004**: `clockOut` in `PunchStore` MUST locate the specific active shift record by ID or active status rather than assuming index `0`.
- **FR-005**: `AttendanceHistoryTable` MUST evaluate `isActive` strictly against `isShiftActive && (log.status === 'On Shift' || log.status === 'on_shift') && (log.id === activeShiftId || log.timeOut === '-- Active Shift --')`, preventing historical completed records from rendering as active.
- **FR-006**: When `clockOut` completes, the active row's `timeOut` MUST be set to the formatted completion time string, `status` set to `'Completed'`, and duration computed via `formatDurationToHoursMinutes`.
- **FR-007**: Client route transitions between `/staff/clock` and other Staff Portal pages MUST maintain continuous duration ticking and active shift status without reset.

---

## 5. Success Criteria (Technology-Agnostic & Measurable)

1. **Zero Auto-Clock-In on Login**: 100% of fresh sessions start in `CLOCKED OUT` / idle state.
2. **100% Timesheet Time-Out Capture**: 100% of clock-out actions immediately display the real clock-out time and duration in the history table without requiring a page reload.
3. **Persistent Active Navigation**: Navigating away from and returning to `/staff/clock` preserves active shift state with 0 seconds of timer drift or accidental reset.
4. **Backward-Compatible Contracts**: All existing punch clock and attendance contract tests pass without regression.
