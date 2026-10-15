# Feature Specification: Staff Shift Attendance Log History & Timesheet Tracking

**Feature Branch**: `feat/SIAA-30-staff-shift-attendance-log-history`  
**Created**: 2026-10-15  
**Status**: Ready for Implementation  
**Jira Ticket**: [SIAA-30](https://the-three-devsketeers.atlassian.net/browse/SIAA-30) (STORY-5.3)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  
**Input**: `/speckit https://the-three-devsketeers.atlassian.net/browse/SIAA-30`

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Itemized Attendance Log History Rendering (Priority: P1)

As a Shop Floor Staff Member or Store Manager,  
I want to view an itemized attendance log of past and active shifts with exact timestamps and calculated durations,  
so that staff can verify their logged hours and management can audit shift attendance transparency.

**Why this priority**: Immediate transparency over daily and historical shifts prevents payroll disputes, provides proof of work on the shop terminal, and fulfills the core attendance requirements for shop floor operations.

**Independent Test**: Navigate to `/staff/clock` on the floor terminal. Verify that the "My Attendance & Shift Log History" table renders all past and active shift records with columns: Date, Staff Name, Time-In, Time-Out, Shift Duration, and Status.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Attendance Log History Rendering
  Given an authenticated staff member on the Punch Clock view ("/staff/clock")
  When viewing the "My Attendance & Shift Log History" table
  Then it renders records with columns: Date, Staff Name, Time-In, Time-Out, Shift Duration, and Status
  And headers follow SWIFT design token typography and styling
```

---

### User Story 2 - Dynamic Append and Duration Calculation on Shift Completion (Priority: P1)

As a Staff Member ending my shift,  
I want the attendance log to dynamically update upon clocking out via "TIME OUT (SHIFT END)",  
so that my clock-out time is stamped, the total shift duration is computed and displayed (e.g. `08h 59m`), and the status switches to "Completed".

**Why this priority**: When a worker clocks out at the end of their shift, immediate and accurate calculation of worked hours without manual refresh is critical for staff peace of mind and audit records.

**Independent Test**: While an active shift is in progress on `/staff/clock`, trigger "TIME OUT (SHIFT END)". Verify that the row's Time-Out column updates with the exact timestamp (e.g., `05:01:45 PM`), the Shift Duration computes formatted elapsed time (`08h 59m`), and the Status badge transitions from "On Shift" to "Completed" with neutral badge tokens.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Dynamic Append on Shift Completion
  Given an active shift is timed out via "TIME OUT (SHIFT END)"
  When the shift end event confirms
  Then the active record updates Time-Out with the exact timestamp (hh:mm:ss AM/PM)
  And computes the final shift duration in standard format (e.g. "08h 59m")
  And transitions Status from "On Shift" to "Completed" (neutral badge)
```

---

### User Story 3 - Active Shift Indication in History Table (Priority: P1)

As a Shop Floor Staff Member currently on duty,  
I want the attendance history table to clearly distinguish my ongoing shift from finalized shifts,  
so that I can easily recognize that my current shift is open and actively recording duration.

**Why this priority**: Prevents confusion as to whether a shift is currently running or accidentally closed, eliminating double clock-in attempts.

**Independent Test**: Clock in to start a shift. In the attendance table, verify that the first row displays `-- Active Shift --` in the Time-Out column using token `text-accent`, and the Status column displays a green `On Shift` badge (`bg-success-light text-success`).

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Active Shift Indication in History
  Given a currently active shift (clocked in)
  When rendered in the attendance table
  Then the Time-Out column displays "-- Active Shift --" in warning accent color
  And the Status displays a green "On Shift" badge
```

---

### User Story 4 - Chronological Ordering & Multi-Day Persistence (Priority: P2)

As a Shop Floor Staff Member or Store Auditor,  
I want shift records across consecutive days to remain persisted and displayed in reverse chronological order,  
so that the newest shifts always appear at the top with standardized ISO/friendly date formats.

**Why this priority**: Staff and supervisors need to quickly see today's shift followed by yesterday's and earlier shifts without paging through historical clutter.

**Independent Test**: Load the attendance table with shift logs across multiple consecutive dates (`2026-09-26`, `2026-09-27`, `2026-09-28`). Verify that rows are ordered with the newest date on top, formatted as `YYYY-MM-DD` (or `YYYY-MM-DD (Today)`), and persist across terminal sessions.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Chronological Ordering & Multi-Day Persistence
  Given multiple past shift punch records across consecutive days
  When the table populates
  Then entries are sorted in reverse chronological order (newest shift on top)
  And dates are formatted consistently using "YYYY-MM-DD" with "(Today)" annotation for the current calendar date
```

---

## Edge Cases

- **Zero Attendance Records**: When a staff member has no logged shifts (e.g., brand new employee or clean install), the table renders an accessible empty state ("No shift attendance records found") instead of a broken empty table.
- **Midnight Rollover (Overnight Shift)**: When a shift spans past midnight, duration calculation correctly calculates elapsed hours and minutes without producing negative durations.
- **Realtime Remote Clock-Out Sync**: If a staff member is clocked out from another station or administrative override, the local attendance table reflects the updated status and duration reactively via store subscription.
- **Offline Mode Fallback**: If connection to the remote Supabase database drops, local store (`usePunchStore` / `localStorage`) retains attendance history and continues rendering without UI crashes.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST render an itemized "My Attendance & Shift Log History" table on the `/staff/clock` page matching `#view-staff-clock` in `../mockup/staff.html`.
- **FR-002**: Table MUST include 6 distinct columns: Date, Staff Name, Time-In, Time-Out, Shift Duration, and Status.
- **FR-003**: System MUST display `-- Active Shift --` in `text-accent` for shifts currently in progress.
- **FR-004**: System MUST transition an active shift to "Completed" upon clock-out event, computing duration formatted as `XXh YYm`.
- **FR-005**: System MUST sort attendance records in reverse chronological order (newest date and time on top).
- **FR-006**: Status badges MUST strictly follow SWIFT semantic design tokens:
  - "On Shift": `bg-success-light text-success border border-success/20`
  - "Completed": `bg-bg-muted text-text-secondary border border-border`
  - "Break": `bg-accent-light text-accent border border-accent/20`
- **FR-007**: Table MUST support dynamic data binding with reactive updates from `usePunchStore()` and server action `getStaffAttendanceHistoryAction()`.
- **FR-008**: System MUST display date format `YYYY-MM-DD` with an optional `(Today)` suffix for shifts occurring on the current calendar date.

### Key Entities

- **PunchLog (Staff Shift Attendance Record)**:
  - `id`: Unique identifier (e.g., `PUNCH-1729000000000` or UUID)
  - `date`: Date string formatted as `YYYY-MM-DD`
  - `staff`: Name of the employee (e.g., `Mike Morales`)
  - `timeIn`: Formatted time string (e.g., `08:00:15 AM`)
  - `timeOut`: Formatted time string (e.g., `05:01:45 PM`) or `-- Active Shift --`
  - `duration`: Calculated duration string (e.g., `08h 59m` or `04h 12m`)
  - `status`: Shift status (`'On Shift' | 'Completed' | 'Break'`)

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Attendance table renders within 50ms upon navigation to `/staff/clock`.
- **SC-002**: 100% of shift end punch actions dynamically update the table and compute exact duration without requiring a page reload.
- **SC-003**: 0 hardcoded colors across table components, achieving 100% adherence to SWIFT semantic tokens in light and dark mode.
- **SC-004**: Automated unit and component tests achieve 100% pass rate for all 4 Jira acceptance scenarios.

---

## Assumptions

- Staff users access the attendance table primarily via the `/staff/clock` view on shop floor terminals and tablets.
- When working offline, `usePunchStore` provides optimistic updates and persists history to client-side memory/storage.
- The shift duration display format follows `XXh YYm` as established in `mockup/app.js` and `mockup/staff.html`.
- Shift records in database table `public.staff_shifts` map cleanly to the UI `PunchLog` representation.
