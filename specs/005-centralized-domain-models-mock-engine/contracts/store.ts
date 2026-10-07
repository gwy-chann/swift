import {
  CartItem,
  CartTotals,
  PricingMode,
  Product,
  LaborService,
  Transaction,
  TransactionPaymentMethod,
  StockAdjustmentLog,
  PunchLog
} from '@/lib/types';

// ---------------------------------------------------------------------------
// 1. POS Cart Store Contract
// ---------------------------------------------------------------------------

export interface CartStoreState {
  items: CartItem[];
  pricingMode: PricingMode;
  discountRate: number; // 0, 0.05, 0.20
  totals: CartTotals;
}

export interface CartStoreActions {
  addPart: (product: Product, qty?: number) => void;
  addService: (service: LaborService, qty?: number) => void;
  updateQuantity: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clearCart: () => void;
  setPricingMode: (mode: PricingMode) => void;
  setDiscountRate: (rate: number) => void;
  checkout: (params: {
    cashier: string;
    cashTendered?: number;
    paymentMethod?: TransactionPaymentMethod;
  }) => Transaction;
}

export interface CartStoreContract extends CartStoreState, CartStoreActions {}

// ---------------------------------------------------------------------------
// 2. Inventory Store Contract
// ---------------------------------------------------------------------------

export interface InventoryStoreState {
  products: Product[];
  adjustmentLogs: StockAdjustmentLog[];
}

export interface InventoryStoreActions {
  getProductBySku: (sku: string) => Product | undefined;
  filterByModel: (model: string) => Product[];
  filterByCategory: (category: string) => Product[];
  searchProducts: (query: string) => Product[];
  decrementStock: (sku: string, qty: number) => void;
  adjustStock: (params: {
    sku: string;
    type: StockAdjustmentLog['type'];
    units: number;
    reason: string;
    user: string;
  }) => void;
}

export interface InventoryStoreContract extends InventoryStoreState, InventoryStoreActions {}

// ---------------------------------------------------------------------------
// 3. Shift Punch Clock Store Contract
// ---------------------------------------------------------------------------

export interface PunchStoreState {
  isShiftActive: boolean;
  shiftSeconds: number; // e.g. 15150 (~ 04h 12m 30s)
  punchLogs: PunchLog[];
  currentStaff: string;
}

export interface PunchStoreActions {
  clockIn: (staff: string) => void;
  clockOut: (staff: string) => void;
  tickSecond: () => void;
  resetTimer: () => void;
}

export interface PunchStoreContract extends PunchStoreState, PunchStoreActions {}
