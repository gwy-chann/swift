import { z } from 'zod';

export const StockAdjustmentPayloadSchema = z.object({
  sku: z.string().min(1, 'SKU is required'),
  quantityDelta: z.number().int().refine((val) => val !== 0, {
    message: 'Adjustment delta cannot be zero',
  }),
  adjustmentType: z.string().default('Stock Adjustment'),
  reason: z.string().optional().default(''),
  userName: z.string().optional().default('Staff Member'),
});

export type StockAdjustmentPayload = z.infer<typeof StockAdjustmentPayloadSchema>;

export const StockAdjustmentResultSchema = z.object({
  success: z.boolean(),
  sku: z.string(),
  previousStock: z.number().int().optional(),
  newStock: z.number().int().optional(),
  quantityDelta: z.number().int().optional(),
  adjustmentType: z.string().optional(),
  logId: z.string().optional(),
  userName: z.string().optional(),
  error: z.string().optional(),
  code: z.string().optional(),
});

export type StockAdjustmentResult = z.infer<typeof StockAdjustmentResultSchema>;

export const StockAdjustmentLogEntrySchema = z.object({
  id: z.string(),
  sku: z.string(),
  adjustmentType: z.string(),
  quantityDelta: z.number().int(),
  previousStock: z.number().int(),
  newStock: z.number().int(),
  reason: z.string(),
  userId: z.string().nullable().optional(),
  userName: z.string(),
  createdAt: z.string(),
});

export type StockAdjustmentLogEntry = z.infer<typeof StockAdjustmentLogEntrySchema>;

export const StockAuditFilterSchema = z.object({
  sku: z.string().optional(),
  adjustmentType: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  search: z.string().optional(),
  limit: z.number().int().positive().default(50),
  offset: z.number().int().nonnegative().default(0),
});

export type StockAuditFilter = z.infer<typeof StockAuditFilterSchema>;
