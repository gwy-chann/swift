import type { DbTransaction, ThermalReceiptData } from '@/lib/types/transaction';

export type PurchaseHistoryDateFilter = 'all' | 'warranty_eligible' | 'today' | 'last_30_days';

export interface WarrantyStatus {
  readonly isValid: boolean;
  readonly daysElapsed: number;
  readonly daysRemaining: number;
  readonly label: string;
}

export interface PurchaseHistoryFilters {
  readonly query: string;
  readonly dateRange: PurchaseHistoryDateFilter;
  readonly paymentMethod: string;
}

export interface PurchaseHistoryItemDetail {
  readonly id: string;
  readonly type: 'part' | 'service';
  readonly name: string;
  readonly skuOrCode: string;
  readonly unitPrice: number;
  readonly quantity: number;
  readonly subtotal: number;
  readonly shelfLocation?: string | null;
  readonly bay?: string | null;
}

export interface PurchaseHistoryRow {
  readonly id: string;
  readonly receiptNumber: string;
  readonly timestamp: string;
  readonly cashierName: string;
  readonly pricingMode: 'retail' | 'wholesale';
  readonly totalDue: number;
  readonly paymentMethod: string;
  readonly itemsCount: number;
  readonly warranty: WarrantyStatus;
  readonly rawTransaction: DbTransaction;
  readonly thermalReceipt: ThermalReceiptData;
}
