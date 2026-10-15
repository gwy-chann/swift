import { z } from 'zod';

/**
 * Zod validation schema for shift status
 */
export const ShiftStatusSchema = z.enum(['On Shift', 'Completed', 'Break']);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

/**
 * Zod validation schema for an individual shift attendance log entry
 */
export const PunchLogSchema = z.object({
  id: z.string().min(1, 'Log ID is required'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be formatted YYYY-MM-DD'),
  staff: z.string().min(1, 'Staff name is required'),
  timeIn: z.string().min(1, 'Time-In is required'),
  timeOut: z.string().min(1, 'Time-Out is required'),
  duration: z.string().regex(/^\d{2}h \d{2}m$/, 'Duration must be formatted as XXh YYm'),
  status: ShiftStatusSchema,
  terminal: z.string().optional(),
  notes: z.string().optional(),
});

export type PunchLog = z.infer<typeof PunchLogSchema>;

/**
 * Component Props for AttendanceHistoryTable
 */
export interface AttendanceHistoryTableProps {
  /** Optional initial logs passed from Server Component */
  initialLogs?: PunchLog[];
  /** Optional custom title for the card header */
  title?: string;
  /** Optional terminal station label */
  terminalLabel?: string;
  /** Optional test id or container id */
  containerId?: string;
}

/**
 * Return structure for attendance history calculations
 */
export interface AttendanceSummary {
  totalShifts: number;
  totalDurationMinutes: number;
  activeShift: PunchLog | null;
}
