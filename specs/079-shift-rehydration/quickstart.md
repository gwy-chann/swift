# Quickstart Verification Guide: Shift Rehydration

**Feature**: `079-shift-rehydration`  
**Jira Issue**: [SIAA-79](https://the-three-devsketeers.atlassian.net/browse/SIAA-79)  
**Date**: 2026-10-20  

---

## 1. Automated Test Execution

Inside the worktree (`.worktrees/SIAA-79-shift-rehydration`), run:
```bash
npm test lib/store/__tests__/punch-store-realtime.test.ts
npm test lib/store/__tests__/punch-store-rehydration.test.ts
npx tsc --noEmit
npm run lint
```

---

## 2. Interactive Verification Scenarios

### Scenario A: Shift Persistence Across Page Reload (F5)
1. Navigate to `/staff/clock` on the Staff Portal.
2. Ensure an employee (e.g. `Mike Morales`) is selected.
3. Click **"TIME IN (SHIFT START)"** and enter PIN `1234`.
4. Observe the timer ticking (e.g., reaching `00:00:15`).
5. Press **F5** (or reload the browser tab).
6. Verify:
   - Status badge immediately indicates **"CURRENT STATUS: ON SHIFT"**.
   - Timer does NOT reset to `00:00:00` or revert to idle.
   - Timer calculates elapsed time from the original clock-in timestamp and continues ticking upward.
   - Attendance history reflects the active shift.

### Scenario B: Non-Destructive Hydration Guard (Offline / Fallback Resilience)
1. With an active shift running, simulate offline mode or delayed server action response.
2. Reload `/staff/clock`.
3. Verify:
   - When server action returns `activeShift: null` or network is slow, local active shift state is NOT wiped.
   - Status remains **"ON SHIFT"** and active shift ID is preserved.

### Scenario C: Clock-Out with Genuine Shift ID
1. On an active rehydrated shift, click **"TIME OUT (SHIFT END)"**.
2. Verify:
   - `clockOutShiftAction` is called with the actual active shift UUID (not `00000000-0000-0000-0000-000000000000`).
   - Store transitions to `completed` and then `idle`.
   - Timer halts cleanly.
   - Completed shift row is added to the timesheet history.

### Scenario D: Multi-Staff Operator Rehydration
1. Clock in as `Mike Morales`.
2. Switch operator to `Dante Reyes`.
3. Verify Dante shows `idle` status.
4. Switch back to `Mike Morales`.
5. Verify Mike's active shift, active shift ID, and live duration timer are seamlessly restored.
