/**
 * Validation Contracts: POS Mobile Companion Scanner (SIAA-110)
 */

import { z } from 'zod';

export const BarcodeFormatSchema = z.enum([
  'EAN_13',
  'EAN_8',
  'UPC_A',
  'UPC_E',
  'CODE_128',
  'CODE_39',
  'QR_CODE',
  'DATA_MATRIX',
  'MANUAL',
  'UNKNOWN'
]);

export type BarcodeFormat = z.infer<typeof BarcodeFormatSchema>;

export const BarcodeScanPayloadSchema = z.object({
  rawCode: z.string().trim().min(1, 'Barcode content cannot be empty'),
  format: BarcodeFormatSchema.default('UNKNOWN'),
  timestamp: z.number().int().positive()
});

export type BarcodeScanPayload = z.infer<typeof BarcodeScanPayloadSchema>;

export const ScannerStatusSchema = z.enum([
  'IDLE',
  'INITIALIZING',
  'SCANNING',
  'PERMISSION_DENIED',
  'UNAVAILABLE',
  'ERROR'
]);

export type ScannerStatus = z.infer<typeof ScannerStatusSchema>;

export interface MobileCameraScannerProps {
  onScan: (payload: BarcodeScanPayload) => void;
  onError?: (error: string) => void;
  cooldownMs?: number;
  facingMode?: 'environment' | 'user';
  enableAudio?: boolean;
  enableHaptics?: boolean;
  enableTorch?: boolean;
  showManualInput?: boolean;
  className?: string;
}

export interface ManualSkuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (sku: string) => void;
}

export const SCANNER_CONSTANTS = {
  COOLDOWN_MS: 1500,
  AUDIO_BEEP_FREQ_HZ: 1000,
  AUDIO_BEEP_DURATION_MS: 80,
  HAPTIC_DURATION_MS: 80,
  DEFAULT_FPS: 30
} as const;
