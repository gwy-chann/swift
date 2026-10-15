'use server';

import type { CategoryPnlData } from '../types/analytics.ts';

export type AnalyticsPeriod = 'daily' | 'weekly' | 'monthly';

/**
 * Baseline canonical Category P&L mock data mirroring ../mockup/admin.html and app.js.
 */
export const MOCK_CATEGORY_PNL_DATA: CategoryPnlData = {
  categories: [
    {
      category: "Fluids & Engine Oils",
      units_sold: 24,
      gross_revenue: 9360.0,
      cogs: 6240.0,
      net_profit: 3120.0,
      margin_pct: 33.3,
    },
    {
      category: "Drivetrain & Belts",
      units_sold: 8,
      gross_revenue: 7650.0,
      cogs: 4680.0,
      net_profit: 2970.0,
      margin_pct: 38.8,
    },
    {
      category: "Labor / Service Bay",
      units_sold: 14,
      gross_revenue: 6800.0,
      cogs: 1200.0,
      net_profit: 5600.0,
      margin_pct: 82.4,
    },
    {
      category: "Tires & Tubeless",
      units_sold: 6,
      gross_revenue: 11400.0,
      cogs: 8100.0,
      net_profit: 3300.0,
      margin_pct: 28.9,
    },
    {
      category: "Brake Systems",
      units_sold: 12,
      gross_revenue: 5420.0,
      cogs: 3794.0,
      net_profit: 1626.0,
      margin_pct: 30.0,
    },
    {
      category: "Electrical & Batteries",
      units_sold: 7,
      gross_revenue: 4600.0,
      cogs: 3220.0,
      net_profit: 1380.0,
      margin_pct: 30.0,
    },
  ],
  summary: {
    total_units_sold: 71,
    total_gross_revenue: 45230.0,
    total_cogs: 27234.0,
    total_net_profit: 17996.0,
    overall_margin_pct: 39.8,
  },
};

export interface CategoryPnlActionResult {
  success: boolean;
  data: CategoryPnlData;
  source: 'database' | 'fallback_mock';
  period: AnalyticsPeriod;
  invoiceCount?: number;
  error?: string;
}

export function getInvoiceCountForPeriod(period: AnalyticsPeriod): number {
  if (period === 'daily') {
    return 38;
  }
  if (period === 'weekly') {
    return 260;
  }
  return 1120;
}

/**
 * Calculates start and end timestamps for a given reporting period.
 */
export function getPeriodTimestampRange(
  period: AnalyticsPeriod = 'daily',
  baseDate: Date = new Date()
): { startDate: string; endDate: string } {
  const endDate = new Date(baseDate);
  endDate.setUTCHours(23, 59, 59, 999);

  const startDate = new Date(baseDate);
  if (period === 'daily') {
    startDate.setUTCHours(0, 0, 0, 0);
  } else if (period === 'weekly') {
    startDate.setUTCDate(startDate.getUTCDate() - 6);
    startDate.setUTCHours(0, 0, 0, 0);
  } else if (period === 'monthly') {
    startDate.setUTCDate(1);
    startDate.setUTCHours(0, 0, 0, 0);
  }

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

function getPeriodMultiplier(period: AnalyticsPeriod): number {
  if (period === 'daily') {
    return 1;
  }
  if (period === 'weekly') {
    return 5.8;
  }
  return 24.5;
}

/**
 * Scales mock data for period filtering demonstration.
 */
export function getMockPnlByPeriod(period: AnalyticsPeriod): CategoryPnlData {
  const multiplier = getPeriodMultiplier(period);
  const categories = MOCK_CATEGORY_PNL_DATA.categories.map((c) => {
    const gross_revenue = Math.round(c.gross_revenue * multiplier * 100) / 100;
    const cogs = Math.round(c.cogs * multiplier * 100) / 100;
    const net_profit = Math.round((gross_revenue - cogs) * 100) / 100;
    const margin_pct = gross_revenue > 0 ? Math.round(((net_profit / gross_revenue) * 100) * 10) / 10 : 0;
    return {
      category: c.category,
      units_sold: Math.round(c.units_sold * multiplier),
      gross_revenue,
      cogs,
      net_profit,
      margin_pct,
    };
  });

  const total_units_sold = categories.reduce((sum, c) => sum + c.units_sold, 0);
  const total_gross_revenue = Math.round(categories.reduce((sum, c) => sum + c.gross_revenue, 0) * 100) / 100;
  const total_cogs = Math.round(categories.reduce((sum, c) => sum + c.cogs, 0) * 100) / 100;
  const total_net_profit = Math.round((total_gross_revenue - total_cogs) * 100) / 100;
  const overall_margin_pct = total_gross_revenue > 0
    ? Math.round(((total_net_profit / total_gross_revenue) * 100) * 10) / 10
    : 0;

  return {
    categories,
    summary: {
      total_units_sold,
      total_gross_revenue,
      total_cogs,
      total_net_profit,
      overall_margin_pct,
      invoice_count: getInvoiceCountForPeriod(period),
    },
  };
}

/**
 * Server action to fetch Categorized P&L Breakdown & COGS data.
 * Invokes PostgreSQL RPC get_category_pnl(p_start_date, p_end_date) with automatic fallback.
 */
export async function getCategoryPnlBreakdownAction(
  period: AnalyticsPeriod = 'daily'
): Promise<CategoryPnlActionResult> {
  const { startDate, endDate } = getPeriodTimestampRange(period);
  const invoiceCount = getInvoiceCountForPeriod(period);

  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    const { data, error } = await supabase.rpc('get_category_pnl', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error || !data || !Array.isArray(data.categories) || data.categories.length === 0) {
      return {
        success: true,
        data: getMockPnlByPeriod(period),
        source: 'fallback_mock',
        period,
        invoiceCount,
        error: error ? error.message : undefined,
      };
    }

    return {
      success: true,
      data: {
        categories: data.categories,
        summary: data.summary,
      },
      source: 'database',
      period,
      invoiceCount,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: true,
      data: getMockPnlByPeriod(period),
      source: 'fallback_mock',
      period,
      invoiceCount,
      error: message,
    };
  }
}
