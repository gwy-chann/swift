import { z } from 'zod';
import type {
  ExecutiveKpiData,
  WeeklyRevenueData,
  CategoryPnlData,
} from '../types/analytics.ts';

/**
 * Executive KPI Aggregator Validation Schema (get_executive_kpis)
 */
export const executiveKpiSchema = z.object({
  gross_revenue_today: z.coerce.number().min(0).default(0),
  gross_revenue_yesterday: z.coerce.number().min(0).default(0),
  revenue_growth_pct: z.coerce.number().default(0),
  active_work_orders_count: z.coerce.number().int().min(0).default(0),
  pending_parts_count: z.coerce.number().int().min(0).default(0),
  net_profit_margin_pct: z.coerce.number().default(0),
  gross_profit_amount: z.coerce.number().default(0),
  critical_low_stock_count: z.coerce.number().int().min(0).default(0),
});

/**
 * 7-Day Revenue Trend Day Item Schema (get_revenue_trend_7d)
 */
export const revenueTrendDaySchema = z.object({
  date: z.string(),
  day_label: z.string(),
  parts_amount: z.coerce.number().min(0).default(0),
  parts_display: z.string().optional(),
  labor_amount: z.coerce.number().min(0).default(0),
  labor_display: z.string().optional(),
  total_amount: z.coerce.number().min(0).default(0),
  parts_height_percent: z.coerce.number().min(0).max(100).default(0),
  labor_height_percent: z.coerce.number().min(0).max(100).default(0),
});

export const weeklyRevenueSchema = z.object({
  days: z.array(revenueTrendDaySchema),
  peak_day_amount: z.coerce.number().min(0).default(0),
  total_parts_weekly: z.coerce.number().min(0).default(0),
  total_labor_weekly: z.coerce.number().min(0).default(0),
  total_weekly_revenue: z.coerce.number().min(0).default(0),
});

/**
 * Categorized P&L & COGS Item Schema (get_category_pnl)
 */
export const categoryPnlItemSchema = z.object({
  category: z.string(),
  units_sold: z.coerce.number().int().min(0).default(0),
  gross_revenue: z.coerce.number().min(0).default(0),
  cogs: z.coerce.number().min(0).default(0),
  net_profit: z.coerce.number().default(0),
  margin_pct: z.coerce.number().default(0),
});

export const categoryPnlSummarySchema = z.object({
  total_units_sold: z.coerce.number().int().min(0).default(0),
  total_gross_revenue: z.coerce.number().min(0).default(0),
  total_cogs: z.coerce.number().min(0).default(0),
  total_net_profit: z.coerce.number().default(0),
  overall_margin_pct: z.coerce.number().default(0),
});

export const categoryPnlSchema = z.object({
  categories: z.array(categoryPnlItemSchema),
  summary: categoryPnlSummarySchema,
});

/**
 * Type-safe runtime validation helpers
 */
export function validateExecutiveKpis(payload: unknown): {
  success: boolean;
  data?: ExecutiveKpiData;
  error?: string;
} {
  const result = executiveKpiSchema.safeParse(payload);
  if (!result.success) {
    const errorMsg = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errorMsg };
  }
  return { success: true, data: result.data as ExecutiveKpiData };
}

export function validateWeeklyRevenue(payload: unknown): {
  success: boolean;
  data?: WeeklyRevenueData;
  error?: string;
} {
  const result = weeklyRevenueSchema.safeParse(payload);
  if (!result.success) {
    const errorMsg = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errorMsg };
  }
  return { success: true, data: result.data as WeeklyRevenueData };
}

export function validateCategoryPnl(payload: unknown): {
  success: boolean;
  data?: CategoryPnlData;
  error?: string;
} {
  const result = categoryPnlSchema.safeParse(payload);
  if (!result.success) {
    const errorMsg = result.error.issues.map((e) => `${e.path.join('.')}: ${e.message}`).join(', ');
    return { success: false, error: errorMsg };
  }
  return { success: true, data: result.data as CategoryPnlData };
}
