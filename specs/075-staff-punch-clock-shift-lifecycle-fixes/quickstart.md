# Quickstart & Verification Guide: Staff Punch Clock Lifecycle Fixes (SIAA-75)

This guide provides steps to manually and automatically verify the resolution of the defects reported in [SIAA-75](https://the-three-devsketeers.atlassian.net/browse/SIAA-75).

---

## 1. Automated Test Suite Execution

Run the targeted unit and lifecycle test suite via Node test runner:

```bash
node --experimental-strip-types --test lib/store/__tests__/punch-store-lifecycle.test.ts lib/store/__tests__/punch-clock-view.test.ts lib/store/__tests__/punch-store-guard.test.ts lib/staff/__tests__/attendance-history-table.test.ts
```

Run full project test suite:
```bash
npm test
```

Run TypeScript compilation check:
```bash
npx tsc --noEmit
```

---

## 2. Interactive Manual Verification Scenarios

### Scenario 1: Initial Login Starts Idle (Defect 2 Verification)
1. Open terminal at `/staff/clock` or refresh browser.
2. Verify the terminal live badge displays `CURRENT STATUS: CLOCKED OUT` in muted styling.
3. Verify the shift duration timer displays `00:00:00`.
4. Verify the topbar does not show an active timer running.

### Scenario 2: Shift Persistence Across Route Transitions (Defect 3 Verification)
1. At `/staff/clock`, click `TIME IN (SHIFT START)`.
2. Observe status changes to `CURRENT STATUS: ON SHIFT` with pulsing green dot.
3. Wait 5 seconds (timer shows `00:00:05`).
4. Click on **Fast-Lane POS** (`/staff/pos`) or **Lookup** in the sidebar.
5. Wait 3 seconds.
6. Click back on **Time Clock** (`/staff/clock`).
7. **Verify**:
   - Status remains `CURRENT STATUS: ON SHIFT`.
   - Timer continues ticking from `00:00:08+`.
   - Shift has NOT been reset to `CLOCKED OUT`.

### Scenario 3: Time-Out Recorded in History Table (Defect 1 Verification)
1. With active shift running at `/staff/clock`, click `TIME OUT (SHIFT END)`.
2. Observe success notification: `Clock-Out recorded. Shift ended (00h 00m) and logged to attendance history.`
3. Inspect the **My Attendance & Shift Log History** table immediately below:
   - **Time-Out** column: Contains the actual clock-out timestamp (e.g. `01:15:22 AM`), NOT `-- Active Shift --`.
   - **Shift Duration** column: Shows calculated duration (e.g. `00h 00m` or `00h 01m`).
   - **Status** column: Shows `Completed` badge.
   - Terminal badge updates to `CURRENT STATUS: CLOCKED OUT`.
