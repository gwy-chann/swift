# Feature Specification: Admin Staff Shift Attendance & Time-In/Time-Out History

**Feature Branch**: `099-admin-staff-attendance-history`

**Created**: 2026-10-25

**Status**: Draft

**Input**: User description: "CREATE A DEDICATED PAGE IN ADMIN ACCOUNT THAT WILL SHOW THE TIME IN AND TIME OUT HISTORY OF THE STAFFS MAKE SURE THAT IT ACTUALLY WORKS"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Centralized Staff Attendance History Ledger (Priority: P1)

As a Store Administrator or Store Manager,  
I want a dedicated "Staff Attendance" navigation item and page within the Admin Portal that displays the complete, chronological time-in and time-out history of all shop floor employees,  
so that I can oversee store staffing, audit work hours, verify attendance compliance, and resolve shift disputes with verified records.

**Why this priority**: Store administrators currently lack a dedicated view across all staff shifts in the admin portal. Providing an authoritative, full-visibility ledger across all employees is the fundamental core capability requested by the business.

**Independent Test**: Navigate to the Admin Portal, click the "Staff Attendance" item in the sidebar navigation, and verify that the page loads a comprehensive table displaying all staff shift entries showing employee name, shift date, time-in, time-out, calculated shift duration, terminal ID, and current status.

**Acceptance Scenarios**:

1. **Given** an authenticated administrator navigating the Admin Portal, **When** they click "Staff Attendance" in the sidebar navigation menu, **Then** the browser routes to the dedicated attendance history page and highlights the active menu item.
2. **Given** the staff attendance page has loaded with existing shift records, **When** the ledger renders, **Then** it presents an itemized list sorted in reverse chronological order (newest shifts first) with columns: Staff Member, Date, Time-In, Time-Out, Duration, Terminal, and Status.
3. **Given** shifts completed across previous days, **When** examining the table rows, **Then** each completed shift displays the exact time-in timestamp, exact time-out timestamp, and accurate total duration (e.g., "08h 15m").

---

### User Story 2 - Real-Time Active Shift Tracking & On-Duty Status (Priority: P1)

As an Administrator monitoring live shop floor staffing,  
I want the attendance ledger to prominently highlight currently active shifts and in-progress meal/rest breaks,  
so that I can immediately identify who is on the clock, who is currently on break, and who has completed their shift for the day.

**Why this priority**: Shift oversight requires immediate operational awareness of who is actively present on the sales floor or in service bays without requiring phone calls or manual roll calls.

**Independent Test**: Have a staff member clock in at a terminal. Verify that their row immediately reflects "On Shift" with an active status badge, displays "-- Active Shift --" in place of a fixed time-out timestamp, and tracks elapsed active time.

**Acceptance Scenarios**:

1. **Given** an employee who is currently clocked in and working on the shop floor, **When** viewing the attendance ledger, **Then** their record displays an "On Shift" badge with active status indicators, and the Time-Out column displays an active status placeholder rather than an empty or missing value.
2. **Given** an employee who is currently on a designated break, **When** viewing the attendance ledger, **Then** their record displays a distinctive "Break" badge with elapsed break duration indicators.
3. **Given** an active employee who clocks out at their floor terminal, **When** the admin attendance page updates, **Then** the record transitions to "Completed", the final time-out timestamp is recorded, and the total duration is finalized.

---

### User Story 3 - Multi-Dimensional Search, Staff Filter, and Date Range Selection (Priority: P2)

As a Store Administrator or Payroll Auditor,  
I want to filter the shift history by specific staff members, shift status, and calendar date ranges, as well as search by employee name,  
so that I can quickly inspect a single employee's attendance record over a pay period or review all shifts on a specific busy operational day.

**Why this priority**: As shift records accumulate, administrators need rapid filtering tools to audit payroll periods, investigate discrepancies, or isolate individual records without scrolling through hundreds of entries.

**Independent Test**: Select a specific employee from the staff filter dropdown and choose "This Week" on the date range selector. Verify that the table updates to display only records matching that employee within the selected date boundary.

**Acceptance Scenarios**:

1. **Given** a large list of historical shifts, **When** the administrator types a staff member's name into the search bar, **Then** the table immediately filters to show only matching records.
2. **Given** the attendance ledger view, **When** the administrator selects a status filter (e.g., "On Shift", "Break", or "Completed"), **Then** only shifts with that exact status are presented.
3. **Given** a date range selection (e.g., "Today", "Yesterday", "Last 7 Days", "Last 30 Days", or "Custom Date Range"), **When** applied, **Then** the ledger restricts results to shifts with clock-in dates within the specified timeframe.
4. **Given** active search or filter criteria, **When** the administrator clicks "Reset Filters", **Then** all filters return to their defaults and the full shift log is restored.

---

### User Story 4 - High-Level Shift Attendance Summary & Operational Metrics (Priority: P3)

As a Store Administrator or Store Owner,  
I want to see summary KPI cards at the top of the attendance page summarizing today's staffing numbers (Total Shifts Today, Currently On Shift, On Break, and Total Hours Logged Today),  
so that I can evaluate daily labor allocation and coverage at a glance.

**Why this priority**: Executive and managerial users need rapid operational summaries before drilling down into detailed line-by-line shift logs.

**Independent Test**: Load the attendance page and verify that summary cards render at the top showing accurate counts for active staff, staff on break, completed shifts for the day, and aggregate hours worked today.

**Acceptance Scenarios**:

1. **Given** shifts logged for the current calendar date, **When** viewing the page header, **Then** summary cards display:
   - "Currently On Shift": Count of all workers with active, unclosed shifts.
   - "On Break": Count of all workers currently on a paused break state.
   - "Completed Today": Count of shifts ended during today's operating hours.
   - "Total Logged Hours Today": Aggregate sum of all shift durations recorded for the day.
2. **Given** a staff member punches in or out on the terminal, **When** the admin ledger updates, **Then** the summary metric cards reflect the adjusted staffing totals.

---

### Edge Cases

- **Zero Attendance History**: When the store has no recorded shifts (e.g., fresh system installation or clean filter with no matches), the page must display an informative, accessible empty state ("No shift attendance records found") with an option to reset filters rather than a broken layout.
- **Overnight Shifts (Crossing Midnight)**: When an employee clocks in before midnight (e.g., 10:00 PM) and clocks out the following morning (e.g., 6:00 AM), duration calculations must accurately reflect elapsed hours without producing negative durations or date display errors.
- **Concurrent Shifts Across Multiple Terminals**: Multiple employees clocking in or out at the same second across different physical terminals must all be recorded with accurate terminal identifiers without lock contention or lost entries.
- **Long-Running or Forgotten Clock-Outs**: If an employee forgets to clock out and a shift exceeds normal operational bounds (e.g., > 16 hours), the system must flag the shift with an "Extended Shift / Needs Review" warning indicator so the administrator can investigate.
- **Network Glitch or Refresh Resilience**: If an administrator leaves the tab open, refreshing the page or navigating back and forth must retain search and date filter state or cleanly rehydrate the latest database records without crashing.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated route and page in the Admin Portal located at `/admin/attendance` accessible to administrators and store managers.
- **FR-002**: System MUST add a "Staff Attendance" navigation item under the "Administration" section in the Admin Sidebar menu with an appropriate clock/calendar icon and active state highlighting.
- **FR-003**: System MUST display an itemized tabular ledger containing all historical and active staff shifts sorted in reverse chronological order (newest clock-in timestamp first).
- **FR-004**: Each ledger row MUST display:
  - Staff Member Name and Role
  - Shift Date (formatted `YYYY-MM-DD`, with `(Today)` indicator for the current calendar date)
  - Time-In (formatted with hours, minutes, seconds, and AM/PM indicator)
  - Time-Out (formatted timestamp for closed shifts, or `-- Active Shift --` for in-progress shifts)
  - Shift Duration (formatted as `XXh YYm`, calculated from time-in to time-out or current elapsed time)
  - Terminal Identifier (e.g., "Terminal #1", "Shop Floor Kiosk")
  - Shift Status Badge ("On Shift", "Break", or "Completed")
- **FR-005**: Status badges MUST strictly follow semantic design tokens:
  - "On Shift": Success semantic token styling
  - "Break": Warning/Accent semantic token styling
  - "Completed": Neutral/Muted semantic token styling
  - "Extended Shift": Danger/Alert semantic token styling when shift duration exceeds 16 hours
- **FR-006**: System MUST provide instant text search filtering by employee name.
- **FR-007**: System MUST provide status filtering allowing administrators to isolate "All", "On Shift", "Break", or "Completed" records.
- **FR-008**: System MUST provide date filtering with quick presets ("Today", "Yesterday", "Last 7 Days", "Last 30 Days", "All Time") as well as custom date range selection.
- **FR-009**: System MUST display summary metric cards above the ledger showing:
  - Active Staff On Duty
  - Staff Currently on Break
  - Total Shifts Completed Today
  - Total Hours Worked Today
- **FR-010**: System MUST provide a manual "Refresh" button as well as automatic revalidation to ensure administrators view up-to-date shift data from floor terminals.
- **FR-011**: System MUST support paginated or cleanly structured scrolling to handle large numbers of shift records efficiently.
- **FR-012**: System MUST enforce authorization guards ensuring only authenticated users with administrative or managerial roles can view the page.

### Key Entities

- **StaffShiftRecord**:
  - `id`: Unique identifier of the shift record (UUID or system identifier)
  - `staffId`: Reference to the employee profile
  - `staffName`: Full display name of the employee
  - `staffRole`: Assigned role of the employee (e.g., Cashier, Mechanic, Floor Staff, Manager)
  - `clockIn`: Full ISO timestamp representing the moment of time-in
  - `clockOut`: Full ISO timestamp representing the moment of time-out (or null if currently on shift)
  - `totalBreakMinutes`: Cumulative duration of taken breaks during the shift
  - `durationMinutes`: Net elapsed working duration in minutes
  - `status`: Current lifecycle state (`on_shift`, `break`, `completed`)
  - `terminalId`: Physical terminal or kiosk device code where the shift was opened
- **ShiftAttendanceMetrics**:
  - `currentlyOnShift`: Total count of staff members with active open shifts
  - `currentlyOnBreak`: Total count of staff members with active break status
  - `shiftsCompletedToday`: Total count of completed shifts recorded on the current date
  - `totalHoursLoggedToday`: Sum of total working hours completed on the current date
- **AttendanceFilterCriteria**:
  - `searchTerm`: Optional text query matching staff name
  - `status`: Optional filter for shift lifecycle state
  - `dateRange`: Date boundary filter (start date and end date)
  - `staffId`: Optional filter for a specific employee

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Administrators can view the dedicated Staff Attendance page within 2 seconds of clicking the navigation item.
- **SC-002**: 100% of staff punch events (time-in, break start, break end, time-out) performed at any shop terminal appear in the admin attendance ledger upon data load/refresh.
- **SC-003**: Shift duration calculations match exact elapsed time between time-in and time-out minus breaks with 100% mathematical accuracy.
- **SC-004**: Filtering by employee, status, or date range updates the displayed table in under 300 milliseconds.
- **SC-005**: 100% adherence to SWIFT semantic design tokens with zero hardcoded color values across all page components in both light and dark modes.
- **SC-006**: Page achieves full accessibility compliance (WCAG AA), including semantic table markup, keyboard focus states, and screen-reader accessible status badges.

## Assumptions

- Shift data is stored in and retrieved from the central `staff_shifts` data repository populated by shop floor terminals.
- The Admin Portal layout (`components/admin/admin-layout-shell.tsx`) provides standard shell framing, topbar, and sidebar navigation into which this new view integrates.
- Standard working shifts are recorded in local shop timezone with timestamps stored in ISO UTC format.
- Administrators review attendance history primarily in read-only and auditing capacities; manual shift correction or retro-adjustment workflows may be added as future administrative actions.
- The existing authentication and role-based session system identifies admin accounts to grant access to `/admin/attendance`.
