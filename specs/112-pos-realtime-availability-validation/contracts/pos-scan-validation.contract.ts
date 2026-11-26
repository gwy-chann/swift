/**
 * POS Real-Time Availability Validation & Sold-Out Rejection Contract (SIAA-112)
 */

import { z } from "zod";

export const PosScanStatusSchema = z.enum([
  "SUCCESS",
  "OUT_OF_STOCK",
  "EXCEEDS_STOCK",
  "NOT_FOUND",
]);

export type PosScanStatus = z.infer<typeof PosScanStatusSchema>;

export const PosScanValidationResponseSchema = z.object({
  status: PosScanStatusSchema,
  sku: z.string().optional(),
  name: z.string().optional(),
  price: z.number().nonnegative().optional(),
  stockRemaining: z.number().int().optional(),
  availableStock: z.number().int().optional(),
  requestedQty: z.number().int().positive().optional(),
  currentCartQty: z.number().int().nonnegative().optional(),
  cartItemCount: z.number().int().nonnegative().optional(),
  cartTotal: z.number().nonnegative().optional(),
  query: z.string().optional(),
  message: z.string().optional(),
  timestamp: z.number().optional(),
});

export type PosScanValidationResponse = z.infer<typeof PosScanValidationResponseSchema>;

export interface AvailabilityCheckResult {
  canAdd: boolean;
  status: PosScanStatus;
  reason?: "out_of_stock" | "exceeds_stock";
  message?: string;
  availableStock: number;
  currentCartQty: number;
  targetQty: number;
}
