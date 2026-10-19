import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PunchStore } from '../punch-store.ts';

describe('PunchStore Multi-Staff Kiosk Isolation (SIAA-78)', () => {
  const MIKE_ID = '00000000-0000-0000-0000-000000000002';
  const DANTE_ID = '00000000-0000-0000-0000-000000000003';

  it('initializes with default profile for Mike Morales in idle state', () => {
    const store = new PunchStore();
    const state = store.getState();

    assert.equal(state.currentStaff, 'Mike Morales');
    assert.equal(state.currentProfileId, MIKE_ID);
    assert.equal(state.isShiftActive, false);
    assert.equal(state.shiftStatus, 'idle');
    assert.equal(state.shiftSeconds, 0);
  });

  it('switches staff to Dante Reyes with isolated idle state without corrupting Mike', () => {
    const store = new PunchStore();
    store.clockIn('Mike Morales', 'Terminal #01', MIKE_ID);

    store.switchStaff({ id: DANTE_ID, name: 'Dante Reyes' });
    const danteState = store.getState();

    assert.equal(danteState.currentStaff, 'Dante Reyes');
    assert.equal(danteState.currentProfileId, DANTE_ID);
    assert.equal(danteState.isShiftActive, false);
    assert.equal(danteState.shiftStatus, 'idle');
    assert.equal(danteState.shiftSeconds, 0);

    // Verify Mike's session is still stored and intact
    const mikeSession = store.getStaffSession(MIKE_ID);
    assert.ok(mikeSession);
    assert.equal(mikeSession.isShiftActive, true);
    assert.equal(mikeSession.shiftStatus, 'on_shift');
  });

  it('allows Dante Reyes to clock in while Mike Morales shift is active', () => {
    const store = new PunchStore();
    store.clockIn('Mike Morales', 'Terminal #01', MIKE_ID);

    store.switchStaff({ id: DANTE_ID, name: 'Dante Reyes' });
    store.clockIn('Dante Reyes', 'Terminal #01', DANTE_ID);

    const danteState = store.getState();
    assert.equal(danteState.isShiftActive, true);
    assert.equal(danteState.shiftStatus, 'on_shift');
    assert.equal(danteState.currentStaff, 'Dante Reyes');

    // Switch back to Mike
    store.switchStaff({ id: MIKE_ID, name: 'Mike Morales' });
    const mikeState = store.getState();
    assert.equal(mikeState.currentStaff, 'Mike Morales');
    assert.equal(mikeState.isShiftActive, true);
    assert.equal(mikeState.shiftStatus, 'on_shift');
  });

  it('ticks seconds independently for both active staff shifts', () => {
    const store = new PunchStore();
    store.clockIn('Mike Morales', 'Terminal #01', MIKE_ID);

    store.switchStaff({ id: DANTE_ID, name: 'Dante Reyes' });
    store.clockIn('Dante Reyes', 'Terminal #01', DANTE_ID);
    assert.equal(store.getState().shiftSeconds, 0);

    // Tick clock by 5 seconds
    for (let i = 0; i < 5; i++) {
      store.tickSecond();
    }

    assert.equal(store.getState().shiftSeconds, 5);

    // Switch back to Mike
    store.switchStaff({ id: MIKE_ID, name: 'Mike Morales' });
    assert.equal(store.getState().shiftSeconds, 5);
  });

  it('prevents duplicate clock in for a staff member already on shift', () => {
    const store = new PunchStore();
    store.clockIn('Mike Morales', 'Terminal #01', MIKE_ID);

    assert.throws(
      () => {
        store.clockIn('Mike Morales', 'Terminal #01', MIKE_ID);
      },
      (err: unknown) => {
        return (err as { code?: string }).code === 'ACTIVE_SHIFT_EXISTS';
      }
    );
  });

  it('allows clocking out one staff member without affecting the other', () => {
    const store = new PunchStore();
    store.clockIn('Mike Morales', 'Terminal #01', MIKE_ID);

    store.switchStaff({ id: DANTE_ID, name: 'Dante Reyes' });
    store.clockIn('Dante Reyes', 'Terminal #01', DANTE_ID);

    // Clock out Dante
    const duration = store.clockOut('Dante Reyes', DANTE_ID);
    assert.ok(duration);
    assert.equal(store.getState().isShiftActive, false);
    assert.equal(store.getState().shiftStatus, 'completed');

    // Mike remains on shift
    store.switchStaff({ id: MIKE_ID, name: 'Mike Morales' });
    assert.equal(store.getState().isShiftActive, true);
    assert.equal(store.getState().shiftStatus, 'on_shift');
  });
});
