import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PunchStore } from '../punch-store.ts';
import type { DbStaffShift } from '../../types/logs.ts';

describe('PunchStore Shift Rehydration Engine (SIAA-79)', () => {
  let store: PunchStore;

  const mockShiftRow: DbStaffShift = {
    id: '77777777-8888-9999-aaaa-bbbbbbbbbbbb',
    profile_id: '00000000-0000-0000-0000-000000000002',
    staff_name: 'Mike Morales',
    terminal_id: 'Terminal #01',
    clock_in: new Date(Date.now() - 930 * 1000).toISOString(), // 15m 30s ago
    clock_out: null,
    duration_seconds: 0,
    status: 'on_shift',
    notes: null,
    created_at: new Date(Date.now() - 930 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 930 * 1000).toISOString(),
  };

  beforeEach(() => {
    store = new PunchStore();
  });

  it('Scenario 1 & 2: Authoritative shift rehydration calculates dynamic elapsed seconds without drift', () => {
    const fixedNow = 1700000000000;
    // Clock in was exactly 15 minutes and 30 seconds ago (930 seconds)
    const clockInIso = new Date(fixedNow - 930 * 1000).toISOString();

    const activeShift: DbStaffShift = {
      ...mockShiftRow,
      clock_in: clockInIso,
      status: 'on_shift',
    };

    store.rehydrateShift(activeShift, undefined, fixedNow);
    const state = store.getState();

    assert.equal(state.isShiftActive, true);
    assert.equal(state.shiftStatus, 'on_shift');
    assert.equal(state.shiftSeconds, 930);
    assert.equal(state.activeShiftId, activeShift.id);

    // Verify staffSessions is synchronized
    const session = store.getStaffSession(activeShift.profile_id);
    assert.ok(session !== undefined);
    assert.equal(session?.isShiftActive, true);
    assert.equal(session?.shiftStatus, 'on_shift');
    assert.equal(session?.shiftSeconds, 930);
    assert.equal(session?.activeShiftId, activeShift.id);
  });

  it('Scenario 3: Non-destructive hydration guard preserves locally active shift when remote returns null', () => {
    // 1. Employee clocks in locally
    store.clockIn('Mike Morales', 'Terminal #01', '00000000-0000-0000-0000-000000000002');
    const stateBefore = store.getState();
    assert.equal(stateBefore.isShiftActive, true);
    assert.equal(stateBefore.shiftStatus, 'on_shift');
    const localShiftId = stateBefore.activeShiftId;

    // 2. Network glitch or offline query returns activeShift: null
    store.rehydrateShift(null);
    const stateAfter = store.getState();

    // Guard must NOT wipe active shift to idle
    assert.equal(stateAfter.isShiftActive, true);
    assert.equal(stateAfter.shiftStatus, 'on_shift');
    assert.equal(stateAfter.activeShiftId, localShiftId);
  });

  it('Scenario 4: Shift clock-out succeeds with real shift ID and finalizes session state', () => {
    const fixedNow = Date.now();
    const activeShift: DbStaffShift = {
      ...mockShiftRow,
      id: '88888888-4444-2222-1111-000000000000',
      status: 'on_shift',
      clock_in: new Date(fixedNow - 3600 * 1000).toISOString(),
    };

    // Rehydrate active shift
    store.rehydrateShift(activeShift, undefined, fixedNow);
    assert.equal(store.getState().activeShiftId, '88888888-4444-2222-1111-000000000000');

    // Perform clock out
    const duration = store.clockOut('Mike Morales', activeShift.profile_id);
    assert.ok(duration.length > 0);

    const state = store.getState();
    assert.equal(state.isShiftActive, false);
    assert.equal(state.activeShiftId, null);
    assert.equal(state.shiftStatus, 'completed');

    const session = store.getStaffSession(activeShift.profile_id);
    assert.equal(session?.isShiftActive, false);
    assert.equal(session?.shiftStatus, 'completed');
  });

  it('Scenario 5: Multi-staff operator rehydration maintains isolated session states', () => {
    const profileA = '00000000-0000-0000-0000-000000000002'; // Mike Morales
    const profileB = '00000000-0000-0000-0000-000000000003'; // Dante Reyes

    const shiftA: DbStaffShift = {
      ...mockShiftRow,
      id: 'shift-mike-123',
      profile_id: profileA,
      staff_name: 'Mike Morales',
      status: 'on_shift',
    };

    store.rehydrateShift(shiftA, undefined, Date.now(), profileA);
    assert.equal(store.getState().isShiftActive, true);

    // Switch to Dante Reyes
    store.switchStaff({ id: profileB, name: 'Dante Reyes' });
    const danteState = store.getState();
    assert.equal(danteState.isShiftActive, false);
    assert.equal(danteState.currentStaff, 'Dante Reyes');

    // Switch back to Mike Morales
    store.switchStaff({ id: profileA, name: 'Mike Morales' });
    const mikeState = store.getState();
    assert.equal(mikeState.isShiftActive, true);
    assert.equal(mikeState.activeShiftId, 'shift-mike-123');
    assert.equal(mikeState.shiftStatus, 'on_shift');
  });

  it('Scenario 6: setActiveShiftId updates active shift identifier without corrupting state', () => {
    store.clockIn('Mike Morales', 'Terminal #01');
    const localId = store.getState().activeShiftId;
    assert.ok(localId?.startsWith('PUNCH-'));

    const dbAssignedUuid = '55555555-4444-3333-2222-111111111111';
    store.setActiveShiftId(dbAssignedUuid);

    const state = store.getState();
    assert.equal(state.activeShiftId, dbAssignedUuid);
    assert.equal(store.getStaffSession(state.currentProfileId)?.activeShiftId, dbAssignedUuid);
  });
});
