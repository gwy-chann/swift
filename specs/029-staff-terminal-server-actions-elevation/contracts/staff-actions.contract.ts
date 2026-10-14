import { z } from 'zod';
import type { PunchLog, DbStaffShift } from '@/lib/types/logs';

/**
 * Zod validation schemas and TypeScript contracts for Staff Terminal Server Actions.
 * Source: SIAA-64 (STORY-5.9)
 */

export const ClockInSchema = z.object({
  terminalId: z.string().min(1).default('Terminal #01'),
  notes: z.string().optional(),
});

export const ClockOutSchema = z.object({
  shiftId: z.string().uuid(),
  notes: z.string().optional(),
});

export const ToggleBreakSchema = z.object({
  shiftId: z.string().uuid(),
});

export const PriceCheckQuerySchema = z.string().trim().min(1, 'SKU or Barcode query is required');

export const AdminElevationPinSchema = z.object({
  pin: z.string().trim().min(4, 'PIN must be at least 4 digits').max(8),
});

export type ClockInPayload = z.infer<typeof ClockInSchema>;
export type ClockOutPayload = z.infer<typeof ClockOutSchema>;
export type ToggleBreakPayload = z.infer<typeof ToggleBreakSchema>;
export type AdminElevationPayload = z.infer<typeof AdminElevationPinSchema>;

export interface ShiftActionResult {
  success: boolean;
  shiftId?: string;
  staffName?: string;
  terminalId?: string;
  clockIn?: string;
  clockOut?: string;
  durationFormatted?: string;
  status?: 'on_shift' | 'break' | 'completed';
  error?: string;
  code?: string;
}

export interface AttendanceHistoryResult {
  success: boolean;
  logs: PunchLog[];
  activeShift: DbStaffShift | null;
  error?: string;
}

export interface ProductPriceCheckResult {
  success: boolean;
  product?: {
    id: string;
    sku: string;
    name: string;
    category: string;
    brand: string;
    model: string;
    stock: number;
    minThreshold: number;
    location: string;
    retailPrice: number;
    wholesalePrice: number;
    scPwdPrice: number;
  };
  error?: string;
  code?: 'PRODUCT_NOT_FOUND' | 'INVALID_QUERY' | 'DATABASE_ERROR';
}

export interface AdminElevationResult {
  success: boolean;
  elevatedUntil?: number;
  error?: string;
  code?: 'INVALID_PIN' | 'UNAUTHORIZED' | 'RATE_LIMITED' | 'SERVER_ERROR';
}
