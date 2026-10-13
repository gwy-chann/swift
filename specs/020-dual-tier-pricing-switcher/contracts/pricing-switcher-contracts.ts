import { z } from 'zod';
import type { CartItem, PricingMode } from '@/lib/types';

export const pricingModeSchema = z.enum(['retail', 'wholesale']);

export const partCartItemSchema = z.object({
  id: z.string(),
  type: z.literal('part'),
  sku: z.string(),
  name: z.string(),
  price: z.number().min(0),
  qty: z.number().int().positive(),
  location: z.string().optional(),
  retailPrice: z.number().min(0).optional(),
  wholesalePrice: z.number().min(0).optional(),
  stock: z.number().optional(),
  minThreshold: z.number().optional(),
  isOverridden: z.boolean().optional()
});

export const serviceCartItemSchema = z.object({
  id: z.string(),
  type: z.literal('service'),
  code: z.string(),
  name: z.string(),
  price: z.number().min(0),
  qty: z.number().int().positive(),
  bay: z.string().optional(),
  duration: z.string().optional()
});

export const cartItemSchema = z.discriminatedUnion('type', [
  partCartItemSchema,
  serviceCartItemSchema
]);

export interface PricingRecalculationResult {
  items: CartItem[];
  pricingMode: PricingMode;
  subtotal: number;
}

/**
 * Pure recalculation function enforcing the dual-tier pricing invariants:
 * 1. Physical parts recalculate based on target mode (wholesale vs retail).
 * 2. Workshop labor flat rates remain strictly invariant.
 * 3. Quantities, item order, and metadata are 100% preserved.
 */
export function recalculateCartForPricingTier(
  items: CartItem[],
  mode: PricingMode
): PricingRecalculationResult {
  const recalculatedItems = items.map((item) => {
    if (item.type === 'part') {
      const targetPrice =
        mode === 'wholesale'
          ? (item.wholesalePrice ?? item.price)
          : (item.retailPrice ?? item.price);
      return {
        ...item,
        price: targetPrice
      };
    }
    // Workshop labor services remain completely unchanged
    return item;
  });

  const subtotal = recalculatedItems.reduce(
    (sum, item) => sum + item.price * item.qty,
    0
  );

  return {
    items: recalculatedItems,
    pricingMode: mode,
    subtotal
  };
}
