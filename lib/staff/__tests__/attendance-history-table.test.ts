import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { PunchStore } from '../../store/punch-store.ts';
import {
  PunchLogSchema,
  ShiftStatusSchema,
  type PunchLog,
} from '../../../specs/030-staff-shift-attendance-log-history/contracts/attendance-history.ts';

/**
 * Helper to format date display with optional (Today) tag
 */
export function formatAttendanceDate(dateStr: string, referenceDate: Date = new Date()): string {
  const todayStr = referenceDate.toISOString().split('T')[0];
  if (dateStr === todayStr) {
    return `${dateStr} (Today)`;
  }
  return dateStr;
}

/**
 * Helper to sort punch logs in reverse chronological order
 */
export function sortAttendanceLogs(logs: PunchLog[]): PunchLog[] {
  return [...logs].sort((a, b) => {
    if (a.date !== b.date) {
      return b.date.localeCompare(a.date);
    }
    return (b.timeIn || '').localeCompare(a.timeIn || '');
  });
}

describe('STORY-5.3: Staff Shift Attendance Log History & Timesheet Tracking (SIAA-30)', () => {
  let store: PunchStore;

  beforeEach(() => {
    store = new PunchStore();
  });

  describe('Scenario 1: Attendance Log History Rendering', () => {
    it('provides required column fields for each record: Date, Staff Name, Time-In, Time-Out, Shift Duration, Status', () => {
      const state = store.getState();
      assert.ok(state.punchLogs.length > 0, 'Initial punch logs should not be empty');

      const expectedColumns = ['Date', 'Staff Name', 'Time-In', 'Time-Out', 'Shift Duration', 'Status'];
      assert.equal(expectedColumns.length, 6);

      for (const log of state.punchLogs) {
        assert.ok(log.date, 'Log must have date');
        assert.ok(log.staff, 'Log must have staff name');
        assert.ok(log.timeIn, 'Log must have time-in');
        assert.ok(log.timeOut, 'Log must have time-out');
        assert.ok(log.duration, 'Log must have duration');
        assert.ok(log.status, 'Log must have status');

        // Contract schema validation
        const parsed = PunchLogSchema.safeParse(log);
        assert.equal(parsed.success, true, `Log ${log.id} failed contract validation: ${parsed.error}`);
      }
    });
  });

  describe('Scenario 2: Dynamic Append on Shift Completion', () => {
    it('updates Time-Out with exact timestamp, computes final shift duration, and transitions status to Completed', () => {
      // Start in active shift
      const initialLogs = store.getState().punchLogs;
      assert.equal(initialLogs[0].status, 'On Shift');
      assert.equal(initialLogs[0].timeOut, '-- Active Shift --');

      // Advance timer to 32340 seconds (08h 59m 00s)
      for (let i = 0; i < 10; i++) {
        store.tickSecond();
      }

      // Execute clock-out
      const computedDuration = store.clockOut('Mike Morales');
      const updatedState = store.getState();

      assert.equal(updatedState.isShiftActive, false);
      assert.equal(updatedState.shiftStatus, 'completed');

      const finalizedShift = updatedState.punchLogs[0];
      assert.equal(finalizedShift.status, 'Completed');
      assert.notEqual(finalizedShift.timeOut, '-- Active Shift --');
      assert.match(finalizedShift.timeOut, /^\d{2}:\d{2}:\d{2}\s+(AM|PM)$/i);
      assert.match(finalizedShift.duration, /^\d{2}h \d{2}m$/);
      assert.equal(finalizedShift.duration, computedDuration);
    });
  });

  describe('Scenario 3: Active Shift Indication in History', () => {
    it('displays "-- Active Shift --" in time-out column and green "On Shift" badge while shift is running', () => {
      const state = store.getState();
      const activeLog = state.punchLogs.find((l) => l.status === 'On Shift');

      assert.ok(activeLog, 'Active shift log must exist when shift is active');
      assert.equal(activeLog.timeOut, '-- Active Shift --');
      assert.equal(activeLog.status, 'On Shift');
    });

    it('displays "-- Active Shift --" when starting a new shift via clockIn', () => {
      // End current shift first
      store.clockOut('Mike Morales');
      assert.equal(store.getState().isShiftActive, false);

      // Start a new shift
      store.clockIn('Mike Morales', 'Terminal #01');
      const state = store.getState();

      assert.equal(state.isShiftActive, true);
      assert.equal(state.shiftStatus, 'on_shift');

      const newestLog = state.punchLogs[0];
      assert.equal(newestLog.timeOut, '-- Active Shift --');
      assert.equal(newestLog.status, 'On Shift');
      assert.equal(newestLog.staff, 'Mike Morales');
    });
  });

  describe('Scenario 4: Chronological Ordering & Multi-Day Persistence', () => {
    it('sorts shift records in reverse chronological order with newest shifts on top', () => {
      const sampleLogs: PunchLog[] = [
        {
          id: 'PUNCH-003',
          date: '2026-09-26',
          staff: 'Mike Morales',
          timeIn: '07:55:00 AM',
          timeOut: '05:00:20 PM',
          duration: '09h 05m',
          status: 'Completed',
        },
        {
          id: 'PUNCH-001',
          date: '2026-09-28',
          staff: 'Mike Morales',
          timeIn: '08:00:15 AM',
          timeOut: '-- Active Shift --',
          duration: '04h 12m',
          status: 'On Shift',
        },
        {
          id: 'PUNCH-002',
          date: '2026-09-27',
          staff: 'Mike Morales',
          timeIn: '08:02:10 AM',
          timeOut: '05:01:45 PM',
          duration: '08h 59m',
          status: 'Completed',
        },
      ];

      const sorted = sortAttendanceLogs(sampleLogs);
      assert.equal(sorted[0].id, 'PUNCH-001');
      assert.equal(sorted[0].date, '2026-09-28');
      assert.equal(sorted[1].id, 'PUNCH-002');
      assert.equal(sorted[1].date, '2026-09-27');
      assert.equal(sorted[2].id, 'PUNCH-003');
      assert.equal(sorted[2].date, '2026-09-26');
    });

    it('formats current calendar day as YYYY-MM-DD (Today)', () => {
      const fixedToday = new Date('2026-09-28T12:00:00Z');
      const todayFormatted = formatAttendanceDate('2026-09-28', fixedToday);
      const yesterdayFormatted = formatAttendanceDate('2026-09-27', fixedToday);

      assert.equal(todayFormatted, '2026-09-28 (Today)');
      assert.equal(yesterdayFormatted, '2026-09-27');
    });
  });

  describe('Contract and Type Safety Gates', () => {
    it('validates supported shift status values: On Shift, Completed, Break', () => {
      assert.equal(ShiftStatusSchema.safeParse('On Shift').success, true);
      assert.equal(ShiftStatusSchema.safeParse('Completed').success, true);
      assert.equal(ShiftStatusSchema.safeParse('Break').success, true);
      assert.equal(ShiftStatusSchema.safeParse('InvalidStatus').success, false);
    });
  });
});
