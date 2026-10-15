import { z } from 'zod';

export const analyticsPeriodSchema = z.enum(['daily', 'weekly', 'monthly']);
export type AnalyticsPeriod = z.infer<typeof analyticsPeriodSchema>;

export const categoryPnlItemSchema = z.object({
  category: z.string(),
  units_sold: z.coerce.number().int().min(0).default(0),
  gross_revenue: z.coerce.number().min(0).default(0),
  cogs: z.coerce.number().min(0).default(0),
  net_profit: z.coerce.number().default(0),
  margin_pct: z.coerce.number().default(0),
});

export const financialReportSummarySchema = z.object({
  total_units_sold: z.coerce.number().int().min(0).default(0),
  total_gross_revenue: z.coerce.number().min(0).default(0),
  total_cogs: z.coerce.number().min(0).default(0),
  total_net_profit: z.coerce.number().default(0),
  overall_margin_pct: z.coerce.number().default(0),
  completed_invoices_count: z.coerce.number().int().min(0).default(0),
});

export const multiPeriodReportDataSchema = z.object({
  period: analyticsPeriodSchema,
  date_range_label: z.string(),
  summary: financialReportSummarySchema,
  categories: z.array(categoryPnlItemSchema),
  generated_at: z.string(),
});

export type CategoryPnlItem = z.infer<typeof categoryPnlItemSchema>;
export type FinancialReportSummary = z.infer<typeof financialReportSummarySchema>;
export type MultiPeriodReportData = z.infer<typeof multiPeriodReportDataSchema>;

export const accountingCsvExportParamsSchema = z.object({
  period: analyticsPeriodSchema.default('daily'),
  includeSummaryRow: z.boolean().default(true),
  filenamePrefix: z.string().default('swift_revenue_report'),
});

export const accountingCsvExportResultSchema = z.object({
  success: z.boolean(),
  filename: z.string(),
  csvContent: z.string(),
  rowCount: z.coerce.number().int().min(0),
  period: analyticsPeriodSchema,
  generatedAt: z.string(),
  error: z.string().optional(),
});

export type AccountingCsvExportParams = z.infer<typeof accountingCsvExportParamsSchema>;
export type AccountingCsvExportResult = z.infer<typeof accountingCsvExportResultSchema>;

/**
 * Validates multi-period report data
 */
export function validateMultiPeriodReportData(payload: unknown): {
  success: boolean;
  data?: MultiPeriodReportData;
  error?: string;
} {
  const parsed = multiPeriodReportDataSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
    };
  }
  return { success: true, data: parsed.data };
}

/**
 * Validates CSV export result
 */
export function validateAccountingCsvExportResult(payload: unknown): {
  success: boolean;
  data?: AccountingCsvExportResult;
  error?: string;
} {
  const parsed = accountingCsvExportResultSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join(', '),
    };
  }
  return { success: true, data: parsed.data };
}
