import { CartItem, PricingMode } from './cart';

export type TransactionPaymentMethod = 'Cash' | 'GCash' | 'Card' | 'Maya' | string;

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
