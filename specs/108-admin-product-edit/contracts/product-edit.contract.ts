import type { Product, ProductCategory } from '@/lib/types/product';

/**
 * Zod-compatible / Type-safe validation schema for product editing.
 */
export interface UpdateProductInput {
  sku: string;
  name: string;
  category: ProductCategory | string;
  brand: string;
  model?: string;
  cost: number;
  retail: number;
  location?: string;
  oem?: boolean;
  imageUrl?: string;
  description?: string;
  userName?: string;
  userRole?: string;
}

export function validateProductUpdate(
  input: UpdateProductInput
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  if (!input.sku || !input.sku.trim()) {
    errors.sku = 'SKU is immutable and cannot be empty.';
  }

  if (!input.name || !input.name.trim()) {
    errors.name = 'Product name is required.';
  }

  if (!input.category || !String(input.category).trim()) {
    errors.category = 'Category is required.';
  }

  if (!input.brand || !input.brand.trim()) {
    errors.brand = 'Brand is required.';
  }

  if (typeof input.cost !== 'number' || Number.isNaN(input.cost) || input.cost <= 0) {
    errors.cost = 'Unit cost must be greater than ₱0.00.';
  }

  if (typeof input.retail !== 'number' || Number.isNaN(input.retail) || input.retail <= 0) {
    errors.retail = 'Retail price must be greater than ₱0.00.';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors
  };
}
