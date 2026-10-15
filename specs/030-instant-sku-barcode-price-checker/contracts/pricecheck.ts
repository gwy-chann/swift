import { z } from 'zod';

/**
 * Validation Schemas & TypeScript Contracts: Price Checker & Margin Simulator
 */

export const PriceCheckQuerySchema = z.object({
  query: z.string().trim().min(1, 'Search query cannot be empty'),
});

export type PriceCheckQueryInput = z.infer<typeof PriceCheckQuerySchema>;

export const ProductPriceCheckItemSchema = z.object({
  id: z.string(),
  sku: z.string(),
  barcode: z.string().optional(),
  name: z.string(),
  category: z.string(),
  brand: z.string(),
  model: z.string().optional(),
  stock: z.number().int().nonnegative(),
  minThreshold: z.number().int().nonnegative(),
  location: z.string(),
  cost: z.number().nonnegative(),
  retailPrice: z.number().nonnegative(),
  wholesalePrice: z.number().nonnegative(),
  scPwdPrice: z.number().nonnegative(),
  grossMarkupPercent: z.number(),
  wholesaleMarkupPercent: z.number(),
});

export type ProductPriceCheckItem = z.infer<typeof ProductPriceCheckItemSchema>;

export const ProductPriceCheckResultSchema = z.object({
  success: z.boolean(),
  product: ProductPriceCheckItemSchema.optional(),
  error: z.string().optional(),
  code: z.enum(['PRODUCT_NOT_FOUND', 'INVALID_QUERY', 'DATABASE_ERROR']).optional(),
});

export type ProductPriceCheckResult = z.infer<typeof ProductPriceCheckResultSchema>;

export const MarginSimulationParamsSchema = z.object({
  baseCost: z.number().positive('Cost must be positive'),
  simulatedRetailPrice: z.number().nonnegative('Simulated retail cannot be negative'),
  simulatedWholesalePrice: z.number().nonnegative().optional(),
});

export type MarginSimulationParams = z.infer<typeof MarginSimulationParamsSchema>;

export interface MarginSimulationOutput {
  simulatedRetailPrice: number;
  simulatedGrossProfit: number;
  simulatedGrossMarkupPercent: number;
  simulatedGrossMarginPercent: number;
  isProfitable: boolean;
  isBelowCost: boolean;
}
