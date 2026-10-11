import { z } from 'zod';
import type { Product } from '@/lib/types/product';

/**
 * Zod validation contract for New Product Registration payload
 */
export const CreateProductPayloadSchema = z.object({
  sku: z
    .string()
    .min(1, 'SKU / Item Code is required.')
    .max(50, 'SKU must not exceed 50 characters.')
    .transform((val) => val.trim().toUpperCase()),
  name: z
    .string()
    .min(1, 'Product name is required.')
    .max(255, 'Product name must not exceed 255 characters.')
    .transform((val) => val.trim()),
  category: z.string().min(1, 'Category is required.'),
  brand: z
    .string()
    .min(1, 'Brand is required.')
    .max(100, 'Brand must not exceed 100 characters.')
    .transform((val) => val.trim()),
  model: z
    .string()
    .min(1, 'Target motorcycle model is required.')
    .default('Universal')
    .transform((val) => val.trim()),
  cost: z
    .number()
    .positive('Unit cost must be greater than ₱0.00.'),
  wholesale: z
    .number()
    .positive('Wholesale price must be greater than ₱0.00.')
    .optional(),
  retail: z
    .number()
    .positive('Retail price must be greater than ₱0.00.')
    .optional(),
  stock: z
    .number()
    .int('Stock must be an integer.')
    .nonnegative('Initial stock must be non-negative.')
    .default(0),
  minThreshold: z
    .number()
    .int('Low stock threshold must be an integer.')
    .min(1, 'Low stock threshold must be at least 1.')
    .default(5),
  location: z
    .string()
    .min(1, 'Shelf location is required.')
    .transform((val) => val.trim().toUpperCase()),
  oem: z.boolean().default(false),
  imageUrl: z.string().url('Invalid image URL format.').optional().or(z.literal('')),
  description: z.string().max(1000).optional(),
  userName: z.string().optional()
});

export type CreateProductInput = z.input<typeof CreateProductPayloadSchema>;
export type CreateProductValidated = z.output<typeof CreateProductPayloadSchema>;

export type CreateProductErrorCode =
  | 'SKU_ALREADY_EXISTS'
  | 'VALIDATION_ERROR'
  | 'DATABASE_ERROR'
  | 'UNAUTHORIZED';

export interface CreateProductResult {
  success: boolean;
  product?: Product;
  error?: string;
  code?: CreateProductErrorCode;
  fieldErrors?: Record<string, string>;
}
