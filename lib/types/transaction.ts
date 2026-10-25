import type { CartItem, PricingMode } from './cart.ts';

export type TransactionPaymentMethod = 'Cash' | 'GCash' | 'Card' | 'Maya' | string;
export type TransactionDiscountType = 'none' | 'senior' | 'pwd' | 'senior_pwd' | 'vip' | 'fleet' | string;
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
  technician_notes?: string | null;
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
  discountType?: TransactionDiscountType;
  discountRate: number; // 0, 0.05, 0.20
  discountAmount: number;
  total: number;
  cashTendered?: number;
  change?: number;
  paymentMethod?: TransactionPaymentMethod;
  technicianNotes?: string | null;
}

export interface CheckoutItemPayload {
  itemType: TransactionItemType;
  itemSkuOrCode: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  shelfLocation?: string | null;
  bay?: string | null;
}

export interface CheckoutPayload {
  receiptNumber?: string;
  cashierId?: string | null;
  cashierName?: string;
  customerName?: string;
  vehicleModel?: string;
  plateNumber?: string;
  notes?: string | null;
  pricingMode: PricingMode;
  subtotal: number;
  discountType?: TransactionDiscountType | null;
  discountRate: number;
  discountAmount: number;
  totalDue: number;
  cashTendered: number;
  changeDue: number;
  paymentMethod: TransactionPaymentMethod;
  technicianNotes?: string | null;
  items: CheckoutItemPayload[];
}

export type CheckoutActionResult =
  | {
      success: true;
      transactionId: string;
      receiptNumber: string;
      itemsCount: number;
      partsDecremented: number;
      workOrdersCreated?: number;
      workOrderNumbers?: string[];
      createdAt: string;
    }
  | {
      success: false;
      code: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_FOUND' | 'VALIDATION_ERROR' | 'CHECKOUT_FAILED';
      sku?: string;
      error: string;
    };

export interface ThermalReceiptItem {
  id: string;
  itemType: TransactionItemType;
  skuOrCode: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  shelfLocation?: string | null;
  bay?: string | null;
  duration?: string | null;
}

export interface ThermalReceiptData {
  id: string;
  receiptNumber: string;
  timestamp: string;
  cashierName: string;
  pricingMode: PricingMode;
  items: ThermalReceiptItem[];
  technicianNotes?: string | null;
  subtotal: number;
  discountType?: string | null;
  discountRate: number;
  discountAmount: number;
  totalDue: number;
  cashTendered: number;
  changeDue: number;
  paymentMethod: TransactionPaymentMethod;
}

export type ThermalRollWidth = '58mm' | '80mm';


