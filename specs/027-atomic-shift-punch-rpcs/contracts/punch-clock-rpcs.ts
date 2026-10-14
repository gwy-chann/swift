import { z } from 'zod';
import type { DbStaffShift } from '@/lib/types/logs';

export const ClockInShiftInputSchema = z.object({
  terminalId: z.string().min(1).default('Terminal #01'),
  notes: z.string().max(500).nullable().optional(),
});
export type ClockInShiftInput = z.infer<typeof ClockInShiftInputSchema>;

export const ClockOutShiftInputSchema = z.object({
  shiftId: z.string().uuid(),
  notes: z.string().max(500).nullable().optional(),
});
export type ClockOutShiftInput = z.infer<typeof ClockOutShiftInputSchema>;

export const ToggleShiftBreakInputSchema = z.object({
  shiftId: z.string().uuid(),
});
export type ToggleShiftBreakInput = z.infer<typeof ToggleShiftBreakInputSchema>;

export interface ClockInShiftResult {
  success: boolean;
  shift: DbStaffShift;
  audit_log_id: string;
}

export interface ClockOutShiftResult {
  success: boolean;
  shift: DbStaffShift;
  duration_formatted: string;
  audit_log_id: string;
}

export interface ToggleShiftBreakResult {
  success: boolean;
  shift: Pick<DbStaffShift, 'id' | 'status'>;
  previous_status: 'on_shift' | 'break';
  current_status: 'on_shift' | 'break';
  action: 'break_start' | 'break_end';
  audit_log_id: string;
}

export const SHIFT_RPC_ERROR_CODES = {
  ACTIVE_SHIFT_EXISTS: 'ACTIVE_SHIFT_EXISTS',
  SHIFT_NOT_ACTIVE: 'SHIFT_NOT_ACTIVE',
  SHIFT_NOT_FOUND: 'SHIFT_NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  UNAUTHENTICATED: 'UNAUTHENTICATED',
  TAMPER_FORBIDDEN: 'TAMPER_FORBIDDEN',
} as const;

export type ShiftRpcErrorCode = (typeof SHIFT_RPC_ERROR_CODES)[keyof typeof SHIFT_RPC_ERROR_CODES];

export class ShiftRpcError extends Error {
  constructor(
    public readonly code: ShiftRpcErrorCode | string,
    message: string,
    public readonly status: number = 400
  ) {
    super(message);
    this.name = 'ShiftRpcError';
  }
}
