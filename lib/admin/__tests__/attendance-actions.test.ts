import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { getAdminStaffAttendanceAction } from '../attendance-actions.ts';

describe('Admin Staff Attendance Server Actions (Feature 099)', () => {
  it('retrieves attendance shifts and metrics successfully with mock fallback', async () => {
    const res = await getAdminStaffAttendanceAction();

    assert.equal(res.success, true);
    assert.ok(Array.isArray(res.shifts), 'Shifts should be an array');
    assert.ok(res.shifts.length > 0, 'Should return shift records');
    assert.ok(res.metrics, 'Metrics object must be present');
    assert.equal(typeof res.metrics.currentlyOnShift, 'number');
    assert.equal(typeof res.metrics.currentlyOnBreak, 'number');
    assert.equal(typeof res.metrics.shiftsCompletedToday, 'number');
    assert.equal(typeof res.metrics.totalHoursLoggedToday, 'string');
  });

  it('filters shifts by status', async () => {
    const res = await getAdminStaffAttendanceAction({ status: 'on_shift' });

    assert.equal(res.success, true);
    for (const shift of res.shifts) {
      assert.equal(shift.status, 'on_shift');
    }
  });

  it('filters shifts by search query', async () => {
    const res = await getAdminStaffAttendanceAction({ searchQuery: 'Morales' });

    assert.equal(res.success, true);
    assert.ok(res.shifts.length > 0);
    for (const shift of res.shifts) {
      assert.ok(
        shift.staffName.toLowerCase().includes('morales') ||
        (shift.staffRole || '').toLowerCase().includes('morales') ||
        shift.terminalId.toLowerCase().includes('morales'),
        'Shift must match search query'
      );
    }
  });

  it('respects limit and offset parameters', async () => {
    const res = await getAdminStaffAttendanceAction({ limit: 2, offset: 0 });

    assert.equal(res.success, true);
    assert.ok(res.shifts.length <= 2, 'Shifts length must be <= limit');
  });
});
