import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatSecondsToDuration,
  computeElapsedShiftSeconds,
  formatShiftDate,
  formatWallClockTime,
  isExtendedShift,
  isDateWithinPreset,
  filterAdminShifts,
  computeAttendanceMetrics,
} from '../attendance-utils.ts';
import type { AdminStaffShift, AttendanceFilterState } from '../../types/logs.ts';

describe('attendance-utils', () => {
  describe('formatSecondsToDuration', () => {
    it('formats seconds into "HHh MMm"', () => {
      assert.equal(formatSecondsToDuration(0), '00h 00m');
      assert.equal(formatSecondsToDuration(3600), '01h 00m');
      assert.equal(formatSecondsToDuration(3665), '01h 01m');
      assert.equal(formatSecondsToDuration(28800), '08h 00m');
      assert.equal(formatSecondsToDuration(30900), '08h 35m');
    });

    it('handles negative, null, undefined, or NaN gracefully', () => {
      assert.equal(formatSecondsToDuration(null), '00h 00m');
      assert.equal(formatSecondsToDuration(undefined), '00h 00m');
      assert.equal(formatSecondsToDuration(-100), '00h 00m');
      assert.equal(formatSecondsToDuration(NaN), '00h 00m');
    });
  });

  describe('computeElapsedShiftSeconds', () => {
    it('calculates duration for a closed shift with break deduction', () => {
      const clockIn = '2026-10-25T08:00:00.000Z';
      const clockOut = '2026-10-25T17:00:00.000Z'; // 9 hours = 32400s
      const breakSec = 1800; // 30 mins
      const elapsed = computeElapsedShiftSeconds(clockIn, clockOut, breakSec);
      assert.equal(elapsed, 30600); // 8h 30m
    });

    it('calculates duration across midnight without error', () => {
      const clockIn = '2026-10-24T22:00:00.000Z';
      const clockOut = '2026-10-25T06:00:00.000Z'; // 8 hours = 28800s
      const elapsed = computeElapsedShiftSeconds(clockIn, clockOut, 0);
      assert.equal(elapsed, 28800);
    });

    it('calculates duration for open/active shift using reference now', () => {
      const clockIn = '2026-10-25T08:00:00.000Z';
      const refNow = new Date('2026-10-25T12:00:00.000Z').getTime(); // 4 hours
      const elapsed = computeElapsedShiftSeconds(clockIn, null, 0, refNow);
      assert.equal(elapsed, 14400);
    });
  });

  describe('isExtendedShift', () => {
    it('detects shifts longer than 16 hours', () => {
      assert.equal(isExtendedShift(15 * 3600), false);
      assert.equal(isExtendedShift(16 * 3600), false);
      assert.equal(isExtendedShift(16 * 3600 + 1), true);
      assert.equal(isExtendedShift(20 * 3600), true);
    });
  });

  describe('formatShiftDate and formatWallClockTime', () => {
    it('formats date and identifies today', () => {
      const ref = new Date('2026-10-25T12:00:00.000Z');
      const todayRes = formatShiftDate('2026-10-25T08:00:00.000Z', ref);
      assert.equal(todayRes.dateStr, '2026-10-25');
      assert.equal(todayRes.isToday, true);

      const yesterdayRes = formatShiftDate('2026-10-24T08:00:00.000Z', ref);
      assert.equal(yesterdayRes.dateStr, '2026-10-24');
      assert.equal(yesterdayRes.isToday, false);
    });

    it('formats wall clock time or returns placeholder', () => {
      assert.equal(formatWallClockTime(null), '—');
      assert.equal(formatWallClockTime('invalid'), '—');
      const timeStr = formatWallClockTime('2026-10-25T08:30:00.000Z');
      assert.equal(typeof timeStr, 'string');
      assert.notEqual(timeStr, '—');
    });
  });

  describe('isDateWithinPreset', () => {
    const refNow = new Date('2026-10-25T12:00:00.000Z');

    it('handles "all" preset', () => {
      assert.equal(isDateWithinPreset('2026-01-01', 'all', undefined, undefined, refNow), true);
    });

    it('handles "today" preset', () => {
      assert.equal(isDateWithinPreset('2026-10-25', 'today', undefined, undefined, refNow), true);
      assert.equal(isDateWithinPreset('2026-10-24', 'today', undefined, undefined, refNow), false);
    });

    it('handles "yesterday" preset', () => {
      assert.equal(isDateWithinPreset('2026-10-24', 'yesterday', undefined, undefined, refNow), true);
      assert.equal(isDateWithinPreset('2026-10-25', 'yesterday', undefined, undefined, refNow), false);
    });

    it('handles "custom" preset', () => {
      assert.equal(isDateWithinPreset('2026-10-20', 'custom', '2026-10-15', '2026-10-22', refNow), true);
      assert.equal(isDateWithinPreset('2026-10-10', 'custom', '2026-10-15', '2026-10-22', refNow), false);
    });
  });

  describe('filterAdminShifts and computeAttendanceMetrics', () => {
    const mockShifts: AdminStaffShift[] = [
      {
        id: '1',
        profileId: 'p1',
        staffName: 'Mike Morales',
        staffRole: 'Cashier',
        terminalId: 'Terminal #1',
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
        id: '2',
        profileId: 'p2',
        staffName: 'Dante Reyes',
        staffRole: 'Mechanic',
        terminalId: 'Bay #2',
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
        id: '3',
        profileId: 'p3',
        staffName: 'Rico Santos',
        staffRole: 'Inventory Clerk',
        terminalId: 'Warehouse',
        date: '2026-10-24',
        isToday: false,
        timeIn: '07:00 AM',
        clockInIso: '2026-10-24T07:00:00.000Z',
        timeOut: '03:00 PM',
        clockOutIso: '2026-10-24T15:00:00.000Z',
        duration: '08h 00m',
        durationSeconds: 28800,
        status: 'completed',
        statusLabel: 'Completed',
        isExtendedShift: false,
      },
    ];

    it('filters by search term', () => {
      const state: AttendanceFilterState = {
        searchQuery: 'dante',
        statusFilter: 'all',
        datePreset: 'all',
      };
      const filtered = filterAdminShifts(mockShifts, state);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].staffName, 'Dante Reyes');
    });

    it('filters by status', () => {
      const state: AttendanceFilterState = {
        searchQuery: '',
        statusFilter: 'on_shift',
        datePreset: 'all',
      };
      const filtered = filterAdminShifts(mockShifts, state);
      assert.equal(filtered.length, 1);
      assert.equal(filtered[0].staffName, 'Mike Morales');
    });

    it('computes metrics accurately', () => {
      const ref = new Date('2026-10-25T12:00:00.000Z');
      const metrics = computeAttendanceMetrics(mockShifts, ref);
      assert.equal(metrics.currentlyOnShift, 1);
      assert.equal(metrics.currentlyOnBreak, 1);
      assert.equal(metrics.shiftsCompletedToday, 0);
      assert.equal(metrics.totalRecordsCount, 3);
    });
  });
});
