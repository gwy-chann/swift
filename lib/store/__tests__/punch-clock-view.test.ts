import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PunchStore } from '../punch-store.ts';
import { ShiftRpcError, SHIFT_RPC_ERROR_CODES } from '../../contracts/punch-clock-rpcs.ts';

describe('Terminal Digital Shift Punch Clock & Active Duration Counter (SIAA-29)', () => {
  let store: PunchStore;

  beforeEach(() => {
    store = new PunchStore();
  });

  describe('Scenario 1: Live Terminal Clock Display & Second Tick', () => {
    it('validates 12-hour format string resolution with seconds', () => {
      const testDate = new Date('2026-10-15T08:14:30');
      const timeFormatted = testDate.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });

      // Matches hh:mm:ss AM/PM
      assert.match(timeFormatted, /^\d{2}:\d{2}:\d{2}\s(AM|PM)$/);
    });

    it('increments duration counter second by second during active shift', () => {
      // Initiate shift
      store.clockIn('Mike Morales');
      assert.equal(store.getState().shiftSeconds, 0);

      store.tickSecond();
      assert.equal(store.getState().shiftSeconds, 1);

      store.tickSecond();
      store.tickSecond();
      assert.equal(store.getState().shiftSeconds, 3);
    });
  });

  describe('Scenario 2: Shift Clock-In (Time-In) Trigger & Counter Initiation', () => {
    it('records exact punch-in timestamp, sets status to on_shift, and initiates timer from 00:00:00', () => {
      // Store starts in clean idle state
      assert.equal(store.getState().isShiftActive, false);
      assert.equal(store.getState().shiftStatus, 'idle');

      // Now perform Clock-In
      store.clockIn('Mike Morales', 'Terminal #01');

      const state = store.getState();
      assert.equal(state.isShiftActive, true);
      assert.equal(state.shiftStatus, 'on_shift');
      assert.equal(state.shiftSeconds, 0); // Initiates from 00:00:00
      assert.equal(state.currentStaff, 'Mike Morales');

      // Verifies newest log entry
      const newestLog = state.punchLogs[0];
      assert.equal(newestLog.staff, 'Mike Morales');
      assert.equal(newestLog.status, 'On Shift');
      assert.equal(newestLog.timeOut, '-- Active Shift --');
      assert.match(newestLog.timeIn, /^\d{2}:\d{2}:\d{2}\s(AM|PM)$/);
    });
  });

  describe('Scenario 3: Real-Time Topbar Active Shift Duration Counter', () => {
    it('maintains continuous duration ticking without resetting on simulated view transitions', () => {
      // Initiate shift
      store.clockIn('Mike Morales');
      assert.equal(store.getState().shiftSeconds, 0);

      // Simulate ticking 5 seconds while on view /staff/clock
      for (let i = 0; i < 5; i++) {
        store.tickSecond();
      }
      assert.equal(store.getState().shiftSeconds, 5);

      // Simulate view navigation to /staff/pos (store remains unchanged and continues ticking)
      for (let i = 0; i < 3; i++) {
        store.tickSecond();
      }
      assert.equal(store.getState().shiftSeconds, 8);

      // Simulate view navigation to /staff/search
      for (let i = 0; i < 2; i++) {
        store.tickSecond();
      }
      assert.equal(store.getState().shiftSeconds, 10);
    });
  });

  describe('Scenario 4: Shift Clock-Out (Time-Out) & Duplicate Punch Guard', () => {
    it('finalizes active shift, stops counter progression, and records total duration', () => {
      store.clockIn('Mike Morales');
      assert.equal(store.getState().isShiftActive, true);

      // Advance by 65 seconds
      for (let i = 0; i < 65; i++) {
        store.tickSecond();
      }

      const durationStr = store.clockOut('Mike Morales');
      assert.equal(durationStr, '00h 01m');

      const state = store.getState();
      assert.equal(state.isShiftActive, false);
      assert.equal(state.shiftStatus, 'completed');
      assert.equal(state.punchLogs[0].status, 'Completed');
      assert.equal(state.punchLogs[0].duration, '00h 01m');

      // Once clocked out, ticking has no effect on duration counter
      const secondsAtClockOut = state.shiftSeconds;
      store.tickSecond();
      assert.equal(store.getState().shiftSeconds, secondsAtClockOut);
    });

    it('guards against duplicate clock-in while on active shift and generates error alert', () => {
      store.clockIn('Mike Morales');
      assert.equal(store.getState().isShiftActive, true);

      assert.throws(
        () => {
          store.clockIn('Mike Morales');
        },
        (err) => {
          assert.ok(err instanceof ShiftRpcError);
          assert.equal(err.code, SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS);
          assert.equal(
            err.message,
            'Active shift already in progress. Please clock out before starting a new shift.'
          );
          return true;
        }
      );

      // State remains on_shift and error is recorded
      assert.equal(store.getState().isShiftActive, true);
      assert.equal(store.getState().lastError?.code, SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS);
    });

    it('guards against clock-out when no shift is active', () => {
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

    it('ensures staff does not time in automatically when logged in (waits for manual time-in)', () => {
      store.switchStaff({
        id: '00000000-0000-0000-0000-000000000003',
        name: 'Dante Reyes',
        role: 'mechanic',
        startOffShift: true,
      });

      const state = store.getState();
      assert.equal(state.isShiftActive, false);
      assert.equal(state.shiftStatus, 'idle');
      assert.equal(state.shiftSeconds, 0);
      assert.equal(state.currentStaff, 'Dante Reyes');
    });

    it('clears active shift state upon logout via resetShiftOnLogout', () => {
      // Clock in
      store.clockIn('Mike Morales');
      assert.equal(store.getState().isShiftActive, true);

      // Perform resetShiftOnLogout
      store.resetShiftOnLogout();

      const state = store.getState();
      assert.equal(state.isShiftActive, false);
      assert.equal(state.shiftStatus, 'idle');
      assert.equal(state.shiftSeconds, 0);
      assert.equal(state.activeShiftId, null);
    });
  });
});
