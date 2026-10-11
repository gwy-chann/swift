import type { Product, ProductCategory } from '../types/product.ts';
import type { DbProductRow } from '../types/realtime.ts';

const parseNumber = (val: unknown): number | undefined =>
  val !== undefined && val !== null ? Number(val) : undefined;

function extractPricingAndStock(raw: Record<string, unknown>) {
  const cost = parseNumber(raw.cost);
  const wholesale = parseNumber(raw.wholesale);
  const retail = parseNumber(raw.retail);
  const rawStock = parseNumber(raw.stock);
  const rawMinThreshold = parseNumber(raw.min_threshold ?? raw.minThreshold);

  return {
    ...(cost !== undefined && { cost }),
    ...(wholesale !== undefined && { wholesale }),
    ...(retail !== undefined && { retail }),
    ...(rawStock !== undefined && { stock: Math.max(0, rawStock) }),
    ...(rawMinThreshold !== undefined && { minThreshold: Math.max(0, rawMinThreshold) })
  };
}

function extractMetadata(raw: Record<string, unknown>) {
  const rawImg = raw.image_url ?? raw.imageUrl;
  const rawCreatedAt = raw.created_at ?? raw.createdAt;
  const rawUpdatedAt = raw.updated_at ?? raw.updatedAt;

  return {
    ...(raw.location !== undefined && { location: raw.location ? String(raw.location) : '' }),
    ...(raw.oem !== undefined && { oem: Boolean(raw.oem) }),
    ...(rawImg !== undefined && { imageUrl: rawImg ? String(rawImg) : undefined }),
    ...(raw.description !== undefined && { description: raw.description ? String(raw.description) : undefined }),
    ...(rawCreatedAt !== undefined && { createdAt: rawCreatedAt as string | Date }),
    ...(rawUpdatedAt !== undefined && { updatedAt: rawUpdatedAt as string | Date })
  };
}

/**
 * Maps a raw Supabase PostgreSQL row or partial update payload (snake_case)
 * to a type-safe canonical domain Product (camelCase).
 *
 * @param row The raw database payload received from Supabase Realtime
 * @returns Canonical Partial<Product> with guaranteed uppercase SKU
 */
export function mapRealtimeDbProductToProduct(
  row: DbProductRow | (Partial<Product> & { sku: string; min_threshold?: number; image_url?: string | null })
): Partial<Product> & { sku: string } {
  if (!row || typeof row !== 'object' || !row.sku) {
    throw new Error('[mapRealtimeDbProductToProduct] Payload must include a valid SKU identifier');
  }

  const raw = row as Record<string, unknown>;
  const sku = String(raw.sku).trim().toUpperCase();

  return {
    sku,
    ...(raw.id !== undefined && { id: String(raw.id) }),
    ...(raw.name !== undefined && { name: String(raw.name) }),
    ...(raw.category !== undefined && { category: raw.category as ProductCategory }),
    ...(raw.brand !== undefined && { brand: String(raw.brand) }),
    ...(raw.model !== undefined && { model: String(raw.model) }),
    ...extractPricingAndStock(raw),
    ...extractMetadata(raw)
  };
}

/**
 * Checks whether a product has breached its minimum threshold into low stock status.
 */
export function isLowStockThresholdBreached(product: {
  stock: number;
  minThreshold: number;
}): boolean {
  return product.stock <= product.minThreshold;
}

/**
 * Detects if a transition from previous stock to new stock caused a new low-stock breach.
 */
export function didStockDropBelowThreshold(
  previousStock: number,
  newStock: number,
  minThreshold: number
): boolean {
  return previousStock > minThreshold && newStock <= minThreshold;
}
