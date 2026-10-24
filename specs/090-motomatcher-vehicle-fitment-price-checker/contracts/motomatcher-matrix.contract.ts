import { z } from 'zod';

export const MotoMatcherMatrixPartDtoSchema = z.object({
  id: z.string(),
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  retail_price: z.number().nonnegative(),
  stock_level: z.number().int().nonnegative(),
  min_threshold: z.number().int().nonnegative().default(0),
  shelf_location: z.string().nullable().default(null),
  fitment_type: z.enum(['oem', 'aftermarket', 'universal']),
  fitment_notes: z.string().nullable().default(null),
  year_range: z.string().nullable().default(null),
  is_universal: z.boolean().default(false),
  upsell_delta_amount: z.number().nullable().default(null),
  upsell_delta_percent: z.number().nullable().default(null),
  upsell_badge: z.string().nullable().default(null),
  oem_reference_sku: z.string().nullable().default(null),
});

export type MotoMatcherMatrixPartDto = z.infer<typeof MotoMatcherMatrixPartDtoSchema>;

export const MotoMatcherMatrixResponseSchema = z.object({
  oem_parts: z.array(MotoMatcherMatrixPartDtoSchema),
  aftermarket_parts: z.array(MotoMatcherMatrixPartDtoSchema),
});

export type MotoMatcherMatrixResponse = z.infer<typeof MotoMatcherMatrixResponseSchema>;
