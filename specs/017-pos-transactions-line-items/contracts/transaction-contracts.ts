import { z } from 'zod';

export const transactionPaymentMethodSchema = z.enum(['Cash', 'GCash', 'Card', 'Maya']);
export const pricingModeSchema = z.enum(['retail', 'wholesale']);
export const discountTypeSchema = z.enum(['none', 'senior', 'pwd', 'vip']);
export const itemTypeSchema = z.enum(['part', 'service']);

export const transactionItemSchema = z.object({
  id: z.string().uuid().optional(),
  transaction_id: z.string().uuid().optional(),
  item_type: itemTypeSchema,
  item_sku_or_code: z.string().min(1, 'Item SKU or code is required'),
  item_name: z.string().min(1, 'Item name is required'),
  unit_price: z.number().nonnegative('Unit price cannot be negative'),
  quantity: z.number().int().positive('Quantity must be at least 1'),
  subtotal: z.number().nonnegative('Subtotal cannot be negative'),
  bay: z.string().nullable().optional(),
  shelf_location: z.string().nullable().optional(),
});

export const createTransactionSchema = z.object({
  id: z.string().uuid().optional(),
  receipt_number: z.string().min(3, 'Receipt number is required'),
  cashier_id: z.string().uuid().nullable().optional(),
  cashier_name: z.string().min(1, 'Cashier name is required'),
  pricing_mode: pricingModeSchema,
  subtotal: z.number().nonnegative('Subtotal cannot be negative'),
  discount_type: discountTypeSchema.nullable().optional(),
  discount_rate: z.number().min(0).max(1),
  discount_amount: z.number().nonnegative('Discount amount cannot be negative'),
  total_due: z.number().nonnegative('Total due cannot be negative'),
  cash_tendered: z.number().nonnegative('Cash tendered cannot be negative'),
  change_due: z.number().nonnegative('Change due cannot be negative'),
  payment_method: transactionPaymentMethodSchema.default('Cash'),
  items: z.array(transactionItemSchema).min(1, 'Transaction must contain at least one line item'),
}).refine((data) => data.cash_tendered >= data.total_due, {
  message: 'Cash tendered must be greater than or equal to total due',
  path: ['cash_tendered'],
});

export const transactionQuerySchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
  search: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export type TransactionItemInput = z.infer<typeof transactionItemSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type TransactionQueryParams = z.infer<typeof transactionQuerySchema>;
