import { z } from 'zod';

export const PunchClockActionSchema = z.enum(['in', 'out', 'break']);
export type PunchClockAction = z.infer<typeof PunchClockActionSchema>;

export const PunchClockStatusSchema = z.enum(['on_shift', 'break', 'completed', 'idle']);
export type PunchClockStatus = z.infer<typeof PunchClockStatusSchema>;

export const PunchClockStateSchema = z.object({
  isShiftActive: z.boolean(),
  shiftSeconds: z.number().int().nonnegative(),
  shiftStatus: PunchClockStatusSchema,
  currentStaff: z.string().min(1),
  terminalId: z.string().min(1),
  formattedTimer: z.string().regex(/^\d{2}:\d{2}:\d{2}$/),
});
export type PunchClockState = z.infer<typeof PunchClockStateSchema>;

export interface PunchClockAlert {
  type: 'error' | 'success' | 'warning' | 'info';
  message: string;
  timestamp: number;
}
