/**
 * Validation Card & Screen Alert Contracts (SIAA-113)
 */

import { z } from "zod";

export const ScanValidationStatusSchema = z.enum([
  "SUCCESS",
  "OUT_OF_STOCK",
  "EXCEEDS_STOCK",
  "NOT_FOUND",
]);

export type ScanValidationStatus = z.infer<typeof ScanValidationStatusSchema>;

export const ScanValidationPayloadSchema = z.object({
  status: ScanValidationStatusSchema,
  sku: z.string().min(1, "SKU is required"),
  productName: z.string().optional(),
  unitPrice: z.number().nonnegative().optional(),
  remainingStock: z.number().int().optional(),
  reason: z.string().optional(),
  timestamp: z.number().optional(),
});

export type ScanValidationPayload = z.infer<typeof ScanValidationPayloadSchema>;

export const ViewfinderPulseStateSchema = z.enum(["idle", "success", "danger"]);
export type ViewfinderPulseState = z.infer<typeof ViewfinderPulseStateSchema>;

export const MobileCartSummarySchema = z.object({
  itemCount: z.number().int().nonnegative(),
  subtotal: z.number().nonnegative(),
});

export type MobileCartSummary = z.infer<typeof MobileCartSummarySchema>;

export interface ScanValidationCardProps {
  validation: ScanValidationPayload | null;
  onDismiss?: () => void;
  autoDismissMs?: number;
  className?: string;
}

export interface ScannerViewfinderOverlayProps {
  pulseState: ViewfinderPulseState;
  onPulseEnd?: () => void;
  pulseDurationMs?: number;
  className?: string;
  children?: React.ReactNode;
}

export interface MobileCartSummaryDockProps {
  cart: MobileCartSummary;
  onClick?: () => void;
  className?: string;
}
