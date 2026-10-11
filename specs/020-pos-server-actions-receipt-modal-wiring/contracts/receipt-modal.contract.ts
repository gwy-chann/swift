import { z } from 'zod';

export const ThermalReceiptItemSchema = z.object({
  id: z.string(),
  itemType: z.enum(['part', 'service']),
  skuOrCode: z.string(),
  name: z.string(),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  subtotal: z.number().nonnegative(),
  shelfLocation: z.string().nullable().optional(),
  bay: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
});

export const ThermalReceiptDataSchema = z.object({
  id: z.string(),
  receiptNumber: z.string().min(1),
  timestamp: z.string(),
  cashierName: z.string(),
  pricingMode: z.enum(['retail', 'wholesale']),
  items: z.array(ThermalReceiptItemSchema).min(1),
  subtotal: z.number().nonnegative(),
  discountType: z.string().nullable().optional(),
  discountRate: z.number().min(0).max(1),
  discountAmount: z.number().nonnegative(),
  totalDue: z.number().nonnegative(),
  cashTendered: z.number().nonnegative(),
  changeDue: z.number().nonnegative(),
  paymentMethod: z.string(),
});

export type ThermalReceiptItem = z.infer<typeof ThermalReceiptItemSchema>;
export type ThermalReceiptData = z.infer<typeof ThermalReceiptDataSchema>;
export type ThermalRollWidth = '58mm' | '80mm';
