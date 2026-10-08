'use client';

import { useSyncExternalStore } from 'react';
import {
  CartItem,
  CartTotals,
  PricingMode,
  PartCartItem,
  ServiceCartItem,
  Product,
  LaborService,
  Transaction,
  TransactionPaymentMethod
} from '@/lib/types';
import { inventoryStore } from '@/lib/store/inventory-store';

export interface CartStoreState {
  items: CartItem[];
  pricingMode: PricingMode;
  discountRate: number;
  totals: CartTotals;
}

// Initial seed cart state derived directly from mockup/app.js (lines 76-83)
const INITIAL_CART_ITEMS: CartItem[] = [
  {
    id: 'MOT-3100-10W40',
    type: 'part',
    sku: 'MOT-3100-10W40',
    name: 'Motul 3100 Gold 4T 10W40 (1L)',
    price: 390,
    qty: 2,
    location: 'Aisle 1 / Shelf 1',
    retailPrice: 390,
    wholesalePrice: 330
  },
  {
    id: 'SRV-OIL-01',
    type: 'service',
    code: 'SRV-OIL-01',
    name: 'Labor: Standard Oil Change',
    price: 100,
    qty: 1,
    bay: 'Bay 1 / Quick Bay'
  }
];

function calculateCartTotals(items: CartItem[], discountRate: number): CartTotals {
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const total = Math.max(0, subtotal - discountAmount);
  const itemCount = items.reduce((sum, item) => sum + item.qty, 0);

  return {
    subtotal,
    discountRate,
    discountAmount,
    total,
    itemCount
  };
}

class CartStore {
  private state: CartStoreState;
  private readonly listeners = new Set<() => void>();

  constructor() {
    const discountRate = 0;
    this.state = {
      items: INITIAL_CART_ITEMS,
      pricingMode: 'retail',
      discountRate,
      totals: calculateCartTotals(INITIAL_CART_ITEMS, discountRate)
    };
  }

  public getState = (): CartStoreState => {
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

  private updateState(partial: Partial<CartStoreState>) {
    const updatedState = { ...this.state, ...partial };
    // Always recompute totals when items or discountRate changes
    if (partial.items || partial.discountRate !== undefined) {
      updatedState.totals = calculateCartTotals(
        updatedState.items,
        updatedState.discountRate
      );
    }
    this.state = updatedState;
    this.notify();
  }

  public addPart = (product: Product, qty: number = 1): void => {
    const existingIndex = this.state.items.findIndex(
      (item) => item.type === 'part' && item.sku === product.sku
    );

    const price = this.state.pricingMode === 'wholesale' ? product.wholesale : product.retail;

    let updatedItems: CartItem[];

    if (existingIndex > -1) {
      updatedItems = this.state.items.map((item, idx) => {
        if (idx === existingIndex) {
          return {
            ...item,
            qty: item.qty + qty
          };
        }
        return item;
      });
    } else {
      const newItem: PartCartItem = {
        id: product.sku,
        type: 'part',
        sku: product.sku,
        name: product.name,
        price,
        qty,
        location: product.location,
        retailPrice: product.retail,
        wholesalePrice: product.wholesale
      };
      updatedItems = [...this.state.items, newItem];
    }

    this.updateState({ items: updatedItems });
  };

  public addService = (service: LaborService, qty: number = 1): void => {
    const existingIndex = this.state.items.findIndex(
      (item) => item.type === 'service' && item.code === service.code
    );

    let updatedItems: CartItem[];

    if (existingIndex > -1) {
      updatedItems = this.state.items.map((item, idx) => {
        if (idx === existingIndex) {
          return {
            ...item,
            qty: item.qty + qty
          };
        }
        return item;
      });
    } else {
      const newItem: ServiceCartItem = {
        id: service.code,
        type: 'service',
        code: service.code,
        name: `Labor: ${service.name}`,
        price: service.rate,
        qty,
        bay: service.bay
      };
      updatedItems = [...this.state.items, newItem];
    }

    this.updateState({ items: updatedItems });
  };

  public updateQuantity = (id: string, qty: number): void => {
    if (qty <= 0) {
      this.removeItem(id);
      return;
    }

    const updatedItems = this.state.items.map((item) => {
      if (item.id === id) {
        return { ...item, qty };
      }
      return item;
    });

    this.updateState({ items: updatedItems });
  };

  public removeItem = (id: string): void => {
    const updatedItems = this.state.items.filter((item) => item.id !== id);
    this.updateState({ items: updatedItems });
  };

  public clearCart = (): void => {
    this.updateState({
      items: [],
      discountRate: 0
    });
  };

  public setPricingMode = (mode: PricingMode): void => {
    if (this.state.pricingMode === mode) return;

    // Recalculate physical part line item unit prices
    const updatedItems = this.state.items.map((item) => {
      if (item.type === 'part') {
        const newPrice = mode === 'wholesale' ? (item.wholesalePrice ?? item.price) : (item.retailPrice ?? item.price);
        return {
          ...item,
          price: newPrice
        };
      }
      return item;
    });

    const totals = calculateCartTotals(updatedItems, this.state.discountRate);

    this.state = {
      ...this.state,
      pricingMode: mode,
      items: updatedItems,
      totals
    };
    this.notify();
  };

  public setDiscountRate = (rate: number): void => {
    this.updateState({ discountRate: Math.max(0, rate) });
  };

  public checkout = (params: {
    cashier: string;
    cashTendered?: number;
    paymentMethod?: TransactionPaymentMethod;
  }): Transaction => {
    const { cashier, cashTendered, paymentMethod = 'Cash' } = params;
    const totals = this.state.totals;
    const tendered = cashTendered ?? totals.total;
    const change = Math.max(0, Math.round((tendered - totals.total) * 100) / 100);

    const randomSuffix = typeof crypto !== 'undefined' && crypto.getRandomValues
      ? (crypto.getRandomValues(new Uint16Array(1))[0] % 9000) + 1000
      : (Date.now() % 9000) + 1000;

    const transaction: Transaction = {
      id: `TX-${randomSuffix}`,
      timestamp: new Date().toISOString(),
      cashier,
      items: [...this.state.items],
      pricingMode: this.state.pricingMode,
      subtotal: totals.subtotal,
      discountRate: totals.discountRate,
      discountAmount: totals.discountAmount,
      total: totals.total,
      cashTendered: tendered,
      change,
      paymentMethod
    };

    // Decrement inventory stock for all physical parts
    for (const item of this.state.items) {
      if (item.type === 'part' && item.sku) {
        inventoryStore.decrementStock(item.sku, item.qty);
      }
    }

    // Clear cart upon successful transaction
    this.clearCart();

    return transaction;
  };
}

export const cartStore = new CartStore();

export function useCartStore(): CartStoreState & {
  addPart: typeof cartStore.addPart;
  addService: typeof cartStore.addService;
  updateQuantity: typeof cartStore.updateQuantity;
  removeItem: typeof cartStore.removeItem;
  clearCart: typeof cartStore.clearCart;
  setPricingMode: typeof cartStore.setPricingMode;
  setDiscountRate: typeof cartStore.setDiscountRate;
  checkout: typeof cartStore.checkout;
} {
  const state = useSyncExternalStore(
    cartStore.subscribe,
    cartStore.getState,
    cartStore.getState
  );

  return {
    ...state,
    addPart: cartStore.addPart,
    addService: cartStore.addService,
    updateQuantity: cartStore.updateQuantity,
    removeItem: cartStore.removeItem,
    clearCart: cartStore.clearCart,
    setPricingMode: cartStore.setPricingMode,
    setDiscountRate: cartStore.setDiscountRate,
    checkout: cartStore.checkout
  };
}
