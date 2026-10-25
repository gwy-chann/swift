import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { computeAttendanceMetrics } from '../attendance-utils.ts';
import type { AdminStaffShift } from '../../types/logs.ts';

describe('Attendance Summary KPIs (US4)', () => {
  const shifts: AdminStaffShift[] = [
    {
      id: '1',
      profileId: 'p1',
      staffName: 'Cashier One',
      terminalId: 'T1',
      date: '2026-10-25',
      isToday: true,
      timeIn: '08:00 AM',
      clockInIso: '2026-10-25T08:00:00.000Z',
      timeOut: '-- Active Shift --',
      clockOutIso: null,
      duration: '02h 00m',
      durationSeconds: 7200,
      status: 'on_shift',
      statusLabel: 'On Shift',
      isExtendedShift: false,
    },
    {
      id: '2',
      profileId: 'p2',
      staffName: 'Mechanic One',
      terminalId: 'T2',
      date: '2026-10-25',
      isToday: true,
      timeIn: '08:00 AM',
      clockInIso: '2026-10-25T08:00:00.000Z',
      timeOut: '-- Active Shift --',
      clockOutIso: null,
      duration: '01h 30m',
      durationSeconds: 5400,
      status: 'break',
      statusLabel: 'Break',
      isExtendedShift: false,
    },
    {
      id: '3',
      profileId: 'p3',
      staffName: 'Clerk One',
      terminalId: 'T3',
      date: '2026-10-25',
      isToday: true,
      timeIn: '06:00 AM',
      clockInIso: '2026-10-25T06:00:00.000Z',
      timeOut: '02:00 PM',
      clockOutIso: '2026-10-25T14:00:00.000Z',
      duration: '08h 00m',
      durationSeconds: 28800,
      status: 'completed',
      statusLabel: 'Completed',
      isExtendedShift: false,
    },
    {
      id: '4',
      profileId: 'p4',
      staffName: 'Past Clerk',
      terminalId: 'T3',
      date: '2026-10-20',
      isToday: false,
      timeIn: '06:00 AM',
      clockInIso: '2026-10-20T06:00:00.000Z',
      timeOut: '02:00 PM',
      clockOutIso: '2026-10-20T14:00:00.000Z',
      duration: '08h 00m',
      durationSeconds: 28800,
      status: 'completed',
      statusLabel: 'Completed',
      isExtendedShift: false,
    },
  ];

  it('aggregates on_shift count correctly', () => {
    const ref = new Date('2026-10-25T12:00:00.000Z');
    const metrics = computeAttendanceMetrics(shifts, ref);
    assert.equal(metrics.currentlyOnShift, 1);
  });

  it('aggregates break count correctly', () => {
    const ref = new Date('2026-10-25T12:00:00.000Z');
    const metrics = computeAttendanceMetrics(shifts, ref);
    assert.equal(metrics.currentlyOnBreak, 1);
  });

  it('aggregates completed today count correctly', () => {
    const ref = new Date('2026-10-25T12:00:00.000Z');
    const metrics = computeAttendanceMetrics(shifts, ref);
    assert.equal(metrics.shiftsCompletedToday, 1);
  });

  it('sums today hours logged across all active and completed shifts', () => {
    const ref = new Date('2026-10-25T12:00:00.000Z');
    const metrics = computeAttendanceMetrics(shifts, ref);
    // 7200 + 5400 + 28800 = 41400s = 11h 30m
    assert.equal(metrics.totalHoursLoggedToday, '11h 30m');
  });
});
