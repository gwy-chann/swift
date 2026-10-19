# Quickstart & Verification Guide: Offline Shift State Resilience & Attendance Sync

**Feature**: `080-offline-shift-sync`  
**Jira Issue**: [SIAA-80](https://the-three-devsketeers.atlassian.net/browse/SIAA-80)  
**Date**: 2026-10-20  

---

## 1. Quick Verification Command

Run the targeted unit and integration tests:

```bash
node --env-file=.env.local --experimental-strip-types --test lib/store/__tests__/punch-store-offline-sync.test.ts
```

---

## 2. Interactive Walkthrough Scenarios

### Scenario 1: Local Storage Cache Persistence
1. Navigate to `/staff/clock`.
2. Select staff profile (e.g. Mike Morales) and Clock In.
3. Open Browser DevTools -> Application -> Local Storage.
4. Verify key `swift_staff_shift_state` contains `isShiftActive: true`, `status: "on_shift"`, and recent `punchLogs`.
5. Press `F5` to hard refresh.
6. Verify active shift timer resumes immediately without zeroing out or flashing.

### Scenario 2: Offline Punch Queueing
1. Disconnect Wi-Fi or toggle DevTools Network tab to "Offline".
2. Click "TAKE A BREAK".
3. Verify status changes to "ON BREAK" locally and `swift_offline_punch_queue` in `localStorage` has 1 queued item (`type: "toggle_break"`).
4. Click "END BREAK" and then "TIME OUT (SHIFT END)".
5. Verify `swift_offline_punch_queue` has 3 queued items.

### Scenario 3: Automatic Reconnection & Sync Draining
1. Toggle DevTools Network back to "Online" or reconnect Wi-Fi.
2. The window `online` event fires.
3. `PunchStore.syncOfflineQueue()` executes automatically, dispatching pending RPCs in FIFO order.
4. Inspect `localStorage`: `swift_offline_punch_queue` is drained to `[]`.
5. Active shift in `swift_staff_shift_state` is updated to completed.
