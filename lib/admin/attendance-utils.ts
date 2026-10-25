import type {
  AdminStaffShift,
  AttendanceFilterState,
  AttendanceSummaryMetrics,
  DatePreset,
} from '../types/logs.ts';

/**
 * Formats a duration in seconds to "HHh MMm" (e.g., 28800 -> "08h 00m").
 */
export function formatSecondsToDuration(seconds: number | null | undefined): string {
  if (seconds === null || seconds === undefined || seconds < 0 || Number.isNaN(seconds)) {
    return '00h 00m';
  }
  const totalMinutes = Math.floor(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Computes elapsed seconds between clockIn and clockOut (or current time if open).
 * Safely handles midnight crossing via absolute epoch millisecond math.
 */
export function computeElapsedShiftSeconds(
  clockInIso: string,
  clockOutIso?: string | null,
  breakSeconds: number = 0,
  referenceNowMs: number = Date.now()
): number {
  const inMs = new Date(clockInIso).getTime();
  if (Number.isNaN(inMs)) return 0;

  const outMs = clockOutIso ? new Date(clockOutIso).getTime() : referenceNowMs;
  if (Number.isNaN(outMs)) return 0;

  const elapsedMs = Math.max(0, outMs - inMs);
  const rawSeconds = Math.floor(elapsedMs / 1000);
  return Math.max(0, rawSeconds - Math.max(0, breakSeconds));
}

/**
 * Formats an ISO UTC timestamp to 12-hour local time format with AM/PM (e.g. "08:30:00 AM").
 */
export function formatWallClockTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';

  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}

/**
 * Formats an ISO UTC timestamp to YYYY-MM-DD and checks if it matches today.
 */
export function formatShiftDate(
  iso: string,
  referenceDate: Date = new Date()
): { dateStr: string; isToday: boolean } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return { dateStr: '—', isToday: false };
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  const todayYear = referenceDate.getFullYear();
  const todayMonth = String(referenceDate.getMonth() + 1).padStart(2, '0');
  const todayDay = String(referenceDate.getDate()).padStart(2, '0');
  const todayStr = `${todayYear}-${todayMonth}-${todayDay}`;

  return {
    dateStr,
    isToday: dateStr === todayStr,
  };
}

/**
 * Returns true if shift duration exceeds 16 continuous hours (57,600s).
 */
export function isExtendedShift(seconds: number): boolean {
  return seconds > 16 * 3600;
}

function isWithinCustomDateRange(
  shiftDateStr: string,
  customStart?: string,
  customEnd?: string
): boolean {
  if (customStart && shiftDateStr < customStart) return false;
  if (customEnd && shiftDateStr > customEnd) return false;
  return true;
}

function getDayStartTimestamp(today: Date, offsetDays: number): number {
  const targetDate = new Date(today);
  targetDate.setDate(targetDate.getDate() - offsetDays);
  return targetDate.getTime();
}

/**
 * Determines whether a given shift date string (YYYY-MM-DD) falls within a date preset.
 */
export function isDateWithinPreset(
  shiftDateStr: string,
  preset: DatePreset,
  customStart?: string,
  customEnd?: string,
  referenceNow: Date = new Date()
): boolean {
  if (preset === 'all') return true;

  if (preset === 'custom') {
    return isWithinCustomDateRange(shiftDateStr, customStart, customEnd);
  }

  const shiftDate = new Date(`${shiftDateStr}T00:00:00`);
  if (Number.isNaN(shiftDate.getTime())) return false;

  const today = new Date(referenceNow.getFullYear(), referenceNow.getMonth(), referenceNow.getDate());
  const todayTime = today.getTime();
  const shiftTime = shiftDate.getTime();

  if (preset === 'today') {
    return shiftTime === todayTime;
  }

  if (preset === 'yesterday') {
    return shiftTime === getDayStartTimestamp(today, 1);
  }

  if (preset === 'last_7_days') {
    return shiftTime >= getDayStartTimestamp(today, 6) && shiftTime <= todayTime;
  }

  if (preset === 'last_30_days') {
    return shiftTime >= getDayStartTimestamp(today, 29) && shiftTime <= todayTime;
  }

  return true;
}

/**
 * Filters a list of AdminStaffShift records against an AttendanceFilterState.
 */
export function filterAdminShifts(
  shifts: AdminStaffShift[],
  filterState: AttendanceFilterState,
  referenceNow: Date = new Date()
): AdminStaffShift[] {
  return shifts.filter((shift) => {
    // 1. Text Search Query
    if (filterState.searchQuery && filterState.searchQuery.trim() !== '') {
      const q = filterState.searchQuery.toLowerCase().trim();
      const nameMatch = shift.staffName.toLowerCase().includes(q);
      const roleMatch = (shift.staffRole || '').toLowerCase().includes(q);
      const terminalMatch = shift.terminalId.toLowerCase().includes(q);
      if (!nameMatch && !roleMatch && !terminalMatch) {
        return false;
      }
    }

    // 2. Status Filter
    if (filterState.statusFilter && filterState.statusFilter !== 'all') {
      if (shift.status !== filterState.statusFilter) {
        return false;
      }
    }

    // 3. Specific Staff Selection
    if (filterState.selectedStaffId && filterState.selectedStaffId !== 'all') {
      if (shift.profileId !== filterState.selectedStaffId) {
        return false;
      }
    }

    // 4. Date Preset / Range Filter
    return isDateWithinPreset(
      shift.date,
      filterState.datePreset,
      filterState.startDate,
      filterState.endDate,
      referenceNow
    );
  });
}

/**
 * Computes high-level AttendanceSummaryMetrics from a set of shifts.
 */
export function computeAttendanceMetrics(
  shifts: AdminStaffShift[],
  referenceDate: Date = new Date()
): AttendanceSummaryMetrics {
  let currentlyOnShift = 0;
  let currentlyOnBreak = 0;
  let shiftsCompletedToday = 0;
  let totalTodaySeconds = 0;

  const todayPart = referenceDate.toISOString().slice(0, 10);

  for (const shift of shifts) {
    if (shift.status === 'on_shift') {
      currentlyOnShift += 1;
    } else if (shift.status === 'break') {
      currentlyOnBreak += 1;
    }

    const isTodayShift = shift.date === todayPart || shift.isToday;

    if (isTodayShift) {
      if (shift.status === 'completed') {
        shiftsCompletedToday += 1;
      }
      totalTodaySeconds += shift.durationSeconds || 0;
    }
  }

  return {
    currentlyOnShift,
    currentlyOnBreak,
    shiftsCompletedToday,
    totalHoursLoggedToday: formatSecondsToDuration(totalTodaySeconds),
    totalRecordsCount: shifts.length,
  };
}
