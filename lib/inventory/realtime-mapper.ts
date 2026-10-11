import type { Product, ProductCategory } from '../types/product.ts';
import type { DbProductRow } from '../types/realtime.ts';

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

  const result: Partial<Product> & { sku: string } = {
    sku: String(row.sku).trim().toUpperCase()
  };

  if ('id' in row && row.id !== undefined) {
    result.id = String(row.id);
  }
  if ('name' in row && row.name !== undefined) {
    result.name = String(row.name);
  }
  if ('category' in row && row.category !== undefined) {
    result.category = row.category as ProductCategory;
  }
  if ('brand' in row && row.brand !== undefined) {
    result.brand = String(row.brand);
  }
  if ('model' in row && row.model !== undefined) {
    result.model = String(row.model);
  }
  if ('cost' in row && row.cost !== undefined) {
    result.cost = Number(row.cost);
  }
  if ('wholesale' in row && row.wholesale !== undefined) {
    result.wholesale = Number(row.wholesale);
  }
  if ('retail' in row && row.retail !== undefined) {
    result.retail = Number(row.retail);
  }
  if ('stock' in row && row.stock !== undefined) {
    result.stock = Math.max(0, Number(row.stock));
  }
  if ('min_threshold' in row && row.min_threshold !== undefined) {
    result.minThreshold = Math.max(0, Number(row.min_threshold));
  } else if ('minThreshold' in row && row.minThreshold !== undefined) {
    result.minThreshold = Math.max(0, Number(row.minThreshold));
  }
  if ('location' in row && row.location !== undefined) {
    result.location = row.location ? String(row.location) : '';
  }
  if ('oem' in row && row.oem !== undefined) {
    result.oem = Boolean(row.oem);
  }
  if ('image_url' in row && row.image_url !== undefined) {
    result.imageUrl = row.image_url ? String(row.image_url) : undefined;
  } else if ('imageUrl' in row && row.imageUrl !== undefined) {
    result.imageUrl = row.imageUrl ? String(row.imageUrl) : undefined;
  }
  if ('description' in row && row.description !== undefined) {
    result.description = row.description ? String(row.description) : undefined;
  }
  if ('created_at' in row && row.created_at !== undefined) {
    result.createdAt = row.created_at ? String(row.created_at) : undefined;
  } else if ('createdAt' in row && row.createdAt !== undefined) {
    result.createdAt = row.createdAt ? (row.createdAt as string | Date) : undefined;
  }
  if ('updated_at' in row && row.updated_at !== undefined) {
    result.updatedAt = row.updated_at ? String(row.updated_at) : undefined;
  } else if ('updatedAt' in row && row.updatedAt !== undefined) {
    result.updatedAt = row.updatedAt ? (row.updatedAt as string | Date) : undefined;
  }

  return result;
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
