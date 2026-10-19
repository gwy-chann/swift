# Quickstart Verification Guide: Staff Kiosk Authentication

**Feature**: `078-staff-kiosk-auth`  
**Jira Issue**: [SIAA-78](https://the-three-devsketeers.atlassian.net/browse/SIAA-78)  
**Date**: 2026-10-20  

---

## 1. Automated Test Execution

Inside the worktree (`.worktrees/SIAA-78-staff-kiosk-auth`), run:
```bash
npm test lib/staff/__tests__/staff-kiosk-auth.test.ts
npm test components/staff/clock/__tests__/staff-pin-modal.test.tsx
npx tsc --noEmit
npm run lint
```

---

## 2. Interactive Verification Scenarios

### Scenario A: Frontline PIN Authentication on Clock-In
1. Navigate to `/staff/clock` on the shared shop floor terminal.
2. Select staff member (e.g. `Mike Morales`).
3. Click **"TIME IN (SHIFT START)"**.
4. Verify the **Staff PIN Authentication Modal** opens with:
   - Profile title ("Enter PIN for Mike Morales - Cashier / Floor Staff")
   - 4-digit PIN indicator dots / numeric keypad.
5. Enter incorrect PIN `9999` and submit:
   - Verify red error banner appears: "Invalid employee PIN. Please try again."
   - PIN input resets.
6. Enter valid PIN `1234` and submit:
   - Modal closes.
   - Shift starts and status changes to "CURRENT STATUS: ON SHIFT".
   - Server Action executes `clockInShiftAction(terminalId, notes, profileId)` against Postgres.
   - Real row is inserted into `public.staff_shifts` and `public.staff_shift_audit_logs`.

### Scenario B: Multi-Staff Terminal Switching
1. With Mike Morales on shift and timer running, click **"Switch Staff"** in the punch clock header.
2. Select `Dante Reyes` (Mechanic).
3. Enter PIN `2222`.
4. Verify:
   - Terminal active profile changes to Dante Reyes.
   - Dante's personal shift state is displayed (e.g., clocked out / idle), while Mike's shift remains intact and running in the background.
5. Click **"TIME IN"** for Dante Reyes:
   - Dante starts an active shift with terminal attribution.
6. Switch back to Mike Morales and enter `1234`:
   - Mike's active shift and elapsed timer continue from where they were without data loss.

### Scenario C: Taking Break & Clocking Out
1. For an active staff member, click **"TAKE BREAK"**:
   - Status updates to "CURRENT STATUS: ON BREAK".
   - `toggleShiftBreakAction` persists the break state to Postgres.
2. Click **"RESUME SHIFT"**:
   - Status returns to "CURRENT STATUS: ON SHIFT".
3. Click **"TIME OUT (SHIFT END)"**:
   - Shift duration is calculated, `clockOutShiftAction` finalizes the shift record in `public.staff_shifts`.
   - Attendance history log displays completed shift entry.
