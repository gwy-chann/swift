/**
 * Shift Rehydration Contracts & Type Definitions
 * Feature: 079-shift-rehydration (SIAA-79)
 */

import { z } from 'zod';
import type { DbStaffShift, PunchLog } from '@/lib/types/logs';

export const ShiftStatusEnum = z.enum(['on_shift', 'break', 'completed', 'idle']);
export type ShiftStatus = z.infer<typeof ShiftStatusEnum>;

export const RehydrateShiftParamsSchema = z.object({
  activeShift: z.custom<DbStaffShift | null>(),
  recentLogs: z.array(z.custom<PunchLog>()).optional(),
  nowTimestamp: z.number().optional(),
  profileId: z.string().uuid().optional(),
});
export type RehydrateShiftParams = z.infer<typeof RehydrateShiftParamsSchema>;

export const AttendanceHistoryResponseSchema = z.object({
  success: z.boolean(),
  logs: z.array(z.custom<PunchLog>()),
  activeShift: z.custom<DbStaffShift | null>(),
  code: z.string().optional(),
  error: z.string().optional(),
});
export type AttendanceHistoryResponse = z.infer<typeof AttendanceHistoryResponseSchema>;

export interface ShiftTimerCalculations {
  calculateElapsedSeconds(clockInIso: string, nowMs?: number): number;
  formatDuration(seconds: number): string;
}
