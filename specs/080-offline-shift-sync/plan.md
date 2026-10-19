# Implementation Plan: Offline Shift State Resilience & Attendance Sync

**Feature**: `080-offline-shift-sync`  
**Jira Issue**: [SIAA-80](https://the-three-devsketeers.atlassian.net/browse/SIAA-80)  
**Date**: 2026-10-20  

---

## 1. Architecture & Component Hierarchy

```text
app/staff/clock/page.tsx
└── components/staff/clock/punch-clock-panel.tsx
    ├── terminal-live-clock.tsx
    ├── staff-profile-switcher.tsx
    ├── staff-pin-modal.tsx
    └── lib/store/punch-store.ts (PunchStore Engine)
        ├── localStorage Persistence (swift_staff_shift_state)
        ├── Offline Action Queue (swift_offline_punch_queue)
        └── Network Event Listeners (online/offline auto-sync)
```

---

## 2. Technical Modifications

### 2.1 Domain & Store Layer (`lib/store/punch-store.ts`)
1. **Define Storage Schemas & Constants**:
   - Keys: `swift_staff_shift_state`, `swift_offline_punch_queue`, `swift_active_shift`.
2. **Synchronous Hydration on Boot**:
   - In `PunchStore.constructor()` and `rehydrateFromStorage()`: inspect `swift_staff_shift_state` and initialize state synchronously if available.
3. **Continuous State Serialization**:
   - Call `saveStateToStorage()` whenever `clockIn`, `clockOut`, `toggleBreak`, `switchStaff`, or `rehydrateShift` mutates state.
4. **Offline Punch Queue Engine**:
   - `enqueueOfflinePunch(action: Omit<QueuedPunchAction, 'id' | 'timestamp' | 'retryCount' | 'status'>)`
   - `getOfflineQueue(): QueuedPunchAction[]`
   - `clearOfflineQueue(): void`
   - `syncOfflineQueue(): Promise<{ synced: number; failed: number }>`
5. **Connectivity Listeners**:
   - In browser environment, attach `window.addEventListener('online', ...)` to trigger `syncOfflineQueue()`.

### 2.2 UI Wiring (`components/staff/clock/punch-clock-panel.tsx` & `page.tsx`)
1. Wrap `clockInShiftAction`, `clockOutShiftAction`, `toggleShiftBreakAction` with offline queueing fallback:
   - If offline (`!navigator.onLine`) or if server action rejects / fails with network error, enqueue the punch action.
2. Display subtle offline badge/indicator when pending offline items exist in the queue.
3. Clean eviction: On shift finalization, transition storage state to completed and clear active shift pointer.

### 2.3 Tests & Verification (`lib/store/__tests__/punch-store-offline-sync.test.ts`)
1. Test synchronous hydration from `swift_staff_shift_state`.
2. Test automatic serialization upon clock-in, break toggle, and clock-out.
3. Test offline queueing when network is disconnected.
4. Test queue draining and FIFO synchronization when online event fires.
5. Test clean cache eviction when shift completes.

---

## 3. SWIFT Design Tokens & Accessibility Compliance

- Semantic token utilities: `bg-bg-surface`, `bg-bg-card`, `text-text-primary`, `border-border`, `bg-success`, `bg-accent`. Zero hardcoded hex/rgb.
- Screen reader announcements (`aria-live="polite"`) for offline sync status and notifications.
