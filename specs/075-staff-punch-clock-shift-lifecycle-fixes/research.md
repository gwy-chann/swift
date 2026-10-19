# Research & Technical Root Cause Analysis: Staff Punch Clock Lifecycle Fixes

**Feature**: Staff Punch Clock Shift Lifecycle, Time-Out History Recording, and Route Persistence  
**Spec Directory**: `specs/075-staff-punch-clock-shift-lifecycle-fixes`  
**Jira Issue**: [SIAA-75](https://the-three-devsketeers.atlassian.net/browse/SIAA-75)  

---

## 1. Deep Root Cause Analysis

### Defect 1: Time-Out Not Recording in Attendance Log History
- **Location**: `lib/store/punch-store.ts` (`clockOut` method) & `components/staff/clock/attendance-history-table.tsx` (`isActive` row evaluation).
- **Mechanisms**:
  1. `PunchStore.clockOut` iterates over `this.state.punchLogs` and only updates `if (index === 0 && (log.status === 'On Shift' || log.status === 'Break'))`.
     - When `rehydrateShift` prepends logs from remote history or mock baseline, or if the table is sorted by date/time, the active shift might not be at `index === 0`.
     - In that scenario, `punchLogs[0]` is not the active shift, so `clockOut` does not mutate any log item's `timeOut` or `status`!
  2. In `AttendanceHistoryTable`:
     ```tsx
     const isActive =
       (log.status === "On Shift" || log.status === "on_shift") &&
       (log.timeOut === "-- Active Shift --" || (index === 0 && isShiftActive));
     ```
     - Notice that `MOCK_PUNCH_LOGS[0]` in `lib/mock-data/logs.ts` was hardcoded with `status: 'On Shift'` and `timeOut: '-- Active Shift --'`.
     - Even after clock-out occurs and `isShiftActive` becomes `false`, any log that still has `timeOut: '-- Active Shift --'` evaluates `isActive = true`, rendering `-- Active Shift --` and `formattedTimer` (`00:00:00` because timer is reset or stopped).
     - Furthermore, `activeShiftId` is not explicitly tracked in `PunchStoreState`, making it ambiguous which shift belongs to the currently active session.

### Defect 2: Unintended Automatic Time-In on Initial Login
- **Location**: `lib/store/punch-store.ts` (`constructor`).
- **Mechanisms**:
  ```ts
  constructor() {
    const initialLogs = [...MOCK_PUNCH_LOGS];
    this.state = {
      isShiftActive: true,
      shiftSeconds: 15150, // 04h 12m 30s as in mockup/app.js line 724
      punchLogs: initialLogs,
      currentStaff: 'Mike Morales',
      shiftStatus: 'on_shift',
      lastError: null,
      activeStaffCount: this.calculateActiveStaffCount(initialLogs),
    };
  }
  ```
  - `PunchStore` initialized `isShiftActive: true` and `shiftStatus: 'on_shift'` by default.
  - While this mirrored a static mockup demonstration in `mockup/app.js`, in production application behavior it forces fresh logins to start already clocked-in.
  - `MOCK_PUNCH_LOGS[0]` was also set to `'On Shift'`, compounding the issue.

### Defect 3: Unwanted Automatic Time-Out on Route Navigation
- **Location**: `app/staff/clock/page.tsx` (`useEffect` mounting `getStaffAttendanceHistoryAction`) and `PunchStore.rehydrateShift`.
- **Mechanisms**:
  1. In `StaffClockPage`:
     ```tsx
     useEffect(() => {
       let isMounted = true;
       getStaffAttendanceHistoryAction()
         .then((res) => {
           if (!isMounted) return;
           if (res.success) {
             rehydrateShift(res.activeShift, res.logs);
           }
         });
     ```
  2. When the user navigates from `/staff/clock` to `/staff/pos`, and back to `/staff/clock`, `StaffClockPage` re-mounts.
  3. `getStaffAttendanceHistoryAction()` runs. In offline fallback or when remote Supabase query returns `activeShift: null`:
  4. `rehydrateShift(null, res.logs)` runs in `PunchStore`:
     ```ts
     let isShiftActive = false;
     let shiftStatus: ShiftStateStatus = 'idle';
     let shiftSeconds = 0;
     ```
     - It unconditionally overwrote the existing in-memory active shift with `isShiftActive = false`!
     - Any active shift running in the client was immediately destroyed and reset to `CLOCKED OUT`.

---

## 2. Architecture & Design Decisions

### Decision 1: Explicit `activeShiftId` in `PunchStoreState`
- Add `activeShiftId: string | null` to `PunchStoreState`.
- When `clockIn` executes, generate/assign `activeShiftId = newLog.id` (or the returned Supabase shift ID).
- When `clockOut` executes, target the record where `log.id === this.state.activeShiftId` (or fallback to matching `log.status === 'On Shift' || log.status === 'Break'`).
- Upon clock out completion, set `activeShiftId = null`.

### Decision 2: Conservative Rehydration Guard
- In `PunchStore.rehydrateShift(activeShift, recentLogs)`:
  - If `activeShift` is present from the database, use it as authoritative server truth.
  - If `activeShift` is `null`:
    - Check if the store **already has an active client shift** (`this.state.isShiftActive && this.state.activeShiftId`).
    - If an active shift is already running in memory, preserve it! Do NOT blow away the client's current shift when remote returns `null`.
    - Only reset to `isShiftActive = false` if there is no active shift in local memory or if explicitly commanded.

### Decision 3: Default Constructor Clean Initialization
- Initialize `isShiftActive: false`, `shiftStatus: 'idle'`, `shiftSeconds: 0`, and `activeShiftId: null`.
- Update `MOCK_PUNCH_LOGS` in `lib/mock-data/logs.ts` so historical baseline records are completed (`PUNCH-101`: `timeOut: '12:12:45 PM'`, `status: 'Completed'`).
- Provide an explicit test helper or optional config for tests that need to test rehydration or starting in specific states.

### Decision 4: Safe Attendance History Table Row Evaluation
- In `AttendanceHistoryTable`:
  - A row is active IF and ONLY IF:
    `isShiftActive && (log.id === activeShiftId || ((log.status === 'On Shift' || log.status === 'on_shift') && log.timeOut === '-- Active Shift --'))`
  - When `isShiftActive` is `false`, NO row can render as an active running shift.
  - Any completed row renders its recorded `log.timeOut` and `log.duration`.

---

## 3. SWIFT Constitution & Design Tokens Compliance
- **Zero Hardcoded Colors**: Maintain established tokens (`bg-bg-surface`, `border-border`, `text-text-primary`, `bg-success`, `bg-danger`, `text-accent`).
- **Tailwind CSS v4**: Strict canonical classes; no arbitrary brackets or legacy gradient syntax.
- **Type Safety**: Fully typed actions, store methods, and Zod contract schemas in `contracts/punch-clock-lifecycle.ts`.
