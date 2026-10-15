import { z } from "zod";

/**
 * Validation schema for itemized category P&L record.
 */
export const CategoryPnlItemSchema = z.object({
  category: z.string().min(1, "Category name is required"),
  units_sold: z.number().int().nonnegative(),
  gross_revenue: z.number(),
  cogs: z.number(),
  net_profit: z.number(),
  margin_pct: z.number(),
});

export type CategoryPnlItemContract = z.infer<typeof CategoryPnlItemSchema>;

/**
 * Validation schema for consolidated summary metrics.
 */
export const CategoryPnlSummarySchema = z.object({
  total_units_sold: z.number().int().nonnegative(),
  total_gross_revenue: z.number(),
  total_cogs: z.number(),
  total_net_profit: z.number(),
  overall_margin_pct: z.number(),
});

export type CategoryPnlSummaryContract = z.infer<typeof CategoryPnlSummarySchema>;

/**
 * Root response contract for Category P&L data.
 */
export const CategoryPnlDataSchema = z.object({
  categories: z.array(CategoryPnlItemSchema),
  summary: CategoryPnlSummarySchema,
});

export type CategoryPnlDataContract = z.infer<typeof CategoryPnlDataSchema>;

/**
 * Filter parameters contract for period selection.
 */
export const ReportingPeriodSchema = z.enum(["daily", "weekly", "monthly"]);
export type ReportingPeriodContract = z.infer<typeof ReportingPeriodSchema>;
