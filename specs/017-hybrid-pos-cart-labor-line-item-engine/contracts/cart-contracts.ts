import { z } from 'zod';

export const PricingModeSchema = z.enum(['retail', 'wholesale']);

export const BaseCartItemSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  price: z.number().min(0),
  qty: z.number().int().min(1),
});

export const PartCartItemSchema = BaseCartItemSchema.extend({
  type: z.literal('part'),
  sku: z.string().min(1),
  location: z.string().optional(),
  retailPrice: z.number().min(0).optional(),
  wholesalePrice: z.number().min(0).optional(),
  stock: z.number().int().optional(),
  minThreshold: z.number().int().optional(),
  isOverridden: z.boolean().optional(),
});

export const ServiceCartItemSchema = BaseCartItemSchema.extend({
  type: z.literal('service'),
  code: z.string().min(1),
  bay: z.string().optional(),
  duration: z.string().optional(),
});

export const CartItemSchema = z.discriminatedUnion('type', [
  PartCartItemSchema,
  ServiceCartItemSchema,
]);

export const CartTotalsSchema = z.object({
  subtotal: z.number().min(0),
  discountRate: z.number().min(0).max(1),
  discountAmount: z.number().min(0),
  total: z.number().min(0),
  itemCount: z.number().int().min(0),
});

export type PricingMode = z.infer<typeof PricingModeSchema>;
export type BaseCartItem = z.infer<typeof BaseCartItemSchema>;
export type PartCartItem = z.infer<typeof PartCartItemSchema>;
export type ServiceCartItem = z.infer<typeof ServiceCartItemSchema>;
export type CartItem = z.infer<typeof CartItemSchema>;
export type CartTotals = z.infer<typeof CartTotalsSchema>;
