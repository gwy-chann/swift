import { z } from 'zod';

export const ProductPriceCheckItemDtoSchema = z.object({
  id: z.string(),
  sku: z.string(),
  barcode: z.string().optional(),
  name: z.string(),
  category: z.string(),
  brand: z.string(),
  model: z.string(),
  stock: z.number().int(),
  minThreshold: z.number().int(),
  location: z.string(),
  cost: z.number(),
  retailPrice: z.number(),
  wholesalePrice: z.number(),
  scPwdPrice: z.number(),
  grossMarkupPercent: z.number(),
  wholesaleMarkupPercent: z.number(),
});

export type ProductPriceCheckItemDto = z.infer<typeof ProductPriceCheckItemDtoSchema>;

export const ProductPriceCheckResponseSchema = z.object({
  success: z.boolean(),
  product: ProductPriceCheckItemDtoSchema.optional(),
  error: z.string().optional(),
  code: z.enum(['PRODUCT_NOT_FOUND', 'INVALID_QUERY', 'DATABASE_ERROR']).optional(),
});

export type ProductPriceCheckResponse = z.infer<typeof ProductPriceCheckResponseSchema>;
