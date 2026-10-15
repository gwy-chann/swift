/**
 * Domain types for SWIFT Executive Analytics, Revenue Trends, and P&L Breakdown.
 * Jira Issue: SIAA-67 (STORY-6.7)
 * Parent Epic: SIAA-6 (EPIC-6: Executive Analytics, Revenue & Profit Margins)
 */

export interface ExecutiveKpiData {
  gross_revenue_today: number;
  gross_revenue_yesterday: number;
  revenue_growth_pct: number;
  active_work_orders_count: number;
  pending_parts_count: number;
  net_profit_margin_pct: number;
  gross_profit_amount: number;
  critical_low_stock_count: number;
}

export interface RevenueTrendDay {
  date: string;
  day_label: string;
  parts_amount: number;
  parts_display?: string;
  labor_amount: number;
  labor_display?: string;
  total_amount: number;
  parts_height_percent: number;
  labor_height_percent: number;
}

export interface WeeklyRevenueData {
  days: RevenueTrendDay[];
  peak_day_amount: number;
  total_parts_weekly: number;
  total_labor_weekly: number;
  total_weekly_revenue: number;
}

export interface CategoryPnlItem {
  category: string;
  units_sold: number;
  gross_revenue: number;
  cogs: number;
  net_profit: number;
  margin_pct: number;
}

export interface CategoryPnlSummary {
  total_units_sold: number;
  total_gross_revenue: number;
  total_cogs: number;
  total_net_profit: number;
  overall_margin_pct: number;
}

export interface CategoryPnlData {
  categories: CategoryPnlItem[];
  summary: CategoryPnlSummary;
}
