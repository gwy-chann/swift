import { z } from 'zod';
import type { CartTotals, CartItem } from '../types/cart.ts';

export const discountTierIdSchema = z.enum(['none', 'fleet', 'vip', 'senior_pwd']);
export type DiscountTierId = z.infer<typeof discountTierIdSchema>;

export const discountCategorySchema = z.enum(['none', 'commercial', 'statutory']);
export type DiscountCategory = z.infer<typeof discountCategorySchema>;

export interface DiscountTier {
  id: DiscountTierId;
  label: string;
  shortLabel: string;
  rate: number;
  type: DiscountCategory;
  description: string;
}

export const DISCOUNT_TIERS: readonly DiscountTier[] = [
  {
    id: 'none',
    label: '0% Standard',
    shortLabel: '0%',
    rate: 0.0,
    type: 'none',
    description: 'Standard retail pricing without discounts'
  },
  {
    id: 'fleet',
    label: '5% Fleet',
    shortLabel: '5%',
    rate: 0.05,
    type: 'commercial',
    description: 'Commercial fleet and partner garage accounts'
  },
  {
    id: 'vip',
    label: '10% VIP',
    shortLabel: '10%',
    rate: 0.1,
    type: 'commercial',
    description: 'VIP loyalty tier privilege'
  },
  {
    id: 'senior_pwd',
    label: '20% SC/PWD',
    shortLabel: '20%',
    rate: 0.2,
    type: 'statutory',
    description: 'Statutory 20% Senior Citizen and PWD discount'
  }
] as const;

export function getDiscountTierById(id: DiscountTierId): DiscountTier {
  return DISCOUNT_TIERS.find((t) => t.id === id) ?? DISCOUNT_TIERS[0];
}

export function getDiscountTierByRate(rate: number): DiscountTier {
  return DISCOUNT_TIERS.find((t) => Math.abs(t.rate - rate) < 0.001) ?? DISCOUNT_TIERS[0];
}

export function calculateCartTotals(
  items: CartItem[],
  discountRate: number,
  discountType: DiscountTierId = 'none'
): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const total = Math.max(0, Math.round((subtotal - discountAmount) * 100) / 100);
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  return {
    subtotal,
    discountRate,
    discountAmount,
    discountType,
    total,
    itemCount
  };
}
