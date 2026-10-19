import { z } from 'zod';
import type { Product } from '@/lib/types/product';
import type { MotoMatcherMatrixPart } from '@/lib/types/motomatcher';

/**
 * Zod schema validating a normalized comparison matrix part item.
 */
export const ComparisonPartItemSchema = z.object({
  id: z.string().default(''),
  sku: z.string().min(1),
  name: z.string().min(1),
  brand: z.string().min(1),
  category: z.string().min(1),
  retailPrice: z.number().nonnegative(),
  wholesalePrice: z.number().nonnegative().optional(),
  stockLevel: z.number().int().nonnegative(),
  minThreshold: z.number().int().nonnegative().default(0),
  shelfLocation: z.string().nullable().default(null),
  isOem: z.boolean(),
  isUniversal: z.boolean().default(false),
  fitmentType: z.enum(['oem', 'aftermarket', 'universal']),
  upsellDeltaAmount: z.number().nullable().optional(),
  upsellDeltaPercent: z.number().nullable().optional(),
  upsellBadge: z.string().nullable().optional(),
});

export type ComparisonPartItem = z.infer<typeof ComparisonPartItemSchema> & {
  rawProduct?: Product | MotoMatcherMatrixPart;
};

/**
 * Props contract for the ComparisonMatrix presentation component.
 */
export interface ComparisonMatrixProps {
  oemParts: ComparisonPartItem[];
  aftermarketParts: ComparisonPartItem[];
  onAddToCart?: (part: ComparisonPartItem) => void;
  addedSku?: string | null;
  isLoading?: boolean;
  emptyOemMessage?: string;
  emptyAftermarketMessage?: string;
  className?: string;
}

/**
 * Normalizes a Product domain model into a ComparisonPartItem.
 */
export function fromProductToComparisonPart(product: Product): ComparisonPartItem {
  const isOem = Boolean(product.oem);
  const isUniversal = product.model?.toLowerCase() === 'universal';
  let fitmentType: 'oem' | 'aftermarket' | 'universal' = 'aftermarket';
  if (isOem) {
    fitmentType = 'oem';
  } else if (isUniversal) {
    fitmentType = 'universal';
  }

  return {
    id: product.sku,
    sku: product.sku,
    name: product.name,
    brand: product.brand,
    category: product.category,
    retailPrice: product.retail,
    wholesalePrice: product.wholesale,
    stockLevel: product.stock,
    minThreshold: product.minThreshold ?? 0,
    shelfLocation: product.location || null,
    isOem,
    isUniversal,
    fitmentType,
    rawProduct: product,
  };
}

/**
 * Normalizes a MotoMatcherMatrixPart into a ComparisonPartItem.
 */
export function fromMatrixPartToComparisonPart(part: MotoMatcherMatrixPart): ComparisonPartItem {
  return {
    id: part.id,
    sku: part.sku,
    name: part.name,
    brand: part.brand,
    category: part.category,
    retailPrice: part.retail_price,
    stockLevel: part.stock_level,
    minThreshold: part.min_threshold,
    shelfLocation: part.shelf_location,
    isOem: part.fitment_type === 'oem',
    isUniversal: part.is_universal,
    fitmentType: part.fitment_type,
    upsellDeltaAmount: part.upsell_delta_amount,
    upsellDeltaPercent: part.upsell_delta_percent,
    upsellBadge: part.upsell_badge,
    rawProduct: part,
  };
}

/**
 * Pure function to partition an array of ComparisonPartItems into OEM vs Aftermarket lists.
 */
export function partitionComparisonParts(
  parts: ComparisonPartItem[]
): { oemParts: ComparisonPartItem[]; aftermarketParts: ComparisonPartItem[] } {
  const oemParts: ComparisonPartItem[] = [];
  const aftermarketParts: ComparisonPartItem[] = [];

  for (const part of parts) {
    if (part.isOem) {
      oemParts.push(part);
    } else {
      aftermarketParts.push(part);
    }
  }

  return { oemParts, aftermarketParts };
}
