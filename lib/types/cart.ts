export type PricingMode = 'retail' | 'wholesale';

export interface BaseCartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
}

export interface PartCartItem extends BaseCartItem {
  type: 'part';
  sku: string;
  location?: string;
  retailPrice?: number;
  wholesalePrice?: number;
}

export interface ServiceCartItem extends BaseCartItem {
  type: 'service';
  code: string;
  bay?: string;
}

export type CartItem = PartCartItem | ServiceCartItem;

export interface CartTotals {
  subtotal: number;
  discountRate: number;
  discountAmount: number;
  total: number;
  itemCount: number;
}
