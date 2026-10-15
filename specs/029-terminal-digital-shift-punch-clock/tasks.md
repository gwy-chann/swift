# Tasks: Terminal Digital Shift Punch Clock & Active Duration Counter

**Input**: Design documents from `/specs/029-terminal-digital-shift-punch-clock/`  
**Prerequisites**: `spec.md`, `research.md`, `data-model.md`, `contracts/punch-clock-view.ts`, `plan.md`  
**Jira Ticket**: [SIAA-29](https://the-three-devsketeers.atlassian.net/browse/SIAA-29) (STORY-5.2)  

---

## Phase 1: Setup & View Contracts

**Purpose**: Establish type-safe UI contracts, validation schemas, and state interfaces for the punch clock view.

- [x] T001 Export UI contracts and validation schemas in `specs/029-terminal-digital-shift-punch-clock/contracts/punch-clock-view.ts` and sync with `lib/staff/types.ts`
- [x] T002 Verify `punchStore` in `lib/store/punch-store.ts` supports tickSecond, duplicate clockIn rejection, and formatted duration strings

---

## Phase 2: Global Shift Heartbeat & Topbar Timer Integration (User Story 3)

**Purpose**: Ensure active shift elapsed timer ticks continuously across the entire staff terminal layout without resetting on view transitions.

- [x] T003 Update `components/staff/shift-duration-timer.tsx` to consume `usePunchStore()` and render `<strong id="shiftTimerDisplay" ...>`
- [x] T004 Add global shift heartbeat hook / ticker in `components/staff/staff-layout-shell.tsx` calling `punchStore.tickSecond()` every 1,000ms while `isShiftActive` is true
- [x] T005 Write unit test in `lib/store/__tests__/punch-clock-view.test.ts` verifying `#shiftTimerDisplay` duration persistence and continuous second ticking

---

## Phase 3: Real-Time Terminal Digital Clock Display (User Story 1)

**Purpose**: Render high-contrast digital clock updating with 1-second precision in 12-hour format on the floor terminal.

- [x] T006 Create `components/staff/clock/terminal-live-clock.tsx` displaying current terminal time in 12-hour format with seconds (e.g., `08:14:30 AM`) with element id `liveClockDisplay`
- [x] T007 Write unit test in `lib/store/__tests__/punch-clock-view.test.ts` verifying `#liveClockDisplay` 12-hour time resolution and second ticking

---

## Phase 4: Shift Clock-In, Clock-Out & Duplicate Punch Guard (User Stories 2 & 4)

**Purpose**: Implement interactive punch panel replicating mockup/staff.html with TIME IN, TIME OUT, status badge, and duplicate punch guard.

- [x] T008 Create `components/staff/clock/punch-clock-panel.tsx` with `#punchStatusBadge`, action buttons `TIME IN (SHIFT START)` and `TIME OUT (SHIFT END)`, and alert dialog/banner for duplicate punch prevention
- [x] T009 Refactor `app/staff/clock/page.tsx` with section `#view-staff-clock`, incorporating `TerminalLiveClock`, `PunchClockPanel`, and reactive timesheet table linked to `punchStore`
- [x] T010 Write unit test coverage in `lib/store/__tests__/punch-clock-view.test.ts` verifying clock-in initiates shift, duplicate clock-in triggers alert, and clock-out finalizes shift duration

---

## Phase 5: Verification, Design Tokens & Constitution Convergence

**Purpose**: Confirm all acceptance criteria pass, full test suite passes, and constitution guidelines (zero hardcoded colors) are strictly met.

- [x] T011 Run typecheck (`npm run typecheck`), linting (`npm run lint`), and unit test suite (`npm test`) inside worktree
- [x] T012 Verify all 4 Jira acceptance scenarios against implementation and update tasks completion status
