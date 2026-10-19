# Tasks: Staff Punch Clock Shift Lifecycle Fixes (SIAA-75)

This document outlines the actionable, dependency-ordered tasks required to implement and verify the fixes for [SIAA-75](https://the-three-devsketeers.atlassian.net/browse/SIAA-75).

---

## Phase 1: Store & Data Baseline Adjustments (Foundation)

- [x] **TASK-101**: Update `lib/mock-data/logs.ts` baseline mock punch logs so `PUNCH-101` is finalized (`status: 'Completed'`, `timeOut: '12:12:45 PM'`) rather than an unclosed active shift.
- [x] **TASK-102**: Update `PunchStoreState` interface in `lib/store/punch-store.ts` to include `activeShiftId: string | null`.
- [x] **TASK-103**: Update `PunchStore` constructor in `lib/store/punch-store.ts` to initialize in `idle` / `CLOCKED OUT` state (`isShiftActive: false`, `activeShiftId: null`, `shiftSeconds: 0`, `shiftStatus: 'idle'`).
- [x] **TASK-104**: Update `clockIn` in `lib/store/punch-store.ts` to record `activeShiftId = newLog.id`.
- [x] **TASK-105**: Update `clockOut` in `lib/store/punch-store.ts` to accurately find and update the active shift by `activeShiftId` (or active status fallback), set its `timeOut` to real timestamp, set `duration`, and transition status to `'Completed'`. Clear `activeShiftId` and set `isShiftActive = false`.
- [x] **TASK-106**: Update `rehydrateShift` in `lib/store/punch-store.ts` to protect locally running active shifts when remote query returns `activeShift: null`.

---

## Phase 2: UI Component Rendering & Action Wiring

- [x] **TASK-201**: Update `components/staff/clock/attendance-history-table.tsx` to safely evaluate `isActive` ensuring completed rows always display their recorded `timeOut` and `duration`.
- [x] **TASK-202**: Update `components/staff/clock/punch-clock-panel.tsx` to handle `activeShiftId` and ensure notifications and state updates are in sync.

---

## Phase 3: Test Updates & New Lifecycle Verification Suite

- [x] **TASK-301**: Create `lib/store/__tests__/punch-store-lifecycle.test.ts` to comprehensively test:
  - Clean initial idle state (Defect 2)
  - Shift persistence across route transitions & rehydration with null (Defect 3)
  - Time-Out recording in attendance history logs (Defect 1)
- [x] **TASK-302**: Update existing unit tests (`punch-clock-view.test.ts`, `punch-store-guard.test.ts`, `attendance-history-table.test.ts`) to align with manual shift clock-in requirement.
- [x] **TASK-303**: Execute all tests (`npm test`) and TypeScript check (`npx tsc --noEmit`) to verify green status.

---

## Phase 4: Atomic Commits & PR Synthesis

- [ ] **TASK-401**: Commit Unit 1 (Specs): `docs(specs): [SIAA-75] add 8 canonical speckit artifacts for punch clock lifecycle fixes`
- [ ] **TASK-402**: Commit Unit 2 (Store & Models): `feat(staff): [SIAA-75] update punch store with activeShiftId, idle default state, and rehydration guards`
- [ ] **TASK-403**: Commit Unit 3 (UI Components): `feat(staff): [SIAA-75] fix attendance history table row active evaluation and clock panel shift ID wiring`
- [ ] **TASK-404**: Commit Unit 4 (Tests): `test(staff): [SIAA-75] add lifecycle persistence and time-out history tests and update baseline expectations`
- [ ] **TASK-405**: Push feature branch and create Pull Request via `gh pr create`.
