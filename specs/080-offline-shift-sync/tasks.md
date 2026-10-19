# Implementation Tasks: Offline Shift State Resilience & Attendance Sync

**Feature**: `080-offline-shift-sync`  
**Jira Issue**: [SIAA-80](https://the-three-devsketeers.atlassian.net/browse/SIAA-80)  
**Date**: 2026-10-20  

---

## Phase 1: Contracts & Type Definitions

- [x] **TASK-001**: Define storage schemas and offline queue interfaces in `lib/contracts/offline-shift-sync.ts`.
  - Export `STORAGE_KEYS` (`swift_staff_shift_state`, `swift_offline_punch_queue`, `swift_active_shift`).
  - Export `QueuedPunchAction` and `StoredStaffShiftState` types.

---

## Phase 2: Core Store Engine & Offline Queue Implementation

- [ ] **TASK-002**: Implement `localStorage` serialization & deserialization in `PunchStore` (`lib/store/punch-store.ts`).
  - Synchronous cache hydration on instantiation and in `rehydrateFromStorage()` using `swift_staff_shift_state`.
  - Automatic state serialization upon every shift mutation (`clockIn`, `toggleBreak`, `clockOut`, `switchStaff`, `rehydrateShift`).
- [ ] **TASK-003**: Implement the offline punch queue in `PunchStore` (`lib/store/punch-store.ts`).
  - `enqueueOfflinePunch`: append action to `swift_offline_punch_queue` with unique ID, timestamp, and status.
  - `getOfflineQueue`: retrieve pending queue items.
  - `clearOfflineQueue` / `dequeueOfflinePunch`: remove completed items.
- [ ] **TASK-004**: Implement reconnection sync engine & window event listeners in `PunchStore`.
  - Wire `window.addEventListener('online', ...)` to drain queue.
  - Implement `syncOfflineQueue(actionDispatcher?)`: sequential FIFO processing of queued punches to Supabase server actions.
  - Clean eviction on finalized clock out: transition active shift to `completed` and clear active shift pointer.

---

## Phase 3: Unit & Integration Testing (TDD)

- [ ] **TASK-005**: Create comprehensive unit tests in `lib/store/__tests__/punch-store-offline-sync.test.ts`.
  - Test Scenario 1: State auto-serialization to `swift_staff_shift_state`.
  - Test Scenario 2: Instant sub-millisecond render from cached storage.
  - Test Scenario 3: Offline punch queue buffering during network loss.
  - Test Scenario 4: Reconnection sync draining in FIFO order.
  - Test Scenario 5: Clean cache eviction on clock out.
- [ ] **TASK-006**: Update existing tests in `lib/store/__tests__/punch-store-realtime.test.ts` to ensure full regression compatibility.

---

## Phase 4: UI Integration & Offline Resilience Wiring

- [ ] **TASK-007**: Wire offline queue fallbacks in `components/staff/clock/punch-clock-panel.tsx`.
  - If `clockInShiftAction`, `toggleShiftBreakAction`, or `clockOutShiftAction` fails or if offline, safely enqueue action into `punchStore`.
  - Display non-intrusive offline feedback indicator/badge when pending punches exist.
- [ ] **TASK-008**: Verify styling strictly adheres to SWIFT design tokens (`app/globals.css`, `lib/tokens.ts`).

---

## Phase 5: Verification, Quality Gates & Sync

- [ ] **TASK-009**: Run test suite (`npm test -- lib/store/__tests__/punch-store-offline-sync.test.ts`).
- [ ] **TASK-010**: Run static analysis (`npx tsc --noEmit` and `npm run lint`).
- [ ] **TASK-011**: Trigger Graphify auto-sync (`graphify . --update`) and review AST map.
