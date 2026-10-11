/**
 * TypeScript Contracts: Low-Stock Threshold Detection & Restock Alerts
 * Feature: SIAA-17
 */

export type StockHealthStatus = 'healthy' | 'low' | 'out_of_stock';

export interface StockEvaluationInput {
  stock: number;
  minThreshold: number;
}

export interface StockStatusEvaluation {
  status: StockHealthStatus;
  badgeLabel: string;
  isRestockNeeded: boolean;
  canAddToCart: boolean;
  stock: number;
  minThreshold: number;
}

export interface CatalogStats {
  totalSkus: number;
  totalUnitsOnHand: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalValuation: number;
  categoriesCount: number;
}

export interface CatalogFilterCriteria {
  query?: string;
  category?: string;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  lowStockOnly?: boolean;
}

export interface StockBadgeProps {
  stock: number;
  minThreshold: number;
  compact?: boolean;
  className?: string;
}
