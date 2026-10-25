/**
 * Authoritative Server Action and API Contract for Admin Staff Attendance
 * Feature: 099-admin-staff-attendance-history
 */

export type ShiftStatus = 'on_shift' | 'break' | 'completed';
export type DatePreset = 'all' | 'today' | 'yesterday' | 'last_7_days' | 'last_30_days' | 'custom';

export interface AdminStaffShiftItem {
  id: string;
  profileId: string;
  staffName: string;
  staffRole?: string;
  terminalId: string;
  date: string; // YYYY-MM-DD
  isToday: boolean;
  timeIn: string; // Formatted 12-hour AM/PM
  clockInIso: string; // ISO 8601 UTC
  timeOut: string; // Formatted 12-hour AM/PM or "-- Active Shift --"
  clockOutIso: string | null;
  duration: string; // "XXh YYm"
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

export interface GetAdminStaffAttendanceParams {
  limit?: number;
  offset?: number;
  searchQuery?: string;
  status?: 'all' | ShiftStatus;
  datePreset?: DatePreset;
  startDate?: string;
  endDate?: string;
  profileId?: string;
}

export interface GetAdminStaffAttendanceResult {
  success: boolean;
  shifts: AdminStaffShiftItem[];
  metrics: AttendanceSummaryMetrics;
  totalCount: number;
  error?: string;
}

/**
 * Server Action Signature:
 * export async function getAdminStaffAttendanceAction(
 *   params?: GetAdminStaffAttendanceParams
 * ): Promise<GetAdminStaffAttendanceResult>;
 */
