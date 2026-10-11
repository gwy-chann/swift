import type { Product } from '../types/product';
import { isShelfLocationAssigned } from './shelf-location.ts';

export type StockFilterOption = 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';

export interface CatalogFilterCriteria {
  query?: string;
  category?: string;
  stockStatus?: StockFilterOption;
  lowStockOnly?: boolean;
}

export interface CatalogStats {
  totalSkus: number;
  totalUnitsOnHand: number;
  lowStockCount: number;
  outOfStockCount: number;
  criticalLowStockCount: number;
  totalValuation: number;
  categoriesCount: number;
}

export type StockHealthStatus = 'healthy' | 'low' | 'out_of_stock';

/**
 * Categorizes product stock into healthy, low, or out of stock.
 */
export function getStockHealthStatus(product: Pick<Product, 'stock' | 'minThreshold'>): StockHealthStatus {
  if (product.stock <= 0) {
    return 'out_of_stock';
  }
  if (product.stock <= product.minThreshold) {
    return 'low';
  }
  return 'healthy';
}

/**
 * Evaluates whether product stock is at or below minimum safety threshold.
 */
export function isProductLowStock(product: Pick<Product, 'stock' | 'minThreshold'>): boolean {
  return product.stock <= product.minThreshold;
}

/**
 * Generates standardized user-facing stock badge text based on safety threshold.
 */
export function getStockBadgeLabel(product: Pick<Product, 'stock' | 'minThreshold'>): string {
  if (product.stock <= 0) {
    return 'Out of Stock';
  }
  if (product.stock <= product.minThreshold) {
    return `Low: ${product.stock} left (Min ${product.minThreshold})`;
  }
  return `${product.stock} in stock`;
}

/**
 * Pure predicate filtering products across search query, category, stock status, and low-stock quick filter.
 */
export function filterCatalogProducts(
  products: Product[],
  criteria: CatalogFilterCriteria = {}
): Product[] {
  const query = criteria.query?.trim().toLowerCase() ?? '';
  const category = criteria.category ?? 'All';
  const stockStatus = criteria.stockStatus ?? 'all';
  const lowStockOnly = criteria.lowStockOnly ?? false;

  return products.filter((product) => {
    // 1. Text Query Matching across multiple product attributes
    if (query) {
      const isUnassignedSearch = query === 'unassigned' || query === 'unassigned bay';
      const isProductUnassigned = !isShelfLocationAssigned(product.location);

      const matchesQuery =
        (isUnassignedSearch && isProductUnassigned) ||
        product.sku.toLowerCase().includes(query) ||
        product.name.toLowerCase().includes(query) ||
        product.brand.toLowerCase().includes(query) ||
        product.model.toLowerCase().includes(query) ||
        product.category.toLowerCase().includes(query) ||
        (product.location && product.location.toLowerCase().includes(query));

      if (!matchesQuery) return false;
    }

    // 2. Category matching
    if (category && category !== 'All' && category !== 'All Categories') {
      if (product.category.toLowerCase() !== category.toLowerCase()) {
        return false;
      }
    }

    // 3. Dedicated Low Stock quick-filter toggle (stock <= minThreshold)
    if (lowStockOnly) {
      if (product.stock > product.minThreshold) {
        return false;
      }
    }

    // 4. Stock availability status matching
    if (stockStatus === 'in_stock') {
      if (product.stock <= product.minThreshold) return false;
    } else if (stockStatus === 'low_stock') {
      if (product.stock > product.minThreshold || product.stock <= 0) return false;
    } else if (stockStatus === 'out_of_stock') {
      if (product.stock > 0) return false;
    }

    return true;
  });
}

/**
 * Aggregates summary KPI statistics across the product catalog.
 */
export function calculateCatalogStats(products: Product[]): CatalogStats {
  const totalSkus = products.length;
  let totalUnitsOnHand = 0;
  let lowStockCount = 0;
  let outOfStockCount = 0;
  let criticalLowStockCount = 0;
  let totalValuation = 0;
  const categoriesSet = new Set<string>();

  for (const product of products) {
    const stock = product.stock || 0;
    totalUnitsOnHand += stock;

    if (stock <= 0) {
      outOfStockCount++;
      criticalLowStockCount++;
    } else if (stock <= product.minThreshold) {
      lowStockCount++;
      criticalLowStockCount++;
    }

    totalValuation += (product.retail || 0) * stock;

    if (product.category) {
      categoriesSet.add(product.category);
    }
  }

  return {
    totalSkus,
    totalUnitsOnHand,
    lowStockCount,
    outOfStockCount,
    criticalLowStockCount,
    totalValuation,
    categoriesCount: categoriesSet.size
  };
}

/**
 * Standard Philippine Peso currency formatter.
 */
export function formatPeso(amount: number): string {
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })
    .format(amount)
    .replace('PHP', '₱')
    .trim();
}
