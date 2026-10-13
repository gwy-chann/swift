import type { ThermalRollWidth } from '../types/transaction.ts';

export const STORE_RECEIPT_CONFIG = {
  storeName: 'SWIFT MOTO SERVICE',
  address: '104 Rizal Ave, Motor City',
  tin: 'TIN: 409-281-992-000',
  phone: 'Tel: (02) 8921-4450',
  warrantyNotice: 'Parts warranty valid for 7 days with receipt.',
  customerCopyNotice: '*** CUSTOMER COPY ***'
} as const;

export interface RollWidthDimensions {
  rollWidth: ThermalRollWidth;
  containerClass: string;
  fontSizeClass: string;
  maxNameLength: number;
}

export function getThermalRollDimensions(width: ThermalRollWidth): RollWidthDimensions {
  if (width === '58mm') {
    return {
      rollWidth: '58mm',
      containerClass: 'w-67.5 max-w-67.5',
      fontSizeClass: 'text-[11px] leading-tight',
      maxNameLength: 22
    };
  }

  return {
    rollWidth: '80mm',
    containerClass: 'w-87.5 max-w-87.5',
    fontSizeClass: 'text-xs leading-normal',
    maxNameLength: 32
  };
}

/**
 * Formats monetary amounts with PHP peso sign and standard 2 decimal precision.
 */
export function formatReceiptCurrency(amount: number): string {
  return `₱${amount.toFixed(2)}`;
}

/**
 * Generates simulated barcode line array for printing/display.
 */
export function generateReceiptBarcodePattern(receiptNumber: string): { widthClass: string }[] {
  const seed = receiptNumber.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const patternLength = 32;
  const bars: { widthClass: string }[] = [];

  for (let i = 0; i < patternLength; i++) {
    const val = (seed + i * 7) % 5;
    if (val === 0) bars.push({ widthClass: 'w-1' });
    else if (val % 2 === 0) bars.push({ widthClass: 'w-0.5' });
    else bars.push({ widthClass: 'w-px' });
  }

  return bars;
}
