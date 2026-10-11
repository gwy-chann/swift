import type { CartItem, PricingMode } from './cart.ts';

export type TransactionPaymentMethod = 'Cash' | 'GCash' | 'Card' | 'Maya' | string;
export type TransactionDiscountType = 'none' | 'senior' | 'pwd' | 'vip' | string;
export type TransactionItemType = 'part' | 'service';

export interface DbTransactionItem {
  id?: string;
  transaction_id?: string;
  item_type: TransactionItemType;
  item_sku_or_code: string;
  item_name: string;
  unit_price: number;
  quantity: number;
  subtotal: number;
  bay?: string | null;
  shelf_location?: string | null;
}

export interface DbTransaction {
  id?: string;
  receipt_number: string;
  cashier_id?: string | null;
  cashier_name: string;
  pricing_mode: PricingMode;
  subtotal: number;
  discount_type?: TransactionDiscountType | null;
  discount_rate: number;
  discount_amount: number;
  total_due: number;
  cash_tendered: number;
  change_due: number;
  payment_method: TransactionPaymentMethod;
  created_at?: string;
  items?: DbTransactionItem[];
}

export interface Transaction {
  id: string; // e.g. "TX-1041"
  timestamp: string; // ISO date string or formatted locale string
  cashier: string; // e.g. "Mike Morales"
  items: CartItem[];
  pricingMode: PricingMode;
  subtotal: number;
  discountRate: number; // 0, 0.05, 0.20
  discountAmount: number;
  total: number;
  cashTendered?: number;
  change?: number;
  paymentMethod?: TransactionPaymentMethod;
}
