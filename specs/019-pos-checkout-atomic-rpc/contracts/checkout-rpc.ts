import { z } from 'zod';

export const checkoutItemSchema = z.object({
  itemType: z.enum(['part', 'service']),
  itemSkuOrCode: z.string().min(1, 'Item SKU or code is required'),
  itemName: z.string().min(1, 'Item name is required'),
  unitPrice: z.number().min(0, 'Unit price must be non-negative'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  subtotal: z.number().min(0, 'Subtotal must be non-negative'),
  shelfLocation: z.string().nullable().optional(),
  bay: z.string().nullable().optional()
});

export const checkoutPayloadSchema = z.object({
  receiptNumber: z.string().optional(),
  cashierId: z.string().uuid().nullable().optional(),
  cashierName: z.string().min(1).default('Cashier'),
  pricingMode: z.enum(['retail', 'wholesale']),
  subtotal: z.number().min(0, 'Subtotal must be non-negative'),
  discountType: z.enum(['none', 'senior', 'pwd', 'vip']).nullable().optional(),
  discountRate: z.number().min(0).max(1).default(0),
  discountAmount: z.number().min(0).default(0),
  totalDue: z.number().min(0, 'Total due must be non-negative'),
  cashTendered: z.number().min(0, 'Cash tendered must be non-negative'),
  changeDue: z.number().min(0).default(0),
  paymentMethod: z.enum(['Cash', 'GCash', 'Card', 'Maya']).default('Cash'),
  items: z.array(checkoutItemSchema).min(1, 'At least one line item is required')
});

export type CheckoutItemInput = z.infer<typeof checkoutItemSchema>;
export type CheckoutPayloadInput = z.infer<typeof checkoutPayloadSchema>;

export interface CheckoutRpcResponse {
  success: boolean;
  transaction_id: string;
  receipt_number: string;
  items_count: number;
  parts_decremented: number;
  created_at: string;
}

export type CheckoutActionResult =
  | {
      success: true;
      transactionId: string;
      receiptNumber: string;
      itemsCount: number;
      partsDecremented: number;
      createdAt: string;
    }
  | {
      success: false;
      code: 'INSUFFICIENT_STOCK' | 'PRODUCT_NOT_FOUND' | 'VALIDATION_ERROR' | 'CHECKOUT_FAILED';
      sku?: string;
      error: string;
    };
