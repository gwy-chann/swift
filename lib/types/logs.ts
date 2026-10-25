export interface StockAdjustmentLog {
  id: string;
  timestamp: string;
  sku: string;
  type: 'Audit Adjustment' | 'Restock Inbound' | 'Damaged Goods' | 'Shrinkage' | string;
  change: string; // e.g. "-2 Units", "+24 Units"
  reason: string;
  user: string;
}

export interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  ip: string;
}

export interface PunchLog {
  id?: string;
  date: string;
  staff: string;
  timeIn: string;
  timeOut: string;
  duration: string;
  status: 'On Shift' | 'Completed' | 'Break' | string;
  terminal?: string;
}

/** Raw database row shape for the public.staff_shifts table (SIAA-60). */
export interface DbStaffShift {
  id: string;
  profile_id: string;
  staff_name: string;
  terminal_id: string;
  clock_in: string; // ISO 8601 UTC
  clock_out: string | null;
  duration_seconds: number | null;
  status: 'on_shift' | 'break' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}

const STATUS_LABELS: Record<DbStaffShift['status'], string> = {
  on_shift: 'On Shift',
  break: 'Break',
  completed: 'Completed',
};

const ACTIVE_PLACEHOLDER = '—';

/** Formats an ISO 8601 timestamp as a YYYY-MM-DD date (UTC). */
function formatShiftDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return ACTIVE_PLACEHOLDER;
  return date.toISOString().slice(0, 10);
}

/** Formats an ISO 8601 timestamp as HH:mm wall-clock time (UTC). */
function formatClockTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return ACTIVE_PLACEHOLDER;
  return date.toISOString().slice(11, 16);
}

/** Formats a shift duration in seconds as "HHh MMm"; null or zero renders the placeholder. */
function formatShiftDuration(seconds: number | null): string {
  if (seconds === null || seconds <= 0) return ACTIVE_PLACEHOLDER;
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
}

/**
 * Translates a raw public.staff_shifts row into the UI PunchLog display item.
 * Total function: defined for every DbStaffShift value and never throws.
 */
export function mapStaffShiftRow(row: DbStaffShift): PunchLog {
  const hasClockedOut = row.clock_out !== null && row.clock_out !== undefined;

  return {
    id: row.id,
    date: formatShiftDate(row.clock_in),
    staff: row.staff_name,
    timeIn: formatClockTime(row.clock_in),
    timeOut: hasClockedOut ? formatClockTime(row.clock_out as string) : ACTIVE_PLACEHOLDER,
    duration: formatShiftDuration(row.duration_seconds),
    status: STATUS_LABELS[row.status] ?? row.status,
    terminal: row.terminal_id,
  };
}

// ---------------------------------------------------------------------------
// Admin Staff Attendance Domain Types (Feature 099)
// ---------------------------------------------------------------------------

export type ShiftStatus = 'on_shift' | 'break' | 'completed';
export type DatePreset = 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'custom';

export interface AdminStaffShift {
  id: string;
  profileId: string;
  staffName: string;
  staffRole?: string;
  terminalId: string;
  date: string;
  isToday: boolean;
  timeIn: string;
  clockInIso: string;
  timeOut: string;
  clockOutIso: string | null;
  duration: string;
  durationSeconds: number;
  status: ShiftStatus;
  statusLabel: 'On Shift' | 'Break' | 'Completed';
  isExtendedShift: boolean;
  notes?: string | null;
}

export interface AttendanceSummaryMetrics {
  currentlyOnShift: number;
  currentlyOnBreak: number;
  shiftsCompletedToday: number;
  totalHoursLoggedToday: string;
  totalRecordsCount: number;
}

export interface AttendanceFilterState {
  searchQuery: string;
  statusFilter: 'all' | ShiftStatus;
  datePreset: DatePreset;
  startDate?: string;
  endDate?: string;
  selectedStaffId?: string;
}

