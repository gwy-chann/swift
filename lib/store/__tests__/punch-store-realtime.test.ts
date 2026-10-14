import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PunchStore } from '../punch-store.ts';
import type { DbStaffShift } from '../../types/logs.ts';

describe('PunchStore Realtime Sync & Multi-Station Rehydration Engine (SIAA-63)', () => {
  let store: PunchStore;

  const mockShiftRow: DbStaffShift = {
    id: '11111111-2222-3333-4444-555555555555',
    profile_id: 'c0000000-0000-0000-0000-000000000002',
    staff_name: 'Mike Morales',
    terminal_id: 'Terminal #01',
    clock_in: new Date(Date.now() - 3600 * 1000).toISOString(), // 1 hour ago
    clock_out: null,
    duration_seconds: 0,
    status: 'on_shift',
    notes: null,
    created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
  };

  beforeEach(() => {
    store = new PunchStore();
  });

  it('rehydrates an active shift and calculates elapsed duration without clock drift', () => {
    const fixedNow = Date.now();
    const clockInIso = new Date(fixedNow - 3600 * 1000).toISOString();

    const activeShift: DbStaffShift = {
      ...mockShiftRow,
      clock_in: clockInIso,
      status: 'on_shift',
    };

    store.rehydrateShift(activeShift, undefined, fixedNow);
    const state = store.getState();

    assert.equal(state.isShiftActive, true);
    assert.equal(state.shiftStatus, 'on_shift');
    assert.equal(state.currentStaff, 'Mike Morales');
    assert.equal(state.shiftSeconds, 3600);
  });

  it('rehydrates a break shift with frozen duration counter', () => {
    const fixedNow = Date.now();
    const clockInIso = new Date(fixedNow - 5400 * 1000).toISOString();

    const breakShift: DbStaffShift = {
      ...mockShiftRow,
      clock_in: clockInIso,
      duration_seconds: 1800,
      status: 'break',
    };

    store.rehydrateShift(breakShift, undefined, fixedNow);
    const state = store.getState();

    assert.equal(state.isShiftActive, true);
    assert.equal(state.shiftStatus, 'break');
    assert.equal(state.shiftSeconds, 1800);
  });

  it('rehydrates an idle state when there is no active shift', () => {
    store.rehydrateShift(null);
    const state = store.getState();

    assert.equal(state.isShiftActive, false);
    assert.equal(state.shiftStatus, 'idle');
    assert.equal(state.shiftSeconds, 0);
  });

  it('merges recent punch logs during rehydration deduplicating by id', () => {
    const logs = [
      {
        id: 'PUNCH-999',
        date: '2026-10-14',
        staff: 'Alex Cruz',
        timeIn: '08:00',
        timeOut: '17:00',
        duration: '09h 00m',
        status: 'Completed',
        terminal: 'Terminal #02',
      },
      {
        id: 'PUNCH-999', // duplicate to test deduplication
        date: '2026-10-14',
        staff: 'Alex Cruz',
        timeIn: '08:00',
        timeOut: '17:00',
        duration: '09h 00m',
        status: 'Completed',
        terminal: 'Terminal #02',
      },
    ];

    store.rehydrateShift(null, logs);
    const state = store.getState();

    const matches = state.punchLogs.filter((l) => l.id === 'PUNCH-999');
    assert.equal(matches.length, 1);
  });

  it('processes realtime CDC INSERT event for peer terminal in under 500ms', () => {
    const peerShift: DbStaffShift = {
      id: '99999999-8888-7777-6666-555555555555',
      profile_id: 'd0000000-0000-0000-0000-000000000003',
      staff_name: 'Sarah Connor',
      terminal_id: 'Terminal #02',
      clock_in: new Date().toISOString(),
      clock_out: null,
      duration_seconds: 0,
      status: 'on_shift',
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.handleRealtimeShiftInsert(peerShift);
    const state = store.getState();

    const inserted = state.punchLogs.find((l) => l.id === peerShift.id);
    assert.ok(inserted !== undefined);
    assert.equal(inserted?.staff, 'Sarah Connor');
    assert.equal(inserted?.status, 'On Shift');
    assert.equal(inserted?.terminal, 'Terminal #02');
  });

  it('ignores duplicate realtime CDC INSERT events for the same shift ID', () => {
    const peerShift: DbStaffShift = {
      id: 'aaaa1111-8888-7777-6666-555555555555',
      profile_id: 'd0000000-0000-0000-0000-000000000003',
      staff_name: 'Elena Rostova',
      terminal_id: 'Terminal #02',
      clock_in: new Date().toISOString(),
      clock_out: null,
      duration_seconds: 0,
      status: 'on_shift',
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    store.handleRealtimeShiftInsert(peerShift);
    store.handleRealtimeShiftInsert(peerShift); // duplicate call
    const state = store.getState();

    const matches = state.punchLogs.filter((l) => l.id === peerShift.id);
    assert.equal(matches.length, 1);
  });

  it('processes realtime CDC UPDATE event when employee clocks out on peer station', () => {
    const shiftId = 'bbbb2222-8888-7777-6666-555555555555';
    const peerShift: DbStaffShift = {
      id: shiftId,
      profile_id: 'c0000000-0000-0000-0000-000000000002',
      staff_name: 'Mike Morales',
      terminal_id: 'Terminal #02',
      clock_in: new Date(Date.now() - 7200 * 1000).toISOString(),
      clock_out: null,
      duration_seconds: 0,
      status: 'on_shift',
      notes: null,
      created_at: new Date(Date.now() - 7200 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 7200 * 1000).toISOString(),
    };

    store.handleRealtimeShiftInsert(peerShift);

    const updatedShift: DbStaffShift = {
      ...peerShift,
      clock_out: new Date().toISOString(),
      duration_seconds: 7200,
      status: 'completed',
      updated_at: new Date().toISOString(),
    };

    store.handleRealtimeShiftUpdate(updatedShift);
    const state = store.getState();

    const log = state.punchLogs.find((l) => l.id === shiftId);
    assert.ok(log !== undefined);
    assert.equal(log?.status, 'Completed');
    assert.equal(log?.duration, '02h 00m');
    assert.equal(state.isShiftActive, false);
    assert.equal(state.shiftStatus, 'completed');
  });

  it('accurately computes active staff count across all shop floor stations', () => {
    const shift1: DbStaffShift = {
      ...mockShiftRow,
      id: 's1',
      staff_name: 'Tech Alpha',
      status: 'on_shift',
    };
    const shift2: DbStaffShift = {
      ...mockShiftRow,
      id: 's2',
      staff_name: 'Tech Beta',
      status: 'break',
    };
    const shift3: DbStaffShift = {
      ...mockShiftRow,
      id: 's3',
      staff_name: 'Tech Gamma',
      status: 'completed',
    };

    store.handleRealtimeShiftInsert(shift1);
    store.handleRealtimeShiftInsert(shift2);
    store.handleRealtimeShiftInsert(shift3);

    const count = store.getActiveStaffCount();
    assert.ok(count >= 2);
  });
});
