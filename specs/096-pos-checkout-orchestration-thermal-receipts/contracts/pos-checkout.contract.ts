/**
 * TypeScript API contracts and Zod validation schemas for SIAA-96:
 * High-Concurrency POS Checkout Orchestration & Thermal Receipts
 */

export interface PosCheckoutItemContract {
  itemType: 'part' | 'service';
  itemSkuOrCode: string;
  itemName: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  shelfLocation?: string | null;
  bay?: string | null;
}

export interface PosCheckoutRequestContract {
  receiptNumber?: string;
  cashierId?: string | null;
  cashierName: string;
  pricingMode: 'retail' | 'wholesale';
  subtotal: number;
  discountType?: string | null;
  discountRate?: number;
  discountAmount?: number;
  totalDue: number;
  cashTendered: number;
  changeDue?: number;
  paymentMethod: string;
  items: PosCheckoutItemContract[];
}

export interface PosCheckoutResponseContract {
  success: boolean;
  transactionId: string;
  receiptNumber: string;
  itemsCount: number;
  partsDecremented: number;
  subtotal: number;
  discountAmount: number;
  totalDue: number;
  cashTendered: number;
  changeDue: number;
  createdAt: string;
}

export interface ThermalReceiptItemContract {
  id?: string;
  itemType: 'part' | 'service';
  skuOrCode: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  shelfLocation?: string | null;
  bay?: string | null;
  duration?: string;
}

export interface ThermalReceiptResponseContract {
  receiptNumber: string;
  timestamp: string;
  cashierName: string;
  pricingMode: string;
  subtotal: number;
  discountType?: string | null;
  discountRate?: number;
  discountAmount: number;
  totalDue: number;
  cashTendered: number;
  changeDue: number;
  paymentMethod: string;
  items: ThermalReceiptItemContract[];
  storeName: string;
  address: string;
  tin: string;
  phone: string;
  warrantyNotice: string;
  escPosBase64?: string;
  escPosPrintable?: string;
}
