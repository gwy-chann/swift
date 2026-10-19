# Architecture Research: Shift Rehydration & Active Duration Persistence

**Feature**: `079-shift-rehydration`  
**Jira Issue**: [SIAA-79](https://the-three-devsketeers.atlassian.net/browse/SIAA-79)  
**Date**: 2026-10-20  

---

## 1. Stack Constraints & Dependencies

- **Framework**: Next.js 15+ (App Router), React 19 (`useSyncExternalStore`, Client Component boundary)
- **Database & Backend**: PostgreSQL via Supabase RPCs and tables (`public.staff_shifts`), Server Actions (`"use server"` in `lib/staff/actions.ts`), Next.js cache revalidation (`updateTag('staff-shifts')`).
- **Styling**: Tailwind CSS v4 using semantic design tokens (`bg-bg-surface`, `bg-bg-card`, `text-text-primary`, `border-border`, `bg-primary`, `bg-success-light`, `text-success`). Zero hardcoded hex/rgb.
- **State Engines**:
  - `usePunchStore` (`lib/store/punch-store.ts`): External store maintaining staff attendance state, multi-staff active shifts, duration timers, and punch logs.
- **Reference Assets**:
  - `../mockup/staff.html`: Staff Shop Floor Terminal, punch clock layout.
  - `../mockup/app.js`: Reactive shift state and timer calculation.
  - `../docs/features.md`: Section 6 & 8 (Staff Terminal & Time Clock).

---

## 2. Problem Diagnosis & Architecture Analysis

### Issue A: In-Memory Volatility on Browser Refresh (F5)
When the browser page is reloaded, JavaScript memory is re-initialized. `PunchStore` resets to default values (`isShiftActive: false, shiftSeconds: 0, activeShiftId: null`).
On mount, `StaffClockPage` executes `getStaffAttendanceHistoryAction()`:
```ts
getStaffAttendanceHistoryAction()
  .then((res) => {
    if (res.success) {
      rehydrateShift(res.activeShift, res.logs);
    }
  });
```

### Issue B: Destructive Hydration Wipe
In `punchStore.rehydrateShift(activeShift, recentLogs, nowTimestamp)`:
```ts
} else if (!this.state.isShiftActive) {
  // Remote returned activeShift === null and local shift is inactive
  isShiftActive = false;
  activeShiftId = null;
  shiftStatus = 'idle';
  shiftSeconds = 0;
}
```
If an active shift was running locally (or cached in `localStorage` / store) and `activeShift` is `null` (e.g. initial server query returned null or query failed), the local shift could be wiped.
Furthermore, in mock/offline mode, `getStaffAttendanceHistoryAction()` returned `activeShift: null` hardcoded. Therefore, in offline or non-Supabase modes, refreshing F5 guaranteed the loss of active shift state unless an offline/local persistence cache is in place.

### Issue C: Staff Session Map Desynchronization
In `PunchStore`, multi-operator kiosk support tracks `staffSessions: Record<string, StaffMemberShiftState>`.
`rehydrateShift` updated top-level store state (`this.state.isShiftActive`, `this.state.shiftSeconds`, `this.state.activeShiftId`), but failed to update `this.state.staffSessions[targetProfileId]`.
When the employee clicked clock-out, `punchStore.clockOut()` inspected `this.state.staffSessions[targetProfileId]`, which still had `isShiftActive: false` from the constructor, causing `clockOut` to throw an uncaught exception (`Shift has already been clocked out or is not active`).

### Issue D: Shift ID Forwarding and Hardcoded Placeholder
In `PunchClockPanel`:
```ts
const currentShiftId = activeShiftId || "00000000-0000-0000-0000-000000000000";
```
When `activeShiftId` was unset or lost, the hardcoded placeholder was dispatched to `clockOutShiftAction` and `toggleShiftBreakAction`, preventing clean DB transition. Moreover, when `clockInShiftAction` creates a row, its returned `shiftId` should be synced back to `punchStore` so `activeShiftId` holds the authoritative UUID.

---

## 3. Architecture Decisions (ADRs)

### ADR-1: Authoritative UTC Elapsed Duration Engine
- **Decision**: In `punchStore.rehydrateShift()`, when `activeShift.status === 'on_shift'`, compute:
  ```ts
  const clockInMs = new Date(activeShift.clock_in).getTime();
  const elapsed = Math.max(0, Math.floor((now - clockInMs) / 1000));
  ```
- **Rationale**: Eliminates stopwatch drift across browser refreshes and guarantees clock accuracy down to the second against the DB timestamp.

### ADR-2: Non-Destructive Hydration Guard & Local Persistence
- **Decision**: 
  1. Add a non-destructive guard: If local store has an active shift (`this.state.isShiftActive === true`) and incoming `activeShift` is `null`, do NOT wipe the shift to `idle`.
  2. Implement client storage persistence (`localStorage.getItem('swift_active_shift')` and `localStorage.setItem`) for offline/fallback continuity across browser refreshes.
- **Rationale**: Prevents accidental shift loss when reloading during intermittent network disconnects or in local demo modes.

### ADR-3: Multi-Staff Session Rehydration Synchronization
- **Decision**: When `rehydrateShift` runs, resolve `targetProfileId` (from `activeShift.profile_id` or `this.state.currentProfileId`) and update both the top-level store state and `this.state.staffSessions[targetProfileId]`.
- **Rationale**: Ensures `clockOut()` and `toggleBreak()` read the valid active session and complete without throwing false inactive shift errors.

### ADR-4: Authoritative Active Shift ID Retention
- **Decision**:
  1. Update `PunchClockPanel.handleClockInPinSuccess` to update `activeShiftId` in `punchStore` with the DB UUID returned by `clockInShiftAction`.
  2. In `handleClockOut` and `handleToggleBreak`, pass the real `activeShiftId` directly without the placeholder fallback UUID.
- **Rationale**: Ensures Supabase RPCs `clock_out_shift` and `toggle_shift_break` receive genuine shift IDs.
