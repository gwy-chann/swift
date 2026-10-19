import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PunchStore, type PunchStoreError } from '../punch-store.ts';
import { ShiftRpcError, SHIFT_RPC_ERROR_CODES } from '../../contracts/punch-clock-rpcs.ts';

describe('PunchStore Concurrency Guards & Error Handling (SIAA-61)', () => {
  let store: PunchStore;

  beforeEach(() => {
    store = new PunchStore();
  });

  it('initializes with idle shift and null error state', () => {
    const state = store.getState();
    assert.equal(state.isShiftActive, false);
    assert.equal(state.shiftStatus, 'idle');
    assert.equal(state.lastError, null);
  });

  it('intercepts clockIn when shift is already active and fires ACTIVE_SHIFT_EXISTS error', () => {
    // Initiate first shift
    store.clockIn('Mike Morales');

    const errorsCaptured: PunchStoreError[] = [];
    const unsubscribe = store.onError((err) => {
      errorsCaptured.push(err);
    });

    assert.throws(
      () => {
        store.clockIn('Mike Morales');
      },
      (err) => {
        assert.ok(err instanceof ShiftRpcError);
        assert.equal(err.code, SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS);
        assert.equal(err.status, 409);
        return true;
      }
    );

    const state = store.getState();
    assert.ok(state.lastError !== null);
    assert.equal(state.lastError?.code, SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS);
    assert.equal(
      state.lastError?.message,
      'Active shift already in progress. Please clock out before starting a new shift.'
    );

    assert.equal(errorsCaptured.length, 1);
    assert.equal(errorsCaptured[0].code, SHIFT_RPC_ERROR_CODES.ACTIVE_SHIFT_EXISTS);

    unsubscribe();
  });

  it('allows clockOut to transition shift to completed and calculates duration', () => {
    store.clockIn('Mike Morales');
    store.tickSecond();

    const duration = store.clockOut('Mike Morales');
    assert.ok(duration.length > 0);

    const state = store.getState();
    assert.equal(state.isShiftActive, false);
    assert.equal(state.shiftStatus, 'completed');
    assert.equal(state.lastError, null);
    assert.equal(state.punchLogs[0].status, 'Completed');
  });

  it('allows clockIn after clockOut and resets active duration', () => {
    store.clockIn('Mike Morales');
    store.clockOut('Mike Morales');
    assert.equal(store.getState().isShiftActive, false);

    store.clockIn('Mike Morales', 'Terminal #02');
    const state = store.getState();
    assert.equal(state.isShiftActive, true);
    assert.equal(state.shiftStatus, 'on_shift');
    assert.equal(state.shiftSeconds, 0);
    assert.equal(state.punchLogs[0].terminal, 'Terminal #02');
    assert.equal(state.lastError, null);
  });

  it('supports toggleBreak back and forth between on_shift and break', () => {
    store.clockIn('Mike Morales');

    const firstStatus = store.toggleBreak();
    assert.equal(firstStatus, 'break');
    assert.equal(store.getState().shiftStatus, 'break');
    assert.equal(store.getState().punchLogs[0].status, 'Break');

    const secondStatus = store.toggleBreak();
    assert.equal(secondStatus, 'on_shift');
    assert.equal(store.getState().shiftStatus, 'on_shift');
    assert.equal(store.getState().punchLogs[0].status, 'On Shift');
  });

  it('freezes tickSecond timer progression when on break', () => {
    store.clockIn('Mike Morales');
    store.tickSecond();
    assert.equal(store.getState().shiftSeconds, 1);

    store.toggleBreak();
    store.tickSecond();
    // Seconds must not increment during break
    assert.equal(store.getState().shiftSeconds, 1);
  });

  it('rejects toggleBreak and clockOut when shift is not active', () => {
    assert.equal(store.getState().isShiftActive, false);

    assert.throws(() => {
      store.toggleBreak();
    });

    assert.throws(() => {
      store.clockOut('Mike Morales');
    });
  });

  it('clears error state when clearError is called', () => {
    store.clockIn('Mike Morales');
    try {
      store.clockIn('Mike Morales');
    } catch {
      // Expected guard error
    }
    assert.ok(store.getState().lastError !== null);

    store.clearError();
    assert.equal(store.getState().lastError, null);
  });
});
