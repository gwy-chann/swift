import { z } from 'zod';

export const StockFilterOptionSchema = z.enum([
  'all',
  'in_stock',
  'low_stock',
  'out_of_stock'
]);
export type StockFilterOption = z.infer<typeof StockFilterOptionSchema>;

export const CatalogFilterParamsSchema = z.object({
  query: z.string().default(''),
  category: z.string().default('All'),
  stockStatus: StockFilterOptionSchema.default('all')
});
export type CatalogFilterParams = z.infer<typeof CatalogFilterParamsSchema>;

export const CatalogStatsSchema = z.object({
  totalSkus: z.number().nonnegative(),
  lowStockCount: z.number().nonnegative(),
  outOfStockCount: z.number().nonnegative(),
  totalValuation: z.number().nonnegative(),
  categoriesCount: z.number().nonnegative()
});
export type CatalogStats = z.infer<typeof CatalogStatsSchema>;

export interface CatalogRowActionProps {
  onAdjustStock?: (sku: string) => void;
}
