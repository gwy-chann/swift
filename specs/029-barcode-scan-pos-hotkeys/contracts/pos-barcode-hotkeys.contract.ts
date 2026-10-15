/**
 * Validation Contracts & Schemas: Barcode Scan-Optimized Fast-Lane Checkout & POS Hotkeys (SIAA-28)
 */

import { z } from "zod";
import type { Product } from "@/lib/types/product";
import type { LaborService } from "@/lib/types/service";

/**
 * Barcode / SKU Scan Input Query Schema
 */
export const BarcodeScanQuerySchema = z.object({
  query: z.string().trim().min(1, "Scan query cannot be empty"),
});

export type BarcodeScanQuery = z.infer<typeof BarcodeScanQuerySchema>;

/**
 * Scan Ingestion Resolution Status
 */
export const BarcodeScanStatusSchema = z.enum([
  "MATCHED_PART",
  "MATCHED_SERVICE",
  "OUT_OF_STOCK_OVERRIDE",
  "NOT_FOUND",
  "EMPTY_QUERY",
]);

export type BarcodeScanStatus = z.infer<typeof BarcodeScanStatusSchema>;

/**
 * Barcode Scan Ingestion Result Contract
 */
export const BarcodeScanResultSchema = z.object({
  status: BarcodeScanStatusSchema,
  query: z.string(),
  itemType: z.enum(["PART", "SERVICE"]).optional(),
  requiresManagerOverride: z.boolean().default(false),
  message: z.string().optional(),
});

export interface BarcodeScanResult<T = Product | LaborService> {
  status: BarcodeScanStatus;
  query: string;
  matchedItem?: T;
  itemType?: "PART" | "SERVICE";
  requiresManagerOverride: boolean;
  message?: string;
}

/**
 * POS Hotkey Configuration Schema
 */
export const POSHotkeyActionSchema = z.enum([
  "CHECKOUT_PAY",
  "CLOSE_MODAL",
  "FOCUS_SCANNER",
]);

export type POSHotkeyAction = z.infer<typeof POSHotkeyActionSchema>;

export interface POSHotkeyEvent {
  key: string;
  code: string;
  action: POSHotkeyAction;
  canExecute: boolean;
}

/**
 * Catalog Category Tab Schema
 */
export const POSCategoryTabSchema = z.object({
  id: z.string(),
  label: z.string(),
  count: z.number().int().nonnegative().optional(),
});

export type POSCategoryTab = z.infer<typeof POSCategoryTabSchema>;
