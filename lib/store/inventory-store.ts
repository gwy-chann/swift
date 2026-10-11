'use client';

import { useSyncExternalStore } from 'react';
import type { Product } from '../types/product.ts';
import type { StockAdjustmentLog, AuditLog } from '../types/logs.ts';
export interface InventoryStoreState {
  products: Product[];
  adjustmentLogs: StockAdjustmentLog[];
  auditLogs: AuditLog[];
}

export class InventoryStore {
  private state: InventoryStoreState;
  private readonly listeners = new Set<() => void>();

  constructor(initialState?: Partial<InventoryStoreState>) {
    this.state = {
      products: initialState?.products ? [...initialState.products.map((p) => ({ ...p }))] : [],
      adjustmentLogs: initialState?.adjustmentLogs ? [...initialState.adjustmentLogs] : [],
      auditLogs: initialState?.auditLogs ? [...initialState.auditLogs] : []
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
  }): { previousStock: number; newStock: number; logId: string } => {
    const { sku, type, units, reason, user } = params;

    let previousStock = 0;
    let newStock = 0;

    const updatedProducts = this.state.products.map((p) => {
      if (p.sku === sku) {
        previousStock = p.stock;
        newStock = Math.max(0, p.stock + units);
        return {
          ...p,
          stock: newStock
        };
      }
      return p;
    });

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const randomSuffix = typeof crypto !== 'undefined' && crypto.getRandomValues
      ? (crypto.getRandomValues(new Uint16Array(1))[0] % 9000) + 1000
      : (Date.now() % 9000) + 1000;

    const logId = `ADJ-${randomSuffix}`;

    const newLog: StockAdjustmentLog = {
      id: logId,
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

    return { previousStock, newStock, logId };
  };

  /**
   * Reverts an optimistic stock adjustment back to a target stock level,
   * optionally removing the optimistic log entry created during the adjustment.
   */
  public rollbackStock = (params: {
    sku: string;
    previousStock: number;
    logId?: string;
  }): void => {
    const { sku, previousStock, logId } = params;

    const updatedProducts = this.state.products.map((p) => {
      if (p.sku === sku) {
        return {
          ...p,
          stock: previousStock
        };
      }
      return p;
    });

    const updatedLogs = logId
      ? this.state.adjustmentLogs.filter((log) => log.id !== logId)
      : this.state.adjustmentLogs;

    this.state = {
      ...this.state,
      products: updatedProducts,
      adjustmentLogs: updatedLogs
    };
    this.notify();
  };

  public registerProduct = (params: {
    product: Product;
    user?: string;
  }): { success: boolean; error?: string } => {
    const { product, user = 'Carlos Rodriguez (Admin)' } = params;
    const normalizedSku = product.sku.trim().toUpperCase();

    // Guard against case-insensitive duplicate SKU collision
    if (this.state.products.some((p) => p.sku.trim().toUpperCase() === normalizedSku)) {
      return {
        success: false,
        error: `SKU "${normalizedSku}" already exists in the inventory.`
      };
    }

    const newProduct: Product = {
      ...product,
      sku: normalizedSku
    };

    const now = new Date();
    const formattedDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const randomSuffix = typeof crypto !== 'undefined' && crypto.getRandomValues
      ? (crypto.getRandomValues(new Uint16Array(1))[0] % 9000) + 1000
      : (Date.now() % 9000) + 1000;

    // Dual Audit Logging: 1. Inbound Stock Adjustment (if stock > 0)
    let updatedAdjustmentLogs = this.state.adjustmentLogs;
    if (newProduct.stock > 0) {
      const newAdjLog: StockAdjustmentLog = {
        id: `ADJ-${randomSuffix}`,
        timestamp: formattedDate,
        sku: newProduct.sku,
        type: 'Restock Inbound',
        change: `+${newProduct.stock} Unit${newProduct.stock === 1 ? '' : 's'}`,
        reason: 'New product master registration',
        user
      };
      updatedAdjustmentLogs = [newAdjLog, ...this.state.adjustmentLogs];
    }

    // Dual Audit Logging: 2. Administrative Action Log
    const newAuditLog: AuditLog = {
      id: `AUD-${randomSuffix}`,
      timestamp: formattedDate,
      user: user.replace(' (Admin)', ''),
      action: `Created new inventory product SKU: ${newProduct.sku} (${newProduct.name})`,
      ip: '192.168.1.100 (Admin PC)'
    };

    this.state = {
      ...this.state,
      products: [newProduct, ...this.state.products],
      adjustmentLogs: updatedAdjustmentLogs,
      auditLogs: [newAuditLog, ...(this.state.auditLogs || [])]
    };
    this.notify();

    return { success: true };
  };

  public hydrateProducts = (products: Product[]): void => {
    if (!products || products.length === 0) return;
    this.state = {
      ...this.state,
      products: [...products.map((p) => ({ ...p }))]
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
  rollbackStock: typeof inventoryStore.rollbackStock;
  registerProduct: typeof inventoryStore.registerProduct;
  hydrateProducts: typeof inventoryStore.hydrateProducts;
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
    adjustStock: inventoryStore.adjustStock,
    rollbackStock: inventoryStore.rollbackStock,
    registerProduct: inventoryStore.registerProduct,
    hydrateProducts: inventoryStore.hydrateProducts
  };
}
