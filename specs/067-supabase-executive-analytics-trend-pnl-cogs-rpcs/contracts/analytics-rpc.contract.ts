import { z } from 'zod';

/**
 * Executive KPI Aggregator Contract (public.get_executive_kpis)
 */
export const executiveKpiSchema = z.object({
  gross_revenue_today: z.number().min(0),
  gross_revenue_yesterday: z.number().min(0),
  revenue_growth_pct: z.number(),
  active_work_orders_count: z.number().int().min(0),
  pending_parts_count: z.number().int().min(0),
  net_profit_margin_pct: z.number(),
  gross_profit_amount: z.number(),
  critical_low_stock_count: z.number().int().min(0),
});

export type ExecutiveKpiContract = z.infer<typeof executiveKpiSchema>;

/**
 * 7-Day Revenue Trend Day Item Contract (public.get_revenue_trend_7d)
 */
export const revenueTrendDaySchema = z.object({
  date: z.string(),
  day_label: z.string(),
  parts_amount: z.number().min(0),
  parts_display: z.string().optional(),
  labor_amount: z.number().min(0),
  labor_display: z.string().optional(),
  total_amount: z.number().min(0),
  parts_height_percent: z.number().min(0).max(100),
  labor_height_percent: z.number().min(0).max(100),
});

export type RevenueTrendDayContract = z.infer<typeof revenueTrendDaySchema>;

export const weeklyRevenueSchema = z.object({
  days: z.array(revenueTrendDaySchema),
  peak_day_amount: z.number().min(0),
  total_parts_weekly: z.number().min(0),
  total_labor_weekly: z.number().min(0),
  total_weekly_revenue: z.number().min(0),
});

export type WeeklyRevenueContract = z.infer<typeof weeklyRevenueSchema>;

/**
 * Categorized P&L & COGS Item Contract (public.get_category_pnl)
 */
export const categoryPnlItemSchema = z.object({
  category: z.string(),
  units_sold: z.number().int().min(0),
  gross_revenue: z.number().min(0),
  cogs: z.number().min(0),
  net_profit: z.number(),
  margin_pct: z.number(),
});

export type CategoryPnlItemContract = z.infer<typeof categoryPnlItemSchema>;

export const categoryPnlSummarySchema = z.object({
  total_units_sold: z.number().int().min(0),
  total_gross_revenue: z.number().min(0),
  total_cogs: z.number().min(0),
  total_net_profit: z.number(),
  overall_margin_pct: z.number(),
});

export type CategoryPnlSummaryContract = z.infer<typeof categoryPnlSummarySchema>;

export const categoryPnlSchema = z.object({
  categories: z.array(categoryPnlItemSchema),
  summary: categoryPnlSummarySchema,
});

export type CategoryPnlContract = z.infer<typeof categoryPnlSchema>;

/**
 * Validator Helpers
 */
export function validateExecutiveKpis(payload: unknown): {
  success: boolean;
  data?: ExecutiveKpiContract;
  error?: string;
} {
  const result = executiveKpiSchema.safeParse(payload);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
    };
  }
  return { success: true, data: result.data };
}

export function validateWeeklyRevenue(payload: unknown): {
  success: boolean;
  data?: WeeklyRevenueContract;
  error?: string;
} {
  const result = weeklyRevenueSchema.safeParse(payload);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
    };
  }
  return { success: true, data: result.data };
}

export function validateCategoryPnl(payload: unknown): {
  success: boolean;
  data?: CategoryPnlContract;
  error?: string;
} {
  const result = categoryPnlSchema.safeParse(payload);
  if (!result.success) {
    return {
      success: false,
      error: result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', '),
    };
  }
  return { success: true, data: result.data };
}
