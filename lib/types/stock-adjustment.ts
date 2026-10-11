/**
 * Domain types and contracts for stock adjustments and immutable audit logging.
 * Jira Issue: SIAA-46 (STORY-2.7)
 */

export type StockAdjustmentCategory =
  | 'Restock Inbound'
  | 'Damaged Goods'
  | 'Audit Adjustment'
  | 'Shrinkage'
  | 'Store Transfer'
  | 'Return / Exchange'
  | string;

export interface StockAdjustmentPayload {
  sku: string;
  type: StockAdjustmentCategory;
  delta: number;
  reason?: string;
  userName?: string;
}

export interface StockAdjustmentSuccessResult {
  success: true;
  sku: string;
  previousStock: number;
  newStock: number;
  quantityDelta: number;
  adjustmentType: string;
  logId: string;
  userName: string;
}

export interface StockAdjustmentErrorResult {
  success: false;
  sku: string;
  error: string;
  code:
    | 'INSUFFICIENT_STOCK'
    | 'PRODUCT_NOT_FOUND'
    | 'ZERO_DELTA_NOT_ALLOWED'
    | 'UNAUTHORIZED'
    | 'DATABASE_ERROR';
}

export type StockAdjustmentResult =
  | StockAdjustmentSuccessResult
  | StockAdjustmentErrorResult;

export interface DbStockAdjustmentLog {
  id: string;
  sku: string;
  adjustmentType: string;
  quantityDelta: number;
  previousStock: number;
  newStock: number;
  reason: string;
  userId: string | null;
  userName: string;
  createdAt: string;
}
