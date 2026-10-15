# Technical Implementation Plan: Terminal Digital Shift Punch Clock & Active Duration Counter

**Feature**: `029-terminal-digital-shift-punch-clock`  
**Feature Branch**: `feat/SIAA-29-terminal-digital-shift-punch-clock`  
**Jira Ticket**: [SIAA-29](https://the-three-devsketeers.atlassian.net/browse/SIAA-29) (STORY-5.2)  

---

## 1. Architecture & Component Hierarchy

```
app/staff/layout.tsx (Staff Layout)
└── components/staff/staff-layout-shell.tsx (Maintains global punchStore ticker)
    ├── components/staff/staff-topbar.tsx
    │   └── components/staff/shift-duration-timer.tsx (renders #shiftTimerDisplay via usePunchStore)
    ├── components/staff/staff-sidebar.tsx
    └── app/staff/clock/page.tsx (renders section #view-staff-clock)
        ├── components/staff/clock/terminal-live-clock.tsx (renders #liveClockDisplay)
        └── components/staff/clock/punch-clock-panel.tsx
            ├── #punchStatusBadge ("CURRENT STATUS: ON SHIFT" / "CURRENT STATUS: CLOCKED OUT")
            ├── "TIME IN (SHIFT START)" (btn-success)
            ├── "TIME OUT (SHIFT END)" (btn-danger)
            └── Duplicate Punch Alert dialog/banner
```

---

## 2. Implementation Steps

### Step 1: Global Shift Heartbeat in Staff Shell
- Update `components/staff/staff-layout-shell.tsx` (or custom hook `useStaffShiftHeartbeat`) to subscribe to `punchStore`.
- When `isShiftActive` is true, an interval invokes `punchStore.tickSecond()` every 1,000ms.
- Because `StaffLayoutShell` wraps all `/staff/*` pages, navigating between POS, Search, and Clock will not interrupt or re-initialize the interval.

### Step 2: Elevate `ShiftDurationTimer`
- Connect `ShiftDurationTimer` (`components/staff/shift-duration-timer.tsx`) directly to `usePunchStore()`.
- Ensure it renders:
  ```tsx
  <strong id="shiftTimerDisplay" className="font-mono font-bold text-text-primary text-sm tracking-wider">
    {formattedTimer}
  </strong>
  ```
- Ensure hydration mismatch safety with `useSyncExternalStore`.

### Step 3: Implement Terminal Live Clock
- Create `components/staff/clock/terminal-live-clock.tsx`.
- Displays current local time in 12-hour AM/PM format (e.g., `08:14:30 AM`).
- Element ID: `#liveClockDisplay`.
- Styled with semantic tokens: `font-mono text-4xl sm:text-5xl font-black text-text-primary tracking-widest`.
- Updates every 1,000ms with smooth hydration safety.

### Step 4: Implement Punch Clock Panel & Actions
- Create `components/staff/clock/punch-clock-panel.tsx`.
- Replicate `mockup/staff.html` lines 270-295:
  - Header: `TERMINAL DIGITAL TIME CLOCK`
  - Large live clock: `#liveClockDisplay`
  - Status badge: `#punchStatusBadge` (`CURRENT STATUS: ON SHIFT` / `CURRENT STATUS: CLOCKED OUT` or `OFF SHIFT`)
  - Primary buttons:
    - `TIME IN (SHIFT START)` (green, `bg-success`)
    - `TIME OUT (SHIFT END)` (red, `bg-danger`)
    - Optional: `Take Meal / Rest Break` (toggle break)
  - Duplicate Punch Guard:
    - If user clicks "TIME IN" while on shift: trigger alert "You are already clocked in for this shift!"
    - If user clicks "TIME OUT" while not on shift: trigger alert "No active shift to clock out from."
- Connect directly to `usePunchStore().clockIn()` and `usePunchStore().clockOut()`.

### Step 5: Update `app/staff/clock/page.tsx`
- Refactor `app/staff/clock/page.tsx` to mount `section#view-staff-clock`.
- Integrate `TerminalLiveClock` and `PunchClockPanel`.
- Preserve recent shift history table, binding to `punchLogs` from `usePunchStore`.

### Step 6: Automated Test Verification
- Write comprehensive Jest/RTL unit tests covering:
  - Live clock display and second ticking.
  - Clock in triggering shift start and topbar timer reset.
  - Clock out stopping timer and finalizing duration.
  - Duplicate punch guard alert when clicking time in while on shift.
  - Topbar duration continuity across route switches.

---

## 3. Mandatory Tokens & Constitution Review
- All background, text, border, and button colors MUST strictly use semantic tokens (`bg-success`, `bg-danger`, `bg-bg-surface`, `bg-bg-base`, `text-text-primary`, `text-text-muted`, `border-border`).
- Zero hardcoded hex, RGB, or non-token Tailwind classes.
