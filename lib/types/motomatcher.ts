import { z } from 'zod';

/**
 * Zod schema validating an individual part entry within the MotoMatcher matrix.
 */
export const MotoMatcherMatrixPartSchema = z.object({
  id: z.string().default(() => '00000000-0000-0000-0000-000000000000'),
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

export type MotoMatcherMatrixPart = z.infer<typeof MotoMatcherMatrixPartSchema>;

/**
 * Zod schema validating the entire partitioned matrix payload returned by
 * `get_moto_matcher_matrix` RPC or the fallback server action.
 */
export const MotoMatcherMatrixPayloadSchema = z.object({
  oem_parts: z.array(MotoMatcherMatrixPartSchema),
  aftermarket_parts: z.array(MotoMatcherMatrixPartSchema),
});

export type MotoMatcherMatrixResult = z.infer<typeof MotoMatcherMatrixPayloadSchema>;

/**
 * Zod schema validating the query arguments for matrix retrieval.
 */
export const GetFitmentMatrixParamsSchema = z.object({
  modelId: z.string().min(1),
  category: z.string().nullable().optional(),
  search: z.string().nullable().optional(),
});

export type GetFitmentMatrixParams = z.infer<typeof GetFitmentMatrixParamsSchema>;

/**
 * Pure helper to compute upsell price differentials between benchmark OEM retail
 * and an aftermarket upgrade alternative.
 *
 * Example:
 *   calculateUpsellDelta(450, 580) -> {
 *     deltaAmount: 130,
 *     deltaPercent: 28.9,
 *     badge: "+₱130.00 (+28.9%)"
 *   }
 */
export function calculateUpsellDelta(
  oemRetail: number,
  aftermarketRetail: number
): {
  deltaAmount: number;
  deltaPercent: number;
  badge: string;
} | null {
  if (oemRetail <= 0) return null;

  const deltaAmount = Math.round((aftermarketRetail - oemRetail) * 100) / 100;
  const rawPercent = ((aftermarketRetail - oemRetail) / oemRetail) * 100;
  const deltaPercent = Math.round(rawPercent * 10) / 10;

  const sign = deltaAmount >= 0 ? '+' : '-';
  const absAmount = Math.abs(deltaAmount).toFixed(2);
  const absPercent = Math.abs(deltaPercent).toFixed(1);

  const badge = `${sign}₱${absAmount} (${sign}${absPercent}%)`;

  return {
    deltaAmount,
    deltaPercent,
    badge,
  };
}
