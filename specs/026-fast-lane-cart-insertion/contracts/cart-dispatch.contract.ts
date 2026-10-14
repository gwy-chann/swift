/**
 * Contracts for 1-Click Fast-Lane POS Cart Insertion & Live Upsell Dispatch (SIAA-25)
 */

import type { ComparisonPartItem } from '@/lib/motomatcher/comparison-matrix-contracts';
export interface DynamicNavBadge {
  text: string;
  variant: 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
}

export type CartInsertionStatus =
  | 'ADDED_NEW'
  | 'INCREMENTED_EXISTING'
  | 'OUT_OF_STOCK'
  | 'EXCEEDS_STOCK'
  | 'INVALID_PART';

export interface MotoMatcherCartDispatchRequest {
  part: ComparisonPartItem;
  quantity?: number;
  overrideStockGuard?: boolean;
}

export interface MotoMatcherCartDispatchResult {
  success: boolean;
  status: CartInsertionStatus;
  message: string;
  currentCartQty: number | null;
  totalCartItemCount: number;
  sku: string;
}

/**
 * Pure domain/store dispatch interface
 */
export interface ICartDispatchEngine {
  dispatchInsertion(request: MotoMatcherCartDispatchRequest): MotoMatcherCartDispatchResult;
  getCartItemCount(): number;
}
