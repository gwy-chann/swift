import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PunchStore } from '../punch-store.ts';
import { ShiftRpcError, SHIFT_RPC_ERROR_CODES } from '../../contracts/punch-clock-rpcs.ts';
import type { DbStaffShift } from '../../types/logs.ts';

describe('Staff Punch Clock Lifecycle, Time-Out History & Navigation Persistence (SIAA-75)', () => {
  let store: PunchStore;

  beforeEach(() => {
    store = new PunchStore();
  });

  describe('Defect 2 Fix: Initial Clean Session Starts Clocked Out (Idle)', () => {
    it('initializes in idle / CLOCKED OUT state with zero duration and null activeShiftId', () => {
      const state = store.getState();
      assert.equal(state.isShiftActive, false, 'Initial state should not be active shift');
      assert.equal(state.shiftStatus, 'idle', 'Initial status should be idle');
      assert.equal(state.shiftSeconds, 0, 'Initial duration should be 0');
      assert.equal(state.activeShiftId, null, 'Initial activeShiftId should be null');
      assert.equal(state.lastError, null, 'Initial lastError should be null');
    });

    it('ensures baseline mock logs contain no lingering unclosed active shifts', () => {
      const state = store.getState();
      for (const log of state.punchLogs) {
        assert.notEqual(
          log.timeOut,
          '-- Active Shift --',
          `Baseline log ${log.id} should not have unclosed '-- Active Shift --'`
        );
        assert.equal(
          log.status,
          'Completed',
          `Baseline log ${log.id} should have Completed status`
        );
      }
    });

    it('tickSecond does not increment timer when store is in initial idle state', () => {
      store.tickSecond();
      store.tickSecond();
      assert.equal(store.getState().shiftSeconds, 0);
    });
  });

  describe('Defect 1 Fix: Accurate Time-Out History Recording upon Clock-Out', () => {
    it('records exact timeOut timestamp, calculates final duration, and transitions status to Completed', () => {
      // 1. Employee manually clocks in
      store.clockIn('Mike Morales', 'Terminal #01');
      const activeState = store.getState();
      assert.equal(activeState.isShiftActive, true);
      assert.equal(activeState.shiftStatus, 'on_shift');
      assert.ok(activeState.activeShiftId !== null);

      const activeLogId = activeState.activeShiftId;
      const initialLog = activeState.punchLogs.find((l) => l.id === activeLogId);
      assert.ok(initialLog, 'Active shift log must exist in punchLogs');
      assert.equal(initialLog.timeOut, '-- Active Shift --');
      assert.equal(initialLog.status, 'On Shift');

      // 2. Advance timer by 125 seconds (02m 05s)
      for (let i = 0; i < 125; i++) {
        store.tickSecond();
      }
      assert.equal(store.getState().shiftSeconds, 125);

      // 3. Employee clocks out
      const durationFormatted = store.clockOut('Mike Morales');
      assert.equal(durationFormatted, '00h 02m');

      const finalizedState = store.getState();
      assert.equal(finalizedState.isShiftActive, false);
      assert.equal(finalizedState.activeShiftId, null);
      assert.equal(finalizedState.shiftStatus, 'completed');

      // 4. Verify the finalized shift log in punchLogs
      const finalizedLog = finalizedState.punchLogs.find((l) => l.id === activeLogId);
      assert.ok(finalizedLog, 'Finalized shift log must be present in punchLogs');
      assert.equal(finalizedLog.status, 'Completed');
      assert.notEqual(finalizedLog.timeOut, '-- Active Shift --');
      assert.match(finalizedLog.timeOut, /^\d{2}:\d{2}:\d{2}\s+(AM|PM)$/i);
      assert.equal(finalizedLog.duration, '00h 02m');
    });

    it('accurately finalizes active shift even when recent logs are prepended during rehydration', () => {
      store.clockIn('Mike Morales', 'Terminal #01');
      const activeId = store.getState().activeShiftId;

      // Simulate rehydration prepending another log
      const extraLog = {
        id: 'PUNCH-PEER-999',
        date: '2026-10-20',
        staff: 'Carlos Rodriguez',
        timeIn: '09:00:00 AM',
        timeOut: '05:00:00 PM',
        duration: '08h 00m',
        status: 'Completed',
      };
      store.rehydrateShift(null, [extraLog]);

      // Clock out should still find and finalize activeId
      const duration = store.clockOut('Mike Morales');
      assert.ok(duration.length > 0);

      const updated = store.getState().punchLogs.find((l) => l.id === activeId);
      assert.ok(updated);
      assert.equal(updated.status, 'Completed');
      assert.notEqual(updated.timeOut, '-- Active Shift --');
    });
  });

  describe('Defect 3 Fix: Route Navigation Persistence & Rehydration Resilience', () => {
    it('preserves client active shift when rehydrateShift is called with activeShift: null', () => {
      // 1. Employee clocks in at /staff/clock
      store.clockIn('Mike Morales', 'Terminal #01');
      assert.equal(store.getState().isShiftActive, true);
      assert.equal(store.getState().shiftStatus, 'on_shift');

      // 2. Advance 10 seconds
      for (let i = 0; i < 10; i++) {
        store.tickSecond();
      }
      assert.equal(store.getState().shiftSeconds, 10);

      // 3. User navigates to /staff/pos and returns to /staff/clock
      // StaffClockPage mounts and executes getStaffAttendanceHistoryAction() which returns activeShift: null in offline mode
      store.rehydrateShift(null, store.getState().punchLogs);

      // 4. Verify shift is NOT wiped out
      const stateAfterNav = store.getState();
      assert.equal(stateAfterNav.isShiftActive, true, 'Shift must remain active after route re-mount');
      assert.equal(stateAfterNav.shiftStatus, 'on_shift', 'Shift status must remain on_shift');
      assert.equal(stateAfterNav.shiftSeconds, 10, 'Timer must not be reset to 0');
      assert.ok(stateAfterNav.activeShiftId !== null, 'activeShiftId must be preserved');

      // 5. Timer continues ticking normally
      store.tickSecond();
      assert.equal(store.getState().shiftSeconds, 11);
    });

    it('authoritatively rehydrates active shift when remote database returns a valid active shift', () => {
      const now = Date.now();
      const mockDbActiveShift: DbStaffShift = {
        id: 'shift-uuid-555',
        profile_id: 'prof-123',
        staff_name: 'Mike Morales',
        terminal_id: 'Terminal #01',
        clock_in: new Date(now - 3600 * 1000).toISOString(), // 1 hour ago
        clock_out: null,
        duration_seconds: null,
        status: 'on_shift',
        notes: null,
        created_at: new Date(now - 3600 * 1000).toISOString(),
        updated_at: new Date(now - 3600 * 1000).toISOString(),
      };

      store.rehydrateShift(mockDbActiveShift, [], now);

      const state = store.getState();
      assert.equal(state.isShiftActive, true);
      assert.equal(state.activeShiftId, 'shift-uuid-555');
      assert.equal(state.shiftStatus, 'on_shift');
      assert.equal(state.shiftSeconds, 3600);
    });
  });

  describe('Break & Guard Edge Cases', () => {
    it('supports toggleBreak back and forth and preserves break status across null rehydration', () => {
      store.clockIn('Mike Morales');
      const firstStatus = store.toggleBreak();
      assert.equal(firstStatus, 'break');
      assert.equal(store.getState().shiftStatus, 'break');

      // Rehydration with null should preserve break
      store.rehydrateShift(null);
      assert.equal(store.getState().isShiftActive, true);
      assert.equal(store.getState().shiftStatus, 'break');

      // Resume shift
      const resumeStatus = store.toggleBreak();
      assert.equal(resumeStatus, 'on_shift');
      assert.equal(store.getState().shiftStatus, 'on_shift');
    });

    it('rejects duplicate clock-in while on active shift', () => {
      store.clockIn('Mike Morales');
      assert.throws(
        () => {
          store.clockIn('Mike Morales');
        },
        (err) => {
          assert.ok(err instanceof ShiftRpcError);
          assert.equal(err.code, SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS);
          return true;
        }
      );
    });

    it('rejects clock-out when no shift is active', () => {
      assert.equal(store.getState().isShiftActive, false);
      assert.throws(
        () => {
          store.clockOut('Mike Morales');
        },
        (err) => {
          assert.ok(err instanceof ShiftRpcError);
          assert.equal(err.code, SHIFT_RPC_ERROR_CODES.SHIFT_NOT_ACTIVE);
          return true;
        }
      );
    });
  });
});
