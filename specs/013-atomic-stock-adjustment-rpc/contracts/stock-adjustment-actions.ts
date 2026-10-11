/**
 * Contract: stock-adjustment-actions.ts
 * Description: TypeScript interfaces, server action types, and error codes
 *              for atomic stock adjustments and immutable audit logging.
 * Jira Issue: SIAA-46 (STORY-2.7)
 */

export type StockAdjustmentType =
  | 'Restock Inbound'
  | 'Damaged Goods'
  | 'Audit Adjustment'
  | 'Shrinkage'
  | 'Store Transfer'
  | 'Return / Exchange'
  | string;

export interface AdjustStockPayload {
  sku: string;
  type: StockAdjustmentType;
  delta: number;
  reason?: string;
  userName?: string;
}

export interface AdjustStockSuccessResult {
  success: true;
  sku: string;
  previousStock: number;
  newStock: number;
  quantityDelta: number;
  adjustmentType: string;
  logId: string;
  userName: string;
}

export interface AdjustStockErrorResult {
  success: false;
  sku: string;
  error: string;
  code: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_FOUND' | 'ZERO_DELTA_NOT_ALLOWED' | 'UNAUTHORIZED' | 'DATABASE_ERROR';
}

export type AdjustStockResponse = AdjustStockSuccessResult | AdjustStockErrorResult;

/**
 * Server Action Contract signature for adjustProductStockAction
 */
export type AdjustProductStockActionFn = (
  payload: AdjustStockPayload
) => Promise<AdjustStockResponse>;
