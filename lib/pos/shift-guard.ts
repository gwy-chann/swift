/**
 * SIAA-74: Active Shift Time-In Guard Pure Evaluators & Types
 */

import type { ShiftStateStatus } from '@/lib/store/punch-store';

export type ShiftGuardReason = 'NOT_CLOCKED_IN' | 'ON_BREAK' | 'SHIFT_COMPLETED' | 'OK';

export interface ShiftGuardEvaluation {
  isAllowed: boolean;
  shiftStatus: ShiftStateStatus;
  currentStaff: string | null;
  reason: ShiftGuardReason;
  message?: string;
}

/**
 * Evaluates whether an active shift allows POS checkout processing.
 * Checkout is only permitted when isShiftActive is true and shiftStatus is 'on_shift'.
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
