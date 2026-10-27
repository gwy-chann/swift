import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mapStaffShiftRow, type DbStaffShift } from '../../types/logs.ts';

function baseRow(overrides: Partial<DbStaffShift> = {}): DbStaffShift {
  return {
    id: 's0000000-0000-0000-0000-000000000003',
    profile_id: 'c0000000-0000-0000-0000-000000000002',
    staff_name: 'Maria Santos',
    terminal_id: 'Terminal #01',
    clock_in: '2026-10-06T08:02:10.000Z',
    clock_out: null,
    duration_seconds: null,
    status: 'on_shift',
    notes: null,
    created_at: '2026-10-06T08:02:10.000Z',
    updated_at: '2026-10-06T08:02:10.000Z',
    ...overrides,
  };
}

describe('Staff Shift Row Mapper (SIAA-60)', () => {
  it('maps a completed shift row to a PunchLog display item', () => {
    const row = baseRow({
      status: 'completed',
      clock_out: '2026-10-06T17:01:45.000Z',
      duration_seconds: 32340,
    });

    const log = mapStaffShiftRow(row);

    assert.equal(log.id, 's0000000-0000-0000-0000-000000000003');
    assert.equal(log.staff, 'Maria Santos');
    assert.equal(log.status, 'Completed');
    assert.equal(log.date, '2026-10-06');
    assert.match(log.timeIn, /^\d{2}:\d{2}:\d{2}\s+(AM|PM)$/i);
    assert.match(log.timeOut, /^\d{2}:\d{2}:\d{2}\s+(AM|PM)$/i);
    assert.equal(log.duration, '08h 59m');
    assert.equal(log.terminal, 'Terminal #01');
  });

  it('renders an active on_shift row with null clock_out as the active-shift placeholder', () => {
    const row = baseRow({ status: 'on_shift', clock_out: null, duration_seconds: null });

    const log = mapStaffShiftRow(row);

    assert.equal(log.status, 'On Shift');
    assert.equal(log.timeOut, '—');
    assert.equal(log.duration, '—');
  });

  it("normalizes break status to the established 'Break' label", () => {
    const log = mapStaffShiftRow(baseRow({ status: 'break' }));

    assert.equal(log.status, 'Break');
  });

  it('treats a zero duration as the placeholder rather than 00h 00m', () => {
    const log = mapStaffShiftRow(
      baseRow({ status: 'completed', clock_out: '2026-10-06T17:01:45.000Z', duration_seconds: 0 }),
    );

    assert.equal(log.duration, '—');
  });

  it('never leaks snake_case keys into the mapped output', () => {
    const log = mapStaffShiftRow(baseRow());
    const keys = Object.keys(log);

    assert.ok(!keys.includes('staff_name'));
    assert.ok(!keys.includes('clock_in'));
    assert.ok(!keys.includes('clock_out'));
    assert.ok(!keys.includes('terminal_id'));
    assert.ok(!keys.includes('duration_seconds'));
  });
});
