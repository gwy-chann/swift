# Architecture Research: Offline Shift State Resilience & Attendance Sync

**Feature**: `080-offline-shift-sync`  
**Jira Issue**: [SIAA-80](https://the-three-devsketeers.atlassian.net/browse/SIAA-80)  
**Date**: 2026-10-20  

---

## 1. Stack Constraints & Dependencies

- **Framework**: Next.js 15+ (App Router), React 19 (`useSyncExternalStore`, Client Component boundary)
- **Database & Backend**: PostgreSQL via Supabase RPCs (`clock_in_shift`, `clock_out_shift`, `toggle_shift_break`), Server Actions (`lib/staff/actions.ts`), Next.js cache revalidation.
- **Client Storage API**: Browser `window.localStorage` (synchronous key-value access) with safe SSR fallbacks (`typeof window !== 'undefined'`).
- **Network State API**: `window.navigator.onLine`, `window.addEventListener('online', ...)` and `window.addEventListener('offline', ...)`.
- **Styling**: Tailwind CSS v4 using semantic design tokens (`bg-bg-surface`, `bg-bg-card`, `text-text-primary`, `border-border`, `bg-primary`, `bg-success-light`, `text-success`). Zero hardcoded hex/rgb.
- **State Engines**:
  - `PunchStore` (`lib/store/punch-store.ts`): Client state engine managing active shifts, staff profiles, multi-staff session maps, and offline queuing.

---

## 2. Problem Diagnosis & Architecture Analysis

### Issue A: Reliance on Asynchronous Server Roundtrips on Boot
In `app/staff/clock/page.tsx`, `getStaffAttendanceHistoryAction()` is invoked on mount. Although `rehydrateFromStorage()` was added in SIAA-79 for `swift_active_shift`, the full punch logs and session state were not comprehensively persisted under the standard key `swift_staff_shift_state`. When offline or on cold reload, punch logs could be missing until the database query completed.

### Issue B: Dropped Punches During Network Dropouts
In `components/staff/clock/punch-clock-panel.tsx`:
```ts
clockInShiftAction(...)
  .catch((err) => {
    console.warn("[PunchClockPanel] clockInShiftAction error:", err);
  });
```
When offline or when the server action times out, the error is simply logged to the console. The database never receives the punch event, resulting in lost attendance records and discrepancy between terminal display and backend payroll logs.

### Issue C: Need for Idempotent FIFO Offline Queue
When multiple actions occur during a network outage (e.g., Cashier clocks in, toggles break 15 minutes later, then returns from break—all while the router is down):
1. These actions must be queued in chronological order (`clock_in` → `toggle_break` → `toggle_break`).
2. Each item must contain its respective timestamps, payload, and client-generated ID.
3. Upon reconnection, the queue must drain sequentially without reordering.
4. When Supabase processes the punch, the local shift ID must be reconciled with the Supabase row ID.

---

## 3. Architecture Decisions (ADRs)

### ADR-1: Standardized Client Storage Schema (`swift_staff_shift_state`)
- **Decision**: Store the canonical serialized shift state in `localStorage` under key `swift_staff_shift_state`:
  ```ts
  interface StoredStaffShiftState {
    version: number;
    lastSavedAt: number;
    currentStaff: string;
    currentProfileId: string;
    activeShift: {
      shiftId: string;
      staffName: string;
      profileId: string;
      clockIn: string;
      status: 'on_shift' | 'break' | 'completed' | 'idle';
      shiftSeconds: number;
    } | null;
    punchLogs: PunchLog[];
    staffSessions: Record<string, StaffMemberShiftState>;
  }
  ```
- **Rationale**: Captures complete UI state for instant, sub-millisecond restoration without layout shift on reload.

### ADR-2: Offline Punch Action Queue (`swift_offline_punch_queue`)
- **Decision**: Maintain an array of pending punch mutations in `localStorage` under `swift_offline_punch_queue`:
  ```ts
  interface QueuedPunchAction {
    id: string; // Unique client action ID (e.g., "QUEUE-1729400000000")
    type: 'clock_in' | 'clock_out' | 'toggle_break';
    profileId: string;
    staffName: string;
    terminalId: string;
    shiftId?: string;
    timestamp: string; // ISO 8601 string
    retryCount: number;
    status: 'pending' | 'syncing' | 'failed';
  }
  ```
- **Rationale**: Guarantees zero punch loss. Survives tab closures and reloads during extended broadband outages.

### ADR-3: Reconnection Sync Engine & Window Event Listeners
- **Decision**: Wire a background sync dispatcher in `PunchStore`:
  1. Listen to `window.addEventListener('online', () => punchStore.syncOfflineQueue())`.
  2. Also trigger `syncOfflineQueue()` immediately after enqueuing if `navigator.onLine` is true (optimistic retry).
  3. Sequentially execute server actions (`clockInShiftAction`, `clockOutShiftAction`, `toggleShiftBreakAction`).
  4. Dequeue committed actions and update `PunchStore` active shift IDs upon completion.
- **Rationale**: Automates recovery without requiring manual staff intervention or refresh.

### ADR-4: Clean Cache Eviction on Shift Finalization
- **Decision**: When `clockOut` completes, mark `activeShift` in `swift_staff_shift_state` as `status: 'completed'` and nullify `activeShiftId`, while retaining the completed log in `punchLogs`.
- **Rationale**: Prevents stale active shifts from resurrecting on subsequent browser sessions.
