import { z } from 'zod';
import { ProductDtoSchema } from './create-product.contract.ts';

export const GetProductsParamsSchema = z.object({
  query: z.string().optional(),
  category: z.string().optional(),
  brand: z.string().optional(),
  rackId: z.string().optional(),
  shelfId: z.string().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type GetProductsParams = z.infer<typeof GetProductsParamsSchema>;

export const ProductListResponseSchema = z.object({
  success: z.boolean(),
  products: z.array(ProductDtoSchema),
  totalCount: z.number().int(),
  error: z.string().optional(),
});

export type ProductListResponse = z.infer<typeof ProductListResponseSchema>;
