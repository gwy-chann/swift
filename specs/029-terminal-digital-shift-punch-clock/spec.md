# Feature Specification: Terminal Digital Shift Punch Clock & Active Duration Counter

**Feature Branch**: `feat/SIAA-29-terminal-digital-shift-punch-clock`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-29](https://the-three-devsketeers.atlassian.net/browse/SIAA-29) (STORY-5.2)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  
**Prerequisites**: [SIAA-10](https://the-three-devsketeers.atlassian.net/browse/SIAA-10) (STORY-1.3: Staff Terminal Shell), [SIAA-12](https://the-three-devsketeers.atlassian.net/browse/SIAA-12) (STORY-1.5: Centralized Domain Models & Reactive Mock Data Engine)  
**Blocks**: [SIAA-30](https://the-three-devsketeers.atlassian.net/browse/SIAA-30) (STORY-5.3: Staff Shift Attendance Log History & Timesheet Tracking)  

---

## User Scenarios & Testing

### User Story 1 - Real-Time Terminal Digital Clock Display (Priority: P1)

As a Floor Mechanic or Shop Staff Member,  
I want to view a large, high-contrast digital clock updating with 1-second precision on the Punch Clock screen (`#view-staff-clock`),  
so that I always have a clear, authoritative time reference when preparing for and logging shop floor shifts.

**Why this priority**: Essential visual baseline for the terminal punch clock station; staff must be able to view current shop time at a glance before clocking in or out.

**Independent Test**: Mount the punch clock page at `/staff/clock`; observe `#liveClockDisplay` renders immediately in 12-hour AM/PM format (e.g., `08:14:30 AM`) and ticks synchronously once per second without drift or layout shifts.

**Acceptance Scenarios**:
1. **Given** an authenticated staff member on the Staff Shop Floor Terminal,  
   **When** navigating to the "Punch Clock" view (`#view-staff-clock` at `/staff/clock`),  
   **Then** the large digital clock (`#liveClockDisplay`) displays the current time with 1-second resolution in 12-hour format (e.g., `08:14:30 AM`).
2. **Given** the clock is mounted,  
   **When** 1 second elapses,  
   **Then** `#liveClockDisplay` updates without full component re-rendering, unmounting, or layout jumping.

---

### User Story 2 - Shift Clock-In (Time-In) Trigger & Counter Initiation (Priority: P1)

As a Floor Mechanic or Shop Staff Member,  
I want to click "TIME IN (SHIFT START)" when arriving on the floor,  
so that my shift start timestamp is recorded, my status switches to "ON SHIFT", and my elapsed shift duration timer starts counting from `00:00:00`.

**Why this priority**: Core attendance tracking functionality. Commences the staff member's work session and triggers the active shift elapsed counter.

**Independent Test**: With initial status clocked out/idle, click "TIME IN (SHIFT START)". Verify the punch record is logged, status badge updates to "ON SHIFT" (green), and the active shift duration counter begins incrementing from `00:00:00`.

**Acceptance Scenarios**:
1. **Given** the staff member is currently clocked out,  
   **When** they click "TIME IN (SHIFT START)",  
   **Then** the system records the exact punch-in timestamp,  
   **And** sets the shift status badge (`#punchStatusBadge`) to "CURRENT STATUS: ON SHIFT" (green semantic badge),  
   **And** initiates the topbar active shift timer (`#shiftTimerDisplay`) from `00:00:00`.
2. **Given** the staff member clocks in,  
   **When** inspecting the attendance log or punch history,  
   **Then** a new record is added showing today's date, the employee name, and exact time-in.

---

### User Story 3 - Persistent Real-Time Topbar Active Shift Duration Counter (Priority: P1)

As a Floor Mechanic or Shop Staff Member,  
I want the active shift duration counter in the topbar (`#shiftTimerDisplay`) to tick continuously every second without resetting or stuttering when I navigate between different staff modules,  
so that I always know my elapsed work time while operating the POS, finding stock, or looking up motorcycle compatibility.

**Why this priority**: Shift duration visibility must remain seamless and persistent across all floor operations without losing time or re-mounting back to zero on navigation.

**Independent Test**: Start a shift, observe the topbar `#shiftTimerDisplay` ticking. Navigate from `/staff/clock` to `/staff/pos`, `/staff/search`, and `/staff/compat`. Verify `#shiftTimerDisplay` retains its elapsed seconds and continues ticking continuously without hitching or resetting.

**Acceptance Scenarios**:
1. **Given** an ongoing active shift,  
   **When** the staff member navigates across different views (Fast-Lane POS, Stock Finder, MotoMatcher),  
   **Then** the topbar active shift timer (`#shiftTimerDisplay`) increments continuously each second (e.g. `04:12:30`) without resetting on view transitions.
2. **Given** a page reload or state rehydration on the staff terminal,  
   **When** an active shift exists,  
   **Then** the timer accurately calculates elapsed seconds from the shift start time.

---

### User Story 4 - Shift Clock-Out (Time-Out) & Duplicate Punch Guard (Priority: P1)

As a Floor Mechanic or Shop Staff Member,  
I want to click "TIME OUT (SHIFT END)" to finalize my shift, and have the system prevent accidental duplicate clock-ins,  
so that timesheets are cleanly closed with total elapsed duration and double-punch errors are prevented.

**Why this priority**: Prevents corrupt attendance records, double punch-ins, or ghost shifts while finalizing daily work duration.

**Independent Test**: While on an active shift, click "TIME IN (SHIFT START)" and verify duplicate punch alert appears. Then click "TIME OUT (SHIFT END)"; verify status changes to clocked out, topbar timer stops ticking, and shift total duration is calculated and locked.

**Acceptance Scenarios**:
1. **Given** an active shift,  
   **When** the staff member clicks "TIME OUT (SHIFT END)",  
   **Then** the active timer stops, the status switches to clocked out (`CURRENT STATUS: CLOCKED OUT`), and the shift is finalized with total duration recorded.
2. **Given** an active shift already in progress,  
   **When** the user clicks "TIME IN (SHIFT START)",  
   **Then** the system prevents duplicate punch and alerts the user that an active shift is already running.
3. **Given** no active shift,  
   **When** the user clicks "TIME OUT (SHIFT END)",  
   **Then** the system informs the user that there is no active shift to clock out from.

---

## Edge Cases

- **Rapid Multi-Clicking**: Multiple rapid clicks on "TIME IN" or "TIME OUT" are guarded by debouncing and atomic state transition guards.
- **Midnight Crossover / Multi-Day Shifts**: Shifts extending past midnight calculate total duration accurately across date boundaries based on epoch timestamps.
- **Tab Backgrounding**: If browser tab is minimized or backgrounded, `setInterval` drift is reconciled on wake-up using absolute wall-clock timestamps (`Date.now() - shiftStartTime`).
- **Offline / Network Reconnect**: Local reactive store preserves current session punch state and updates UI seamlessly.

---

## Requirements

### Functional Requirements

- **FR-001**: The system MUST render `#view-staff-clock` with a digital clock (`#liveClockDisplay`) showing local terminal time in 12-hour format (`hh:mm:ss A`) updating every second.
- **FR-002**: The system MUST provide distinct "TIME IN (SHIFT START)" and "TIME OUT (SHIFT END)" action buttons styled according to SWIFT semantic tokens (`bg-success` and `bg-danger`).
- **FR-003**: The system MUST display `#punchStatusBadge` reflecting `CURRENT STATUS: ON SHIFT` when clocked in, and `CURRENT STATUS: CLOCKED OUT` (or `OFF SHIFT`) when clocked out.
- **FR-004**: The system MUST provide a persistent topbar active shift timer (`#shiftTimerDisplay`) displaying `HH:MM:SS` that ticks continuously while on shift and retains state across client-side route transitions.
- **FR-005**: The system MUST enforce a duplicate punch guard that alerts the user and rejects duplicate clock-in attempts if a shift is already active.
- **FR-006**: The system MUST stop the duration counter upon clock-out and calculate the final duration formatted as `HHh MMm` (e.g., `04h 12m`).
- **FR-007**: All UI elements MUST strictly use SWIFT design tokens (`app/globals.css`, `lib/tokens.ts`) with zero hardcoded hex or default palette colors.

---

## Key Entities

- **StaffShiftSession**: Represents an active or completed employee work shift session:
  - `id`: Unique identifier (string / UUID)
  - `staffName`: Employee name (e.g., "Mike Morales")
  - `terminalId`: Terminal identifier (e.g., "Terminal #01 - Shop Floor")
  - `clockInTime`: Timestamp when shift started
  - `clockOutTime`: Timestamp when shift ended (or null if active)
  - `durationSeconds`: Total elapsed shift seconds
  - `status`: `'on_shift' | 'break' | 'completed' | 'idle'`

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Clock-in and clock-out actions execute and reflect in the UI in < 100ms.
- **SC-002**: `#liveClockDisplay` updates every 1,000ms ± 50ms with zero visual layout shift.
- **SC-003**: Topbar `#shiftTimerDisplay` persists duration across 100% of internal staff route navigations without resetting.
- **SC-004**: 100% of duplicate clock-in attempts while on shift are safely intercepted and blocked.
- **SC-005**: 100% compliance with SWIFT semantic design tokens and accessibility standards (WCAG 2.1 AA).

---

## Assumptions

- Terminal #01 operates in local shop floor time (Asia/Manila or host browser timezone).
- The staff terminal session uses authenticated profile `DEFAULT_STAFF_USER` ("Mike Morales") as established in SIAA-10.
- State is managed via reactive central store (`punch-store.ts`) synchronized with topbar and punch clock page.
