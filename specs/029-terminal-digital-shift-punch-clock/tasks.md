# Tasks: Terminal Digital Shift Punch Clock & Active Duration Counter

**Input**: Design documents from `/specs/029-terminal-digital-shift-punch-clock/`  
**Prerequisites**: `spec.md`, `research.md`, `data-model.md`, `contracts/punch-clock-view.ts`, `plan.md`  
**Jira Ticket**: [SIAA-29](https://the-three-devsketeers.atlassian.net/browse/SIAA-29) (STORY-5.2)  

---

## Phase 1: Setup & View Contracts

**Purpose**: Establish type-safe UI contracts, validation schemas, and state interfaces for the punch clock view.

- [ ] T001 Export UI contracts and validation schemas in `specs/029-terminal-digital-shift-punch-clock/contracts/punch-clock-view.ts` and sync with `lib/staff/types.ts`
- [ ] T002 Verify `punchStore` in `lib/store/punch-store.ts` supports tickSecond, duplicate clockIn rejection, and formatted duration strings

---

## Phase 2: Global Shift Heartbeat & Topbar Timer Integration (User Story 3)

**Purpose**: Ensure active shift elapsed timer ticks continuously across the entire staff terminal layout without resetting on view transitions.

- [ ] T003 Update `components/staff/shift-duration-timer.tsx` to consume `usePunchStore()` and render `<strong id="shiftTimerDisplay" ...>`
- [ ] T004 Add global shift heartbeat hook / ticker in `components/staff/staff-layout-shell.tsx` calling `punchStore.tickSecond()` every 1,000ms while `isShiftActive` is true
- [ ] T005 Write unit test in `components/staff/__tests__/shift-duration-timer.test.tsx` verifying `#shiftTimerDisplay` renders store duration and ticks continuously

---

## Phase 3: Real-Time Terminal Digital Clock Display (User Story 1)

**Purpose**: Render high-contrast digital clock updating with 1-second precision in 12-hour format on the floor terminal.

- [ ] T006 Create `components/staff/clock/terminal-live-clock.tsx` displaying current terminal time in 12-hour format with seconds (e.g., `08:14:30 AM`) with element id `liveClockDisplay`
- [ ] T007 Write unit test in `components/staff/clock/__tests__/terminal-live-clock.test.tsx` verifying `#liveClockDisplay` renders 12-hour time and ticks every second

---

## Phase 4: Shift Clock-In, Clock-Out & Duplicate Punch Guard (User Stories 2 & 4)

**Purpose**: Implement interactive punch panel replicating mockup/staff.html with TIME IN, TIME OUT, status badge, and duplicate punch guard.

- [ ] T008 Create `components/staff/clock/punch-clock-panel.tsx` with `#punchStatusBadge`, action buttons `TIME IN (SHIFT START)` and `TIME OUT (SHIFT END)`, and alert dialog/banner for duplicate punch prevention
- [ ] T009 Refactor `app/staff/clock/page.tsx` with section `#view-staff-clock`, incorporating `TerminalLiveClock`, `PunchClockPanel`, and reactive timesheet table linked to `punchStore`
- [ ] T010 Write integration tests in `app/staff/clock/__tests__/page.test.tsx` verifying clock-in initiates shift, duplicate clock-in triggers alert, and clock-out finalizes shift duration

---

## Phase 5: Verification, Design Tokens & Constitution Convergence

**Purpose**: Confirm all acceptance criteria pass, full test suite passes, and constitution guidelines (zero hardcoded colors) are strictly met.

- [ ] T011 Run typecheck (`npm run typecheck`), linting (`npm run lint`), and unit test suite (`npm test`) inside worktree
- [ ] T012 Verify all 4 Jira acceptance scenarios against implementation and update tasks completion status
