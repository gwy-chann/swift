import { z } from 'zod';
import type { CheckoutPayload, CheckoutItemPayload } from '../types/transaction.ts';

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
  discountType: z.string().nullable().optional(),
  discountRate: z.number().min(0).max(1).default(0),
  discountAmount: z.number().min(0).default(0),
  totalDue: z.number().min(0, 'Total due must be non-negative'),
  cashTendered: z.number().min(0, 'Cash tendered must be non-negative'),
  changeDue: z.number().min(0).default(0),
  paymentMethod: z.string().default('Cash'),
  items: z.array(checkoutItemSchema).min(1, 'At least one line item is required')
});

export function validateCheckoutPayload(payload: unknown): {
  success: boolean;
  data?: CheckoutPayload;
  error?: string;
} {
  const result = checkoutPayloadSchema.safeParse(payload);
  if (!result.success) {
    const errorMsg = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errorMsg };
  }

  return { success: true, data: result.data as unknown as CheckoutPayload };
}
