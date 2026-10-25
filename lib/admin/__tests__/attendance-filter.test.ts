import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { filterAdminShifts } from '../attendance-utils.ts';
import type { AdminStaffShift, AttendanceFilterState } from '../../types/logs.ts';

describe('Attendance Filter Engine (US3)', () => {
  const sampleShifts: AdminStaffShift[] = [
    {
      id: 's1',
      profileId: 'prof-cashier',
      staffName: 'Mike Morales',
      staffRole: 'Cashier',
      terminalId: 'Terminal #01',
      date: '2026-10-25',
      isToday: true,
      timeIn: '08:00 AM',
      clockInIso: '2026-10-25T08:00:00.000Z',
      timeOut: '-- Active Shift --',
      clockOutIso: null,
      duration: '04h 00m',
      durationSeconds: 14400,
      status: 'on_shift',
      statusLabel: 'On Shift',
      isExtendedShift: false,
    },
    {
      id: 's2',
      profileId: 'prof-mechanic',
      staffName: 'Dante Reyes',
      staffRole: 'Senior Mechanic',
      terminalId: 'Bay #02',
      date: '2026-10-25',
      isToday: true,
      timeIn: '08:30 AM',
      clockInIso: '2026-10-25T08:30:00.000Z',
      timeOut: '-- Active Shift --',
      clockOutIso: null,
      duration: '03h 30m',
      durationSeconds: 12600,
      status: 'break',
      statusLabel: 'Break',
      isExtendedShift: false,
    },
    {
      id: 's3',
      profileId: 'prof-clerk',
      staffName: 'Rico Santos',
      staffRole: 'Inventory Clerk',
      terminalId: 'Warehouse Kiosk',
      date: '2026-10-24',
      isToday: false,
      timeIn: '06:00 AM',
      clockInIso: '2026-10-24T06:00:00.000Z',
      timeOut: '02:30 PM',
      clockOutIso: '2026-10-24T14:30:00.000Z',
      duration: '08h 30m',
      durationSeconds: 30600,
      status: 'completed',
      statusLabel: 'Completed',
      isExtendedShift: false,
    },
  ];

  it('filters by matching staff name case-insensitively', () => {
    const filters: AttendanceFilterState = {
      searchQuery: 'dante',
      statusFilter: 'all',
      datePreset: 'all',
    };
    const res = filterAdminShifts(sampleShifts, filters);
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 's2');
  });

  it('filters by terminal identifier', () => {
    const filters: AttendanceFilterState = {
      searchQuery: 'warehouse',
      statusFilter: 'all',
      datePreset: 'all',
    };
    const res = filterAdminShifts(sampleShifts, filters);
    assert.equal(res.length, 1);
    assert.equal(res[0].staffName, 'Rico Santos');
  });

  it('filters by status: completed', () => {
    const filters: AttendanceFilterState = {
      searchQuery: '',
      statusFilter: 'completed',
      datePreset: 'all',
    };
    const res = filterAdminShifts(sampleShifts, filters);
    assert.equal(res.length, 1);
    assert.equal(res[0].id, 's3');
  });

  it('filters by date preset: today', () => {
    const refDate = new Date('2026-10-25T12:00:00.000Z');
    const filters: AttendanceFilterState = {
      searchQuery: '',
      statusFilter: 'all',
      datePreset: 'today',
    };
    const res = filterAdminShifts(sampleShifts, filters, refDate);
    assert.equal(res.length, 2);
  });

  it('returns empty array when no records match filter criteria', () => {
    const filters: AttendanceFilterState = {
      searchQuery: 'NonExistentPerson',
      statusFilter: 'all',
      datePreset: 'all',
    };
    const res = filterAdminShifts(sampleShifts, filters);
    assert.equal(res.length, 0);
  });
});
