import { z } from 'zod';

export const ShiftStatusSchema = z.enum(['on_shift', 'break', 'completed']);
export type ShiftStatus = z.infer<typeof ShiftStatusSchema>;

export const ClockInRequestSchema = z.object({
  staffId: z.string().uuid('Invalid staff profile UUID'),
  terminalId: z.string().optional().default('Terminal #01'),
  notes: z.string().optional(),
});
export type ClockInRequest = z.infer<typeof ClockInRequestSchema>;

export const ClockOutRequestSchema = z.object({
  shiftId: z.string().uuid('Invalid shift UUID'),
  staffId: z.string().uuid().optional(),
  notes: z.string().optional(),
});
export type ClockOutRequest = z.infer<typeof ClockOutRequestSchema>;

export const ToggleBreakRequestSchema = z.object({
  shiftId: z.string().uuid('Invalid shift UUID'),
  staffId: z.string().uuid().optional(),
});
export type ToggleBreakRequest = z.infer<typeof ToggleBreakRequestSchema>;

export const ShiftResponseSchema = z.object({
  id: z.string().uuid(),
  staffId: z.string().uuid(),
  staffName: z.string(),
  terminalId: z.string(),
  clockIn: z.string().datetime(),
  clockOut: z.string().datetime().nullable(),
  durationSeconds: z.number().int().nonnegative().nullable(),
  durationFormatted: z.string().nullable(),
  status: ShiftStatusSchema,
  notes: z.string().nullable(),
  createdAt: z.string().datetime(),
});
export type ShiftResponse = z.infer<typeof ShiftResponseSchema>;

export const ActiveShiftResponseSchema = z.object({
  hasActiveShift: z.boolean(),
  shift: ShiftResponseSchema.nullable(),
  activeDurationSeconds: z.number().int().nonnegative().nullable(),
  activeDurationFormatted: z.string().nullable(),
});
export type ActiveShiftResponse = z.infer<typeof ActiveShiftResponseSchema>;

export const AttendanceHistoryResponseSchema = z.object({
  shifts: z.array(ShiftResponseSchema),
  activeShift: ShiftResponseSchema.nullable(),
  totalMinutesWorked: z.number().int().nonnegative(),
  page: z.number().int().nonnegative(),
  size: z.number().int().positive(),
  totalElements: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});
export type AttendanceHistoryResponse = z.infer<typeof AttendanceHistoryResponseSchema>;

export const ShiftErrorResponseSchema = z.object({
  timestamp: z.string(),
  status: z.number().int(),
  error: z.string(),
  message: z.string(),
  code: z.string().optional(),
  path: z.string(),
});
export type ShiftErrorResponse = z.infer<typeof ShiftErrorResponseSchema>;
