import { z } from 'zod';

export const ThermalRollWidthSchema = z.enum(['58mm', '80mm']);
export type ThermalRollWidth = z.infer<typeof ThermalRollWidthSchema>;

export const ThermalReceiptItemSchema = z.object({
  id: z.string().min(1),
  itemType: z.enum(['part', 'service']),
  skuOrCode: z.string().min(1),
  name: z.string().min(1),
  unitPrice: z.number().nonnegative(),
  quantity: z.number().int().positive(),
  subtotal: z.number().nonnegative(),
  shelfLocation: z.string().nullable().optional(),
  bay: z.string().nullable().optional(),
  duration: z.string().nullable().optional(),
});
export type ThermalReceiptItem = z.infer<typeof ThermalReceiptItemSchema>;

export const ThermalReceiptDataSchema = z.object({
  id: z.string().min(1),
  receiptNumber: z.string().regex(/^TX-\d+/i, 'Receipt number must follow TX-XXXX format'),
  timestamp: z.string().min(1),
  cashierName: z.string().min(1),
  pricingMode: z.enum(['retail', 'wholesale']),
  items: z.array(ThermalReceiptItemSchema).min(1, 'Receipt must contain at least one item'),
  technicianNotes: z.string().nullable().optional(),
  subtotal: z.number().nonnegative(),
  discountType: z.string().nullable().optional(),
  discountRate: z.number().min(0).max(1),
  discountAmount: z.number().nonnegative(),
  totalDue: z.number().nonnegative(),
  cashTendered: z.number().nonnegative(),
  changeDue: z.number().nonnegative(),
  paymentMethod: z.string().default('Cash'),
});
export type ThermalReceiptData = z.infer<typeof ThermalReceiptDataSchema>;

export interface ThermalReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinish?: () => void;
  receiptData?: ThermalReceiptData | null;
  initialRollWidth?: ThermalRollWidth;
}
