import { z } from 'zod';

export const ShiftStateStatusSchema = z.enum(['idle', 'on_shift', 'break', 'completed']);
export type ShiftStateStatus = z.infer<typeof ShiftStateStatusSchema>;

export const PunchLogSchema = z.object({
  id: z.string().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must match YYYY-MM-DD'),
  staff: z.string().min(1, 'Staff name is required'),
  timeIn: z.string().min(1, 'Time-In is required'),
  timeOut: z.string().min(1, 'Time-Out is required'),
  duration: z.string().min(1, 'Duration is required'),
  status: z.string().min(1, 'Status is required'),
  terminal: z.string().optional(),
});
export type PunchLog = z.infer<typeof PunchLogSchema>;

export const PunchStoreStateSchema = z.object({
  isShiftActive: z.boolean(),
  activeShiftId: z.string().nullable(),
  shiftSeconds: z.number().nonnegative(),
  punchLogs: z.array(PunchLogSchema),
  currentStaff: z.string(),
  shiftStatus: ShiftStateStatusSchema,
  lastError: z
    .object({
      code: z.string(),
      message: z.string(),
      timestamp: z.number(),
    })
    .nullable(),
  activeStaffCount: z.number().nonnegative(),
});
export type PunchStoreState = z.infer<typeof PunchStoreStateSchema>;

export interface ClockOutResult {
  durationFormatted: string;
  clockOutTime: string;
  shiftId: string;
}
