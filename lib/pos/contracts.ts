import { z } from 'zod';
import type { CheckoutPayload } from '../types/transaction.ts';

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
  cashierId: z.string().nullable().optional(),
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

export const thermalReceiptItemSchema = z.object({
  id: z.string(),
  itemType: z.enum(['part', 'service']),
  skuOrCode: z.string(),
  name: z.string(),
  unitPrice: z.number().min(0),
  quantity: z.number().int().positive(),
  subtotal: z.number().min(0),
  shelfLocation: z.string().nullable().optional(),
  bay: z.string().nullable().optional(),
  duration: z.string().nullable().optional()
});

export const thermalReceiptDataSchema = z.object({
  id: z.string(),
  receiptNumber: z.string().min(1),
  timestamp: z.string(),
  cashierName: z.string(),
  pricingMode: z.enum(['retail', 'wholesale']),
  items: z.array(thermalReceiptItemSchema).min(1),
  technicianNotes: z.string().nullable().optional(),
  subtotal: z.number().min(0),
  discountType: z.string().nullable().optional(),
  discountRate: z.number().min(0).max(1),
  discountAmount: z.number().min(0),
  totalDue: z.number().min(0),
  cashTendered: z.number().min(0),
  changeDue: z.number().min(0),
  paymentMethod: z.string()
});

export function validateThermalReceiptData(data: unknown): {
  success: boolean;
  error?: string;
} {
  const result = thermalReceiptDataSchema.safeParse(data);
  if (!result.success) {
    const errorMsg = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errorMsg };
  }
  return { success: true };
}

