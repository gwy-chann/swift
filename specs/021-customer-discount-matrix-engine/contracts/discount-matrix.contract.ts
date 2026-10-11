import { z } from 'zod';

export const discountTierIdSchema = z.enum(['none', 'fleet', 'vip', 'senior_pwd']);
export type DiscountTierId = z.infer<typeof discountTierIdSchema>;

export const discountCategorySchema = z.enum(['none', 'commercial', 'statutory']);
export type DiscountCategory = z.infer<typeof discountCategorySchema>;

export const discountTierSchema = z.object({
  id: discountTierIdSchema,
  label: z.string(),
  shortLabel: z.string(),
  rate: z.number().min(0).max(1),
  type: discountCategorySchema,
  description: z.string()
});
export type DiscountTier = z.infer<typeof discountTierSchema>;

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

export const cartTotalsSchema = z.object({
  subtotal: z.number().min(0),
  discountRate: z.number().min(0).max(1),
  discountAmount: z.number().min(0),
  discountType: discountTierIdSchema.optional(),
  total: z.number().min(0),
  itemCount: z.number().int().min(0)
});

export function computeCartTotals(
  items: Array<{ price: number; qty: number }>,
  discountRate: number,
  discountType: DiscountTierId = 'none'
) {
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
