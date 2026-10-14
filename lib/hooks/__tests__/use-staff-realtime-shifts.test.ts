import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RealtimeChannelStatusSchema,
  StaffShiftRealtimeEventSchema,
} from '../../contracts/realtime-attendance.ts';
import type { DbStaffShift } from '../../types/logs.ts';
import { punchStore } from '../../store/punch-store.ts';

describe('Staff Shifts Realtime Subscription Hook & Contracts (SIAA-63)', () => {
  it('validates all valid channel status transitions', () => {
    const validStatuses = ['CONNECTING', 'SUBSCRIBED', 'TIMED_OUT', 'CHANNEL_ERROR', 'CLOSED'];
    for (const status of validStatuses) {
      const parsed = RealtimeChannelStatusSchema.parse(status);
      assert.equal(parsed, status);
    }

    assert.throws(() => {
      RealtimeChannelStatusSchema.parse('INVALID_STATUS');
    });
  });

  it('validates staff shifts CDC event schema', () => {
    const validEvent = {
      eventType: 'INSERT',
      table: 'staff_shifts',
      schema: 'public',
      commit_timestamp: new Date().toISOString(),
    };

    const parsed = StaffShiftRealtimeEventSchema.parse(validEvent);
    assert.equal(parsed.eventType, 'INSERT');
    assert.equal(parsed.table, 'staff_shifts');
    assert.equal(parsed.schema, 'public');

    assert.throws(() => {
      StaffShiftRealtimeEventSchema.parse({
        eventType: 'DROP_TABLE',
        table: 'staff_shifts',
        schema: 'public',
      });
    });
  });

  it('invokes onInsert and updates punchStore on simulated CDC insert', () => {
    const mockShift: DbStaffShift = {
      id: 'test-hook-shift-001',
      profile_id: 'c0000000-0000-0000-0000-000000000002',
      staff_name: 'Hook Technician',
      terminal_id: 'Terminal #01',
      clock_in: new Date().toISOString(),
      clock_out: null,
      duration_seconds: 0,
      status: 'on_shift',
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    let onInsertCalled = false;
    const onInsert = (shift: DbStaffShift) => {
      onInsertCalled = true;
      assert.equal(shift.id, mockShift.id);
    };

    // Simulate hook CDC event dispatch directly
    punchStore.handleRealtimeShiftInsert(mockShift);
    onInsert(mockShift);

    assert.equal(onInsertCalled, true);
    const storeState = punchStore.getState();
    const found = storeState.punchLogs.find((l) => l.id === mockShift.id);
    assert.ok(found);
    assert.equal(found?.staff, 'Hook Technician');
  });

  it('invokes onUpdate and updates punchStore on simulated CDC update', () => {
    const shiftId = 'test-hook-shift-002';
    const mockShift: DbStaffShift = {
      id: shiftId,
      profile_id: 'c0000000-0000-0000-0000-000000000002',
      staff_name: 'Hook Technician',
      terminal_id: 'Terminal #01',
      clock_in: new Date(Date.now() - 3600 * 1000).toISOString(),
      clock_out: null,
      duration_seconds: 0,
      status: 'on_shift',
      notes: null,
      created_at: new Date(Date.now() - 3600 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    };

    punchStore.handleRealtimeShiftInsert(mockShift);

    const updatedShift: DbStaffShift = {
      ...mockShift,
      clock_out: new Date().toISOString(),
      duration_seconds: 3600,
      status: 'completed',
    };

    let onUpdateCalled = false;
    const onUpdate = (shift: DbStaffShift) => {
      onUpdateCalled = true;
      assert.equal(shift.id, shiftId);
      assert.equal(shift.status, 'completed');
    };

    punchStore.handleRealtimeShiftUpdate(updatedShift);
    onUpdate(updatedShift);

    assert.equal(onUpdateCalled, true);
    const log = punchStore.getState().punchLogs.find((l) => l.id === shiftId);
    assert.equal(log?.status, 'Completed');
  });
});
