/**
 * Staff POS Checkout Authorization & Role Guard Contracts
 * Source of truth: Jira SIAA-84 / SWIFT Staff Terminal Security
 */

export type StaffRole = 'admin' | 'cashier' | 'mechanic' | 'inventory_clerk' | 'staff';

export interface PosCheckoutGuardContext {
  isShiftActive: boolean;
  shiftStatus: 'on_shift' | 'break' | 'completed' | 'idle';
  currentStaffRole?: StaffRole | string;
  cartItemCount: number;
  isProcessing?: boolean;
  hasOneTimeManagerOverride?: boolean;
}

export type PosCheckoutGuardResult =
  | { allowed: true }
  | { allowed: false; reason: 'CART_EMPTY'; message: string }
  | { allowed: false; reason: 'PROCESSING'; message: string }
  | { allowed: false; reason: 'SHIFT_INACTIVE'; message: string }
  | { allowed: false; reason: 'UNAUTHORIZED_ROLE'; message: string; attemptedRole: string };

/**
 * Pure evaluator for POS checkout tender eligibility.
 * Restricts sales processing to active cashiers and admins.
 */
export function evaluatePosCheckoutAuthorization(
  context: PosCheckoutGuardContext
): PosCheckoutGuardResult {
  if (context.isProcessing) {
    return {
      allowed: false,
      reason: 'PROCESSING',
      message: 'Transaction is currently processing.',
    };
  }

  if (context.cartItemCount === 0) {
    return {
      allowed: false,
      reason: 'CART_EMPTY',
      message: 'Cannot checkout: Cart is empty.',
    };
  }

  if (!context.isShiftActive || context.shiftStatus !== 'on_shift') {
    return {
      allowed: false,
      reason: 'SHIFT_INACTIVE',
      message: 'Active Shift Required: You must clock in / time in before processing customer orders.',
    };
  }

  if (context.hasOneTimeManagerOverride) {
    return { allowed: true };
  }

  const role = (context.currentStaffRole || '').toLowerCase();
  const isAuthorizedRole = role === 'cashier' || role === 'admin';

  if (!isAuthorizedRole) {
    return {
      allowed: false,
      reason: 'UNAUTHORIZED_ROLE',
      attemptedRole: role || 'unknown',
      message:
        'Access Restricted: Only active Cashiers or Store Managers can process sales and accept payments.',
    };
  }

  return { allowed: true };
}
