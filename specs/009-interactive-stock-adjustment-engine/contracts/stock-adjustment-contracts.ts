/**
 * TypeScript Contracts for Interactive Stock Adjustment Engine (SIAA-15)
 */

import type { Product } from '@/lib/types/product';
import type { StockAdjustmentLog } from '@/lib/types/logs';

export type AdjustmentActionType =
  | 'Restock Inbound'
  | 'Damaged Goods'
  | 'Audit Adjustment'
  | 'Shrinkage';

export interface StockAdjustmentPayload {
  sku: string;
  type: AdjustmentActionType;
  quantity: number; // Positive magnitude entered by user
  mode: 'add' | 'deduct';
  reason?: string;
  user: string;
}

export interface StockAdjustmentModalProps {
  isOpen: boolean;
  product: Product | null;
  onClose: () => void;
  onSubmit: (payload: StockAdjustmentPayload) => void;
}
