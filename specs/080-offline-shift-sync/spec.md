# Feature Specification: Offline Shift State Resilience & Attendance Sync

**Feature Branch**: `feat/SIAA-80-offline-shift-sync`  
**Created**: 2026-10-20  
**Status**: Ready for Planning / Implementation  
**Jira Issue**: [SIAA-80](https://the-three-devsketeers.atlassian.net/browse/SIAA-80)  
**Parent Epic**: [SIAA-77](https://the-three-devsketeers.atlassian.net/browse/SIAA-77) (EPIC: Production Staff Attendance & Kiosk Shift Persistence)  
**Target View**: Staff Shop Floor Terminal Punch Clock (`/staff/clock` and `mockup/staff.html#view-staff-clock`)

---

## 1. Executive Summary & Objective

In dynamic motorcycle parts retail and repair workshops, store connectivity can be unstable or suffer transient broadband and Wi-Fi dropouts. Shop floor terminals (`Terminal #01`) are used continuously by cashiers and mechanics to track active shifts, breaks, and daily punch logs. 

Previously, `PunchStore` operated primarily in in-memory state with minimal external persistence. Any network dropouts during shift punches, browser reloads, or temporary database timeouts could cause punches to fail, active shifts to desynchronize, or terminal views to display empty timers and layout shifts while waiting for remote database responses.

This specification implements **Offline Shift Resilience & Attendance Sync**:
1. **Persistent Client Storage Cache**: Cache active shift state, active staff profile, and recent punch logs in browser `localStorage` under the canonical key `swift_staff_shift_state`.
2. **Instant Sub-Millisecond Initial Render**: Initialize `PunchStore` synchronously from `localStorage` on boot/reload so cashiers and mechanics see their active shift status and timer immediately, eliminating layout shifts, loading spinners, or zeroed timers.
3. **Offline Punch Action Queue**: When network drops or database calls fail, punch actions (`clock_in`, `clock_out`, `toggle_break`) succeed locally and are buffered into an offline queue in `localStorage` under `swift_offline_punch_queue`.
4. **Automatic Reconnection Sync Engine**: Monitor network connectivity via window `online`/`offline` event listeners. When online connectivity is restored, automatically drain and synchronize queued punches with Supabase, reconciling client IDs with remote shift records.
5. **Clean Cache Eviction & Finalization**: When a shift is clocked out and finalized, cleanly update/evict the active shift state from `localStorage` while preserving immutable historical punch logs.
6. **SWIFT Semantic Design Tokens**: Adhere strictly to SWIFT design token conventions in `app/globals.css` and `lib/tokens.ts` with zero hardcoded colors.

---

## 1.1 Clarifications

### Session 2026-10-20
- Q: What key names must be used in `localStorage`? → A: Primary state cache uses `swift_staff_shift_state`, and the offline action queue uses `swift_offline_punch_queue`. Backward compatibility with `swift_active_shift` is maintained during migration.
- Q: How does the offline queue handle duplicate punches if an action is queued and connection is restored? → A: Queued actions maintain unique client transaction IDs (`id: PUNCH-...` or UUID) and client timestamps. The sync engine processes items sequentially FIFO, passing the idempotent client timestamp to Supabase RPCs.
- Q: How are UI notifications displayed when operating offline? → A: Non-intrusive feedback indicators inform staff that an action was recorded offline and will sync automatically once network connectivity returns.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-80)

* **As a** store manager and floor cashier,  
* **I want** the terminal punch clock to cache active shift state and logs in browser `localStorage` and maintain an offline queue,  
* **So that** temporary internet dropouts or network lag never disrupt shop floor operations and punches can synchronize to Supabase once connectivity is restored.

---

### Scenario 1: Local state synchronization (Priority: P1)

* **Given** an employee initiates a clock-in, clock-out, or break toggle
* **When** `PunchStore` updates its internal state
* **Then** the updated state (active status, clock-in timestamp, staff profile, punch logs, active duration) is automatically written to `localStorage` under key `swift_staff_shift_state`.

---

### Scenario 2: Instant sub-millisecond initial render (Priority: P1)

* **Given** cached shift data exists in `localStorage` under `swift_staff_shift_state`
* **When** the browser window opens or reloads (`F5`)
* **Then** `PunchStore` immediately initializes from `localStorage` without waiting for network requests, eliminating layout shifts or temporary zeroed timers.

---

### Scenario 3: Offline punch queue & sync on reconnect (Priority: P1)

* **Given** the shop terminal loses internet connectivity (`navigator.onLine === false` or network failure)
* **When** an employee punches in, out, or toggles break
* **Then** the action succeeds locally in `PunchStore` and is enqueued in `localStorage` under `swift_offline_punch_queue`
* **And** when connectivity returns (window `online` event fires or sync is triggered), the queued actions are sequentially synced with the Supabase database.

---

### Scenario 4: Clean cache eviction on finalized shift (Priority: P1)

* **Given** an employee completes their shift and clocks out
* **When** the clock-out is finalized
* **Then** the active shift in `localStorage` (`swift_staff_shift_state`) is transitioned to `completed` and the active shift reference is cleared.

---

### Scenario 5: Multi-terminal & multi-staff queue isolation (Priority: P2)

* **Given** multiple staff members switch sessions on a shared kiosk
* **When** actions are executed in offline mode
* **Then** queue items retain their respective `profileId`, `staffName`, and `terminalId`
* **And** upon sync, all actions are attributed to their rightful staff profiles in Supabase.

---

## 3. Functional Requirements

- **FR-001**: `PunchStore` MUST serialize its core shift state (`isShiftActive`, `activeShiftId`, `shiftStatus`, `shiftSeconds`, `clockInTime`, `currentStaff`, `currentProfileId`, `punchLogs`) to `localStorage` under key `swift_staff_shift_state` upon every state mutation.
- **FR-002**: `PunchStore` MUST provide synchronous initial hydration from `swift_staff_shift_state` during instantiation or mount, preventing flash of unauthenticated or idle state.
- **FR-003**: `PunchStore` MUST maintain an offline action queue (`swift_offline_punch_queue`) containing pending `clock_in`, `clock_out`, and `toggle_break` actions.
- **FR-004**: If a network request to Supabase fails or if `navigator.onLine` is false, `PunchStore` MUST enqueue the punch action without throwing an unhandled exception to the cashier.
- **FR-005**: `PunchStore` MUST register global `online` event listeners (and a periodic retry trigger) to automatically drain the offline punch queue when connectivity returns.
- **FR-006**: During sync draining, successfully committed items MUST be removed from `swift_offline_punch_queue`. If a sync request fails with an unrecoverable conflict, an error is surfaced without dropping valid queue items.
- **FR-007**: Upon clock out, `PunchStore` MUST mark active shift status as `completed` and clear the active shift pointer from `localStorage`.
- **FR-008**: All UI indicators, banners, and status dots MUST use semantic SWIFT design tokens (`bg-bg-surface`, `text-text-primary`, `bg-success`, `bg-accent`, `bg-danger`, `border-border`).

---

## 4. Success Criteria

1. **Sub-Millisecond Cache Hydration**: On browser refresh with cached shift data, the active shift state and elapsed timer render in < 1ms without layout flicker.
2. **Zero Punch Loss During Disconnects**: 100% of punch actions taken while offline are captured in `swift_offline_punch_queue` and reconciled with Supabase upon reconnection.
3. **Queue Draining Reliability**: When the `online` event fires, all pending items in `swift_offline_punch_queue` are processed in FIFO order.
4. **Test Coverage**: Comprehensive unit and integration test suite passing with 0 errors across offline queueing, cache rehydration, and sync lifecycle.
