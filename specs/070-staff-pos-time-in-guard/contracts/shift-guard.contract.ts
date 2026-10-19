/**
 * SIAA-74: Active Shift Time-In Guard Contracts & Types
 */

import { z } from 'zod';
import type { ShiftStateStatus } from '@/lib/store/punch-store';

export const ShiftGuardEvaluationSchema = z.object({
  isAllowed: z.boolean(),
  shiftStatus: z.enum(['on_shift', 'break', 'completed', 'idle']),
  currentStaff: z.string().nullable(),
  reason: z.enum(['NOT_CLOCKED_IN', 'ON_BREAK', 'SHIFT_COMPLETED', 'OK']),
  message: z.string().optional()
});

export type ShiftGuardEvaluation = z.infer<typeof ShiftGuardEvaluationSchema>;

/**
 * Pure evaluator for shift attendance guard on POS checkout.
 */
export function evaluateShiftGuard(
  isShiftActive: boolean,
  shiftStatus: ShiftStateStatus,
  currentStaff?: string | null
): ShiftGuardEvaluation {
  if (!isShiftActive || shiftStatus === 'idle') {
    return {
      isAllowed: false,
      shiftStatus,
      currentStaff: currentStaff ?? null,
      reason: 'NOT_CLOCKED_IN',
      message: 'Active Shift Required: You must clock in / time in before processing customer orders.'
    };
  }

  if (shiftStatus === 'break') {
    return {
      isAllowed: false,
      shiftStatus,
      currentStaff: currentStaff ?? null,
      reason: 'ON_BREAK',
      message: 'Shift On Break: Please resume your active shift before processing customer orders.'
    };
  }

  if (shiftStatus === 'completed') {
    return {
      isAllowed: false,
      shiftStatus,
      currentStaff: currentStaff ?? null,
      reason: 'SHIFT_COMPLETED',
      message: 'Shift Completed: You must clock in for a new shift before processing customer orders.'
    };
  }

  return {
    isAllowed: true,
    shiftStatus: 'on_shift',
    currentStaff: currentStaff ?? null,
    reason: 'OK'
  };
}
