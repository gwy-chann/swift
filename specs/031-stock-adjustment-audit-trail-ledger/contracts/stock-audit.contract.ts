import { z } from 'zod';

/**
 * Validation Contracts & Schema Definitions for Stock Adjustment Audit Trail & Shrinkage Analytics
 * Jira Issue: SIAA-65 (STORY-7.10)
 */

export const StockAuditFilterSchema = z.object({
  sku: z.string().trim().optional(),
  adjustmentType: z.string().trim().optional(),
  startDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  endDate: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  search: z.string().trim().optional(),
  limit: z.number().int().positive().max(1000).default(50).optional(),
  offset: z.number().int().nonnegative().default(0).optional(),
});

export type StockAuditFilterOptions = z.infer<typeof StockAuditFilterSchema>;

export const StockAdjustmentLogEntrySchema = z.object({
  id: z.string().uuid(),
  sku: z.string().min(1),
  adjustmentType: z.string().min(1),
  quantityDelta: z.number().int().refine((val) => val !== 0, {
    message: 'Quantity delta must be non-zero',
  }),
  previousStock: z.number().int().nonnegative(),
  newStock: z.number().int().nonnegative(),
  reason: z.string().default(''),
  userId: z.string().uuid().nullable().optional(),
  userName: z.string().default('Staff Member'),
  createdAt: z.string().datetime(),
});

export type StockAdjustmentLogEntry = z.infer<typeof StockAdjustmentLogEntrySchema>;

export const StockAuditSummaryMetricsSchema = z.object({
  totalCount: z.number().int().nonnegative(),
  netDelta: z.number().int(),
  totalShrinkage: z.number().int().nonnegative(),
  totalIntake: z.number().int().nonnegative(),
});

export type StockAuditSummaryMetrics = z.infer<typeof StockAuditSummaryMetricsSchema>;

export const StockAuditLogsResponseSchema = z.object({
  success: z.boolean(),
  logs: z.array(StockAdjustmentLogEntrySchema),
  metrics: StockAuditSummaryMetricsSchema,
  total: z.number().int().nonnegative(),
  error: z.string().optional(),
});

export type StockAuditLogsResponse = z.infer<typeof StockAuditLogsResponseSchema>;

export const StockAuditExportResultSchema = z.object({
  success: z.boolean(),
  csvContent: z.string().optional(),
  filename: z.string().optional(),
  recordCount: z.number().int().nonnegative().optional(),
  error: z.string().optional(),
});

export type StockAuditExportResult = z.infer<typeof StockAuditExportResultSchema>;
