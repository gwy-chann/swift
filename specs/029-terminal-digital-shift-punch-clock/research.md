# Research & Architecture Decisions: Terminal Digital Shift Punch Clock

**Feature**: `029-terminal-digital-shift-punch-clock`  
**Jira Ticket**: [SIAA-29](https://the-three-devsketeers.atlassian.net/browse/SIAA-29) (STORY-5.2)  

---

## 1. Context & Architectural Analysis

### Mockup Reference (`mockup/staff.html` & `mockup/app.js`)
In the reference prototype:
- View section is `#view-staff-clock`.
- Digital clock is rendered in `#liveClockDisplay` in 12-hour AM/PM format (`08:14:30 AM`) with a 1-second tick interval.
- Punch status badge renders `CURRENT STATUS: ON SHIFT` (in `badge-success`) or `CURRENT STATUS: CLOCKED OUT` / `OFF SHIFT`.
- Action buttons:
  - `TIME IN (SHIFT START)` (green / `btn-success`)
  - `TIME OUT (SHIFT END)` (red / `btn-danger`)
- Topbar quick indicator contains `#shiftTimerDisplay` displaying `04:12:30` (`HH:MM:SS`) that increments every second.
- Duplicate punch prevention:
  - When `isShiftActive` is true, clicking "TIME IN" triggers an alert: *"You are already clocked in for this shift!"*.
  - When `isShiftActive` is false, clicking "TIME OUT" triggers an alert: *"No active shift to clock out from."*.

---

## 2. State Architecture & Single Source of Truth

### Store Integration (`lib/store/punch-store.ts`)
The repository already contains `PunchStore` (`usePunchStore`), which provides:
- `isShiftActive: boolean`
- `shiftSeconds: number`
- `shiftStatus: 'on_shift' | 'break' | 'completed' | 'idle'`
- `clockIn(staff?, terminalId?)`
- `clockOut(staff?)`
- `toggleBreak()`
- `tickSecond()`
- `lastError`

### Navigation Persistence & Layout Hook
To ensure the active shift duration counter `#shiftTimerDisplay` increments continuously across view transitions without resetting:
1. `StaffLayoutShell` (`components/staff/staff-layout-shell.tsx`) or a shift heartbeat hook (`useShiftTicker`) will maintain the 1-second `punchStore.tickSecond()` interval while `isShiftActive` is true.
2. `ShiftDurationTimer` (`components/staff/shift-duration-timer.tsx`) will consume `usePunchStore().formattedTimer` and `isShiftActive`, rendering `<strong id="shiftTimerDisplay" ...>`.
3. Navigating between `/staff/clock`, `/staff/pos`, `/staff/search`, etc. will NEVER reset elapsed shift seconds.

---

## 3. UI Component Structure & Token Mapping

### Design Tokens
- Container: `bg-bg-surface border-border rounded-xl shadow-xs`
- Clock Display: `font-mono text-4xl sm:text-5xl font-black text-text-primary tracking-widest`
- Status Badge:
  - Active: `bg-success-light text-success border-success/30`
  - Inactive: `bg-bg-muted text-text-muted border-border`
- Buttons:
  - Clock In: `bg-success hover:bg-success/90 text-white`
  - Clock Out: `bg-danger hover:bg-danger/90 text-white`
  - Break: `bg-bg-base hover:bg-bg-hover text-text-secondary border-border`
- Alerts:
  - Accessible banner / toast / dialog for duplicate punch notifications ("You are already clocked in for this shift!").

---

## 4. Verification & Testing Strategy

- **Unit Tests**:
  - Test `ShiftDurationTimer` renders `#shiftTimerDisplay` and consumes store time.
  - Test `PunchClockPanel` / `StaffClockPage` renders `#liveClockDisplay`, `#punchStatusBadge`, and buttons.
  - Test clock-in initializes timer, sets status to "ON SHIFT", and updates topbar timer.
  - Test duplicate clock-in triggers alert/guard.
  - Test clock-out finalizes shift and pauses topbar counter.
- **End-to-End & Integration**:
  - Navigate across staff tabs and verify duration continuity.
