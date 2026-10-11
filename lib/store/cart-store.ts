'use client';

import { useSyncExternalStore } from 'react';
import type {
  CartItem,
  CartTotals,
  PricingMode,
  PartCartItem,
  ServiceCartItem,
  Product,
  LaborService,
  TransactionPaymentMethod,
  ThermalReceiptData,
  CheckoutPayload
} from '../types/index.ts';
import { inventoryStore } from './inventory-store.ts';
import { processCheckoutAction } from '../pos/actions.ts';
import {
  calculateCartTotals,
  type DiscountTierId,
  getDiscountTierById,
  getDiscountTierByRate
} from '../pos/discount-matrix.ts';

export interface CartStoreState {
  items: CartItem[];
  pricingMode: PricingMode;
  discountRate: number;
  discountType: DiscountTierId;
  totals: CartTotals;
  isProcessingCheckout: boolean;
  isPaymentModalOpen: boolean;
  isReceiptModalOpen: boolean;
  activeReceiptData: ThermalReceiptData | null;
  lastCheckoutError: string | null;
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

class CartStore {
  private state: CartStoreState;
  private readonly listeners = new Set<() => void>();

  constructor() {
    const discountRate = 0;
    const discountType: DiscountTierId = 'none';
    this.state = {
      items: INITIAL_CART_ITEMS,
      pricingMode: 'retail',
      discountRate,
      discountType,
      totals: calculateCartTotals(INITIAL_CART_ITEMS, discountRate, discountType),
      isProcessingCheckout: false,
      isPaymentModalOpen: false,
      isReceiptModalOpen: false,
      activeReceiptData: null,
      lastCheckoutError: null
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
    // Always recompute totals when items, discountRate, or discountType changes
    if (
      partial.items ||
      partial.discountRate !== undefined ||
      partial.discountType !== undefined
    ) {
      updatedState.totals = calculateCartTotals(
        updatedState.items,
        updatedState.discountRate,
        updatedState.discountType
      );
    }
    this.state = updatedState;
    this.notify();
  }

  public addPart = (
    product: Product,
    qty: number = 1,
    isOverridden: boolean = false
  ): { success: boolean; reason?: 'out_of_stock' | 'exceeds_stock' } => {
    const existing = this.state.items.find(
      (item) => item.type === 'part' && item.sku === product.sku
    ) as PartCartItem | undefined;

    const currentQty = existing ? existing.qty : 0;
    const targetQty = currentQty + qty;
    const stock = product.stock ?? 0;
    const alreadyOverridden = existing?.isOverridden || isOverridden;

    if (!alreadyOverridden) {
      if (stock <= 0) {
        return { success: false, reason: 'out_of_stock' };
      }
      if (targetQty > stock) {
        return { success: false, reason: 'exceeds_stock' };
      }
    }

    const price = this.state.pricingMode === 'wholesale' ? product.wholesale : product.retail;

    let updatedItems: CartItem[];

    if (existing) {
      updatedItems = this.state.items.map((item) => {
        if (item.type === 'part' && item.sku === product.sku) {
          return {
            ...item,
            qty: targetQty,
            price,
            stock: product.stock,
            isOverridden: alreadyOverridden
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
        wholesalePrice: product.wholesale,
        stock: product.stock,
        minThreshold: product.minThreshold,
        isOverridden: alreadyOverridden
      };
      updatedItems = [...this.state.items, newItem];
    }

    this.updateState({ items: updatedItems });
    return { success: true };
  };

  public addService = (
    service: LaborService,
    qty: number = 1
  ): { success: boolean } => {
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
        bay: service.bay,
        duration: service.duration
      };
      updatedItems = [...this.state.items, newItem];
    }

    this.updateState({ items: updatedItems });
    return { success: true };
  };

  public updateQuantity = (
    id: string,
    qty: number,
    isOverridden: boolean = false
  ): { success: boolean; reason?: 'exceeds_stock' } => {
    if (qty <= 0) {
      this.removeItem(id);
      return { success: true };
    }

    const item = this.state.items.find((i) => i.id === id);
    if (!item) return { success: true };

    if (item.type === 'part') {
      const stock = item.stock ?? 999;
      const alreadyOverridden = item.isOverridden || isOverridden;
      if (!alreadyOverridden && qty > stock) {
        return { success: false, reason: 'exceeds_stock' };
      }
    }

    const updatedItems = this.state.items.map((i) => {
      if (i.id === id) {
        return {
          ...i,
          qty,
          ...(i.type === 'part' && isOverridden ? { isOverridden: true } : {})
        };
      }
      return i;
    });

    this.updateState({ items: updatedItems });
    return { success: true };
  };

  public removeItem = (id: string): void => {
    const updatedItems = this.state.items.filter((item) => item.id !== id);
    this.updateState({ items: updatedItems });
  };

  public clearCart = (): void => {
    this.updateState({
      items: [],
      discountRate: 0,
      discountType: 'none',
      lastCheckoutError: null
    });
  };

  public openReceiptModal = (receiptData?: ThermalReceiptData | null): void => {
    this.updateState({
      isReceiptModalOpen: true,
      ...(receiptData !== undefined ? { activeReceiptData: receiptData } : {})
    });
  };

  public closeReceiptModal = (): void => {
    this.updateState({
      isReceiptModalOpen: false
    });
  };

  public openPaymentModal = (): void => {
    this.updateState({
      isPaymentModalOpen: true
    });
  };

  public closePaymentModal = (): void => {
    this.updateState({
      isPaymentModalOpen: false
    });
  };

  public setPricingMode = (mode: PricingMode): void => {
    if (this.state.pricingMode === mode) return;

    // Recalculate physical part line item unit prices
    const updatedItems = this.state.items.map((item) => {
      if (item.type === 'part') {
        const product = inventoryStore.getProductBySku(item.sku);
        const wholesalePrice = item.wholesalePrice ?? product?.wholesale ?? item.price;
        const retailPrice = item.retailPrice ?? product?.retail ?? item.price;
        const newPrice = mode === 'wholesale' ? wholesalePrice : retailPrice;
        return {
          ...item,
          wholesalePrice,
          retailPrice,
          price: newPrice
        };
      }
      return item;
    });

    const totals = calculateCartTotals(
      updatedItems,
      this.state.discountRate,
      this.state.discountType
    );

    this.state = {
      ...this.state,
      pricingMode: mode,
      items: updatedItems,
      totals
    };
    this.notify();
  };

  public setDiscountRate = (rate: number): void => {
    const validRate = Math.max(0, rate);
    const tier = getDiscountTierByRate(validRate);
    this.updateState({
      discountRate: validRate,
      discountType: tier.id
    });
  };

  public setDiscountTier = (tierId: DiscountTierId): void => {
    // If clicking currently active tier or 'none', toggle back to Standard 0%
    if (this.state.discountType === tierId || tierId === 'none') {
      this.updateState({
        discountRate: 0,
        discountType: 'none'
      });
      return;
    }

    const tier = getDiscountTierById(tierId);
    this.updateState({
      discountRate: tier.rate,
      discountType: tier.id
    });
  };

  public checkout = async (params: {
    cashier: string;
    cashTendered?: number;
    paymentMethod?: TransactionPaymentMethod;
    discountType?: string;
  }): Promise<{
    success: boolean;
    receiptNumber?: string;
    transactionId?: string;
    receiptData?: ThermalReceiptData;
    error?: string;
    code?: string;
    sku?: string;
    subtotal?: number;
    discountType?: string | null;
    discountRate?: number;
    discountAmount?: number;
    total?: number;
    cashTendered?: number;
    change?: number;
  }> => {
    const { cashier, cashTendered, paymentMethod = 'Cash', discountType } = params;
    const totals = this.state.totals;
    const tendered = cashTendered ?? totals.total;
    const change = Math.max(0, Math.round((tendered - totals.total) * 100) / 100);

    if (this.state.items.length === 0) {
      return { success: false, error: 'Cart is empty' };
    }

    this.updateState({ isProcessingCheckout: true, lastCheckoutError: null });

    try {
      const payload: CheckoutPayload = {
        cashierName: cashier,
        pricingMode: this.state.pricingMode,
        subtotal: totals.subtotal,
        discountType: discountType || this.state.discountType || (this.state.discountRate > 0 ? 'discount' : 'none'),
        discountRate: totals.discountRate,
        discountAmount: totals.discountAmount,
        totalDue: totals.total,
        cashTendered: tendered,
        changeDue: change,
        paymentMethod,
        items: this.state.items.map((item) => {
          if (item.type === 'part') {
            return {
              itemType: 'part' as const,
              itemSkuOrCode: item.sku,
              itemName: item.name,
              unitPrice: item.price,
              quantity: item.qty,
              subtotal: item.price * item.qty,
              shelfLocation: item.location || null,
              bay: null
            };
          }
          return {
            itemType: 'service' as const,
            itemSkuOrCode: item.code,
            itemName: item.name,
            unitPrice: item.price,
            quantity: item.qty,
            subtotal: item.price * item.qty,
            shelfLocation: null,
            bay: item.bay || null
          };
        })
      };

      const result = await processCheckoutAction(payload);

      if (!result.success) {
        this.updateState({
          isProcessingCheckout: false,
          lastCheckoutError: result.error
        });
        return {
          success: false,
          error: result.error,
          code: result.code,
          sku: result.sku
        };
      }

      // Build standardized thermal receipt data
      const receiptData: ThermalReceiptData = {
        id: result.transactionId,
        receiptNumber: result.receiptNumber,
        timestamp: result.createdAt,
        cashierName: cashier,
        pricingMode: this.state.pricingMode,
        subtotal: totals.subtotal,
        discountType: payload.discountType,
        discountRate: totals.discountRate,
        discountAmount: totals.discountAmount,
        totalDue: totals.total,
        cashTendered: tendered,
        changeDue: change,
        paymentMethod,
        items: this.state.items.map((item, idx) => ({
          id: `item-${idx}`,
          itemType: item.type,
          skuOrCode: item.type === 'part' ? item.sku : item.code,
          name: item.name,
          unitPrice: item.price,
          quantity: item.qty,
          subtotal: item.price * item.qty,
          shelfLocation: item.type === 'part' ? item.location : null,
          bay: item.type === 'service' ? item.bay : null,
          duration: item.type === 'service' ? (item as ServiceCartItem).duration || '15m' : undefined
        }))
      };

      // Clear active cart upon successful transaction and open receipt modal
      this.updateState({
        items: [],
        discountRate: 0,
        discountType: 'none',
        isProcessingCheckout: false,
        isPaymentModalOpen: false,
        isReceiptModalOpen: true,
        activeReceiptData: receiptData,
        lastCheckoutError: null
      });

      // Broadcast local event for realtime UI listeners
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('swift:pos:checkout', {
            detail: {
              totalDue: totals.total,
              receiptNumber: result.receiptNumber,
              transactionId: result.transactionId
            }
          })
        );
      }

      return {
        success: true,
        receiptNumber: result.receiptNumber,
        transactionId: result.transactionId,
        receiptData,
        subtotal: totals.subtotal,
        discountType: payload.discountType,
        discountRate: totals.discountRate,
        discountAmount: totals.discountAmount,
        total: totals.total,
        cashTendered: tendered,
        change
      };

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown checkout error';
      this.updateState({
        isProcessingCheckout: false,
        lastCheckoutError: errorMsg
      });
      return { success: false, error: errorMsg };
    }
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
  setDiscountTier: typeof cartStore.setDiscountTier;
  checkout: typeof cartStore.checkout;
  openPaymentModal: typeof cartStore.openPaymentModal;
  closePaymentModal: typeof cartStore.closePaymentModal;
  openReceiptModal: typeof cartStore.openReceiptModal;
  closeReceiptModal: typeof cartStore.closeReceiptModal;
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
    setDiscountTier: cartStore.setDiscountTier,
    checkout: cartStore.checkout,
    openPaymentModal: cartStore.openPaymentModal,
    closePaymentModal: cartStore.closePaymentModal,
    openReceiptModal: cartStore.openReceiptModal,
    closeReceiptModal: cartStore.closeReceiptModal
  };
}

