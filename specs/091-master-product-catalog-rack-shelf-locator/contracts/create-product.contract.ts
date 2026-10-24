import { z } from 'zod';

export const CreateProductRequestSchema = z.object({
  sku: z.string().min(1, 'SKU is required.'),
  name: z.string().min(1, 'Product name is required.'),
  category: z.string().min(1, 'Category is required.'),
  brand: z.string().min(1, 'Brand is required.'),
  model: z.string().default('Universal'),
  cost: z.number().positive('Unit cost must be greater than ₱0.00.'),
  wholesale: z.number().positive().optional(),
  retail: z.number().positive().optional(),
  stock: z.number().int().nonnegative().default(0),
  minThreshold: z.number().int().min(1).default(5),
  rackId: z.string().optional().nullable(),
  shelfId: z.string().optional().nullable(),
  binLocator: z.string().optional().nullable(),
  location: z.string().optional().nullable(),
  oem: z.boolean().default(false),
  imageUrl: z.string().url().optional().nullable(),
  description: z.string().optional().nullable(),
});

export type CreateProductRequest = z.infer<typeof CreateProductRequestSchema>;

export const ProductDtoSchema = z.object({
  id: z.string().uuid(),
  sku: z.string(),
  name: z.string(),
  category: z.string(),
  brand: z.string(),
  model: z.string(),
  cost: z.number(),
  wholesale: z.number(),
  retail: z.number(),
  stock: z.number().int(),
  minThreshold: z.number().int(),
  rackId: z.string().nullable().optional(),
  shelfId: z.string().nullable().optional(),
  binLocator: z.string().nullable().optional(),
  location: z.string().nullable().optional(),
  oem: z.boolean(),
  imageUrl: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ProductDto = z.infer<typeof ProductDtoSchema>;

export const CreateProductResponseSchema = z.object({
  success: z.boolean(),
  product: ProductDtoSchema.optional(),
  error: z.string().optional(),
  code: z.enum(['SKU_ALREADY_EXISTS', 'VALIDATION_ERROR', 'DATABASE_ERROR']).optional(),
  fieldErrors: z.record(z.string()).optional(),
});

export type CreateProductResponse = z.infer<typeof CreateProductResponseSchema>;
