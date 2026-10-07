'use client';

import { useSyncExternalStore } from 'react';
import { Product } from '@/lib/types/product';
import { StockAdjustmentLog } from '@/lib/types/logs';
import { MOCK_PRODUCTS, MOCK_STOCK_ADJUSTMENT_LOGS } from '@/lib/mock-data';

export interface InventoryStoreState {
  products: Product[];
  adjustmentLogs: StockAdjustmentLog[];
}

export class InventoryStore {
  private state: InventoryStoreState;
  private readonly listeners = new Set<() => void>();

  constructor() {
    this.state = {
      products: [...MOCK_PRODUCTS.map((p) => ({ ...p }))],
      adjustmentLogs: [...MOCK_STOCK_ADJUSTMENT_LOGS]
    };
  }

  public getState = (): InventoryStoreState => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  private notify() {
    for (const listener of this.listeners) {
      listener();
    }
  }

  public getProductBySku = (sku: string): Product | undefined => {
    return this.state.products.find((p) => p.sku === sku);
  };

  public filterByModel = (model: string): Product[] => {
    if (!model || model === 'All') return this.state.products;
    return this.state.products.filter(
      (p) => p.model === model || p.model === 'Universal'
    );
  };

  public filterByCategory = (category: string): Product[] => {
    if (!category || category === 'All') return this.state.products;
    return this.state.products.filter((p) => p.category === category);
  };

  public searchProducts = (query: string): Product[] => {
    const q = query.trim().toLowerCase();
    if (!q) return this.state.products;
    return this.state.products.filter(
      (p) =>
        p.sku.toLowerCase().includes(q) ||
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.location.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q)
    );
  };

  public decrementStock = (sku: string, qty: number): void => {
    const updatedProducts = this.state.products.map((p) => {
      if (p.sku === sku) {
        return {
          ...p,
          stock: Math.max(0, p.stock - qty)
        };
      }
      return p;
    });

    this.state = {
      ...this.state,
      products: updatedProducts
    };
    this.notify();
  };

  public adjustStock = (params: {
    sku: string;
    type: StockAdjustmentLog['type'];
    units: number;
    reason: string;
    user: string;
  }): void => {
    const { sku, type, units, reason, user } = params;

    const updatedProducts = this.state.products.map((p) => {
      if (p.sku === sku) {
        return {
          ...p,
          stock: Math.max(0, p.stock + units)
        };
      }
      return p;
    });

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const randomSuffix = typeof crypto !== 'undefined' && crypto.getRandomValues
      ? (crypto.getRandomValues(new Uint16Array(1))[0] % 9000) + 1000
      : (Date.now() % 9000) + 1000;

    const newLog: StockAdjustmentLog = {
      id: `ADJ-${randomSuffix}`,
      timestamp: formattedDate,
      sku,
      type,
      change: `${units > 0 ? '+' : ''}${units} Unit${Math.abs(units) === 1 ? '' : 's'}`,
      reason,
      user
    };

    this.state = {
      ...this.state,
      products: updatedProducts,
      adjustmentLogs: [newLog, ...this.state.adjustmentLogs]
    };
    this.notify();
  };
}

export const inventoryStore = new InventoryStore();

export function useInventoryStore(): InventoryStoreState & {
  getProductBySku: typeof inventoryStore.getProductBySku;
  filterByModel: typeof inventoryStore.filterByModel;
  filterByCategory: typeof inventoryStore.filterByCategory;
  searchProducts: typeof inventoryStore.searchProducts;
  decrementStock: typeof inventoryStore.decrementStock;
  adjustStock: typeof inventoryStore.adjustStock;
} {
  const state = useSyncExternalStore(
    inventoryStore.subscribe,
    inventoryStore.getState,
    inventoryStore.getState
  );

  return {
    ...state,
    getProductBySku: inventoryStore.getProductBySku,
    filterByModel: inventoryStore.filterByModel,
    filterByCategory: inventoryStore.filterByCategory,
    searchProducts: inventoryStore.searchProducts,
    decrementStock: inventoryStore.decrementStock,
    adjustStock: inventoryStore.adjustStock
  };
}
