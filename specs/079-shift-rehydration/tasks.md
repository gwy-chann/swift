# Implementation Tasks: Shift Rehydration & Active Duration Persistence

**Feature**: `079-shift-rehydration`  
**Jira Issue**: [SIAA-79](https://the-three-devsketeers.atlassian.net/browse/SIAA-79)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5)  
**Status**: Ready for Implementation  

---

## Phase 1: Setup & Domain Contracts

- [ ] T001 Define Zod validation schemas and TypeScript contracts in `specs/079-shift-rehydration/contracts/shift-rehydration.ts`

---

## Phase 2: Client State Engine (`PunchStore`) Core Rehydration Upgrades

- [ ] T002 Implement authoritative UTC elapsed seconds calculation in `rehydrateShift()` in `lib/store/punch-store.ts`:
  - Calculate `Math.max(0, Math.floor((now - clockInMs) / 1000))` for `on_shift` status.
  - Preserve frozen `activeShift.duration_seconds` for `break` status.
- [ ] T003 Implement non-destructive hydration guard in `rehydrateShift()` in `lib/store/punch-store.ts`:
  - If incoming `activeShift` is `null` and local shift is active, do not wipe shift state or reset timer to idle.
- [ ] T004 Synchronize `staffSessions[profileId]` in `rehydrateShift()` in `lib/store/punch-store.ts`:
  - Update `staffSessions[profileId]` with `isShiftActive`, `activeShiftId`, `shiftStatus`, and `shiftSeconds`.
  - Ensure `clockOut()` can find the active session without throwing inactive shift error.
- [ ] T005 Implement active shift client storage persistence (`localStorage`) in `PunchStore`:
  - Save active shift state upon `clockIn`, `toggleBreak`, and `rehydrateShift`.
  - Restore active shift on store initialization if in-memory state is empty.
  - Clear cached active shift upon `clockOut`.
- [ ] T006 Expose `setActiveShiftId(shiftId: string)` in `PunchStore` and `usePunchStore`.

---

## Phase 3: Server Actions & Query Refinements

- [ ] T007 Update `getStaffAttendanceHistoryAction(limit?: number, profileId?: string)` in `lib/staff/actions.ts`:
  - Accept optional `profileId`.
  - When querying Supabase `staff_shifts`, filter or prioritize active shift for `profileId` (or fall back to first active shift).
  - In mock/offline mode, return active shift matching local mock state or null safely.

---

## Phase 4: UI Components & Route Wiring

- [ ] T008 Update `app/staff/clock/page.tsx`:
  - Pass `currentProfileId` into `getStaffAttendanceHistoryAction(20, currentProfileId)`.
  - Ensure rehydration is called with `res.activeShift` and logs without wiping state.
- [ ] T009 Update `components/staff/clock/punch-clock-panel.tsx`:
  - In `handleClockInPinSuccess`, sync returned `shiftId` from `clockInShiftAction` into `punchStore` via `setActiveShiftId`.
  - In `handleClockOut` and `handleToggleBreak`, pass real `activeShiftId` (removing hardcoded placeholder `00000000-0000-0000-0000-000000000000`).

---

## Phase 5: Automated Testing & Verification

- [ ] T010 [P] Update `lib/store/__tests__/punch-store-realtime.test.ts` and add `lib/store/__tests__/punch-store-rehydration.test.ts`:
  - Test authoritative dynamic elapsed duration calculation from UTC `clock_in`.
  - Test non-destructive hydration guard when `rehydrateShift(null)` is called while shift is active.
  - Test break status duration freeze.
  - Test multi-staff session rehydration and `staffSessions` synchronization.
  - Test clock out finalization with real shift ID.

---

## Phase 6: Quality Verification & Architectural Convergence

- [ ] T011 Run static type checking `npx tsc --noEmit` and resolve any type errors.
- [ ] T012 Run automated tests `npm test` and verify 100% pass rate.
- [ ] T013 Run code quality linter `npm run lint`.
- [ ] T014 Trigger Graphify knowledge graph auto-sync (`graphify-auto-sync`).
