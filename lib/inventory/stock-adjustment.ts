import type { StockAdjustmentLog } from '../types/logs';

export type AdjustmentType =
  | 'Restock Inbound'
  | 'Damaged Goods'
  | 'Audit Adjustment'
  | 'Shrinkage';

export interface CalculateStockAdjustmentParams {
  currentStock: number;
  type: AdjustmentType | string;
  quantity: number;
  mode?: 'add' | 'deduct';
}

export interface CalculatedStockAdjustment {
  delta: number;
  resultingStock: number;
  formattedChange: string;
}

export interface AdjustmentPayload {
  sku: string;
  type: AdjustmentType | string;
  quantity: number;
  mode?: 'add' | 'deduct';
  reason?: string;
  user: string;
}

export interface ValidationResult {
  isValid: boolean;
  errorMessage?: string;
}

/**
 * Formats a numeric change into a human-readable string like "+10 Units" or "-2 Units".
 */
export function formatAdjustmentChange(delta: number): string {
  if (delta === 0) return '0 Units';
  const sign = delta > 0 ? '+' : '-';
  const absVal = Math.abs(delta);
  const unitLabel = absVal === 1 ? 'Unit' : 'Units';
  return `${sign}${absVal} ${unitLabel}`;
}

/**
 * Calculates signed delta and resulting stock with zero-floor guarantee.
 */
export function calculateStockAdjustmentDelta(
  params: CalculateStockAdjustmentParams
): CalculatedStockAdjustment {
  const { currentStock, type, quantity, mode } = params;
  const absQty = Math.max(0, Math.floor(quantity));

  let isDeduct = false;
  if (mode === 'deduct') {
    isDeduct = true;
  } else if (mode === 'add') {
    isDeduct = false;
  } else {
    // Inferred from type
    isDeduct = type === 'Damaged Goods' || type === 'Shrinkage';
  }

  const delta = isDeduct ? -absQty : absQty;
  const resultingStock = Math.max(0, currentStock + delta);

  return {
    delta,
    resultingStock,
    formattedChange: formatAdjustmentChange(delta)
  };
}

/**
 * Validates whether adjustment parameters meet required constraints.
 */
export function validateAdjustmentPayload(payload: Partial<AdjustmentPayload>): ValidationResult {
  if (!payload.sku || payload.sku.trim() === '') {
    return { isValid: false, errorMessage: 'SKU is required' };
  }
  if (payload.quantity === undefined || payload.quantity === null || isNaN(payload.quantity) || payload.quantity <= 0) {
    return { isValid: false, errorMessage: 'Quantity must be a positive number greater than 0' };
  }
  if (!payload.type || payload.type.trim() === '') {
    return { isValid: false, errorMessage: 'Adjustment type is required' };
  }
  return { isValid: true };
}
