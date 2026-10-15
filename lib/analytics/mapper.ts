import type {
  ExecutiveKpiData,
  RevenueTrendDay,
  WeeklyRevenueData,
  CategoryPnlItem,
  CategoryPnlData,
} from '../types/analytics.ts';

/**
 * Currency and Metric Formatters for SWIFT Executive Analytics
 */
export function formatCurrencyPhp(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  return `₱${safeAmount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatCompactCurrencyPhp(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  if (Math.abs(safeAmount) >= 1000) {
    const inK = (safeAmount / 1000).toFixed(1);
    return `₱${inK}k`;
  }
  return `₱${Math.round(safeAmount)}`;
}

export function formatGrowthPercent(percent: number): string {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  const rounded = safePercent.toFixed(1);
  if (safePercent > 0) {
    return `+${rounded}%`;
  }
  return `${rounded}%`;
}

export function formatMarginPercent(percent: number): string {
  const safePercent = Number.isFinite(percent) ? percent : 0;
  return `${safePercent.toFixed(1)}%`;
}

/**
 * Normalizes rolling 7-day revenue records, computing display strings and weekly totals
 */
export function normalizeWeeklyRevenue(
  rawDays: Partial<RevenueTrendDay>[]
): WeeklyRevenueData {
  if (!Array.isArray(rawDays) || rawDays.length === 0) {
    return {
      days: [],
      peak_day_amount: 0,
      total_parts_weekly: 0,
      total_labor_weekly: 0,
      total_weekly_revenue: 0,
    };
  }

  let totalParts = 0;
  let totalLabor = 0;
  let peakDayAmount = 0;

  const days: RevenueTrendDay[] = rawDays.map((d) => {
    const parts = Number(d.parts_amount ?? 0);
    const labor = Number(d.labor_amount ?? 0);
    const total = Number(d.total_amount ?? parts + labor);
    const partsHeight = Number(d.parts_height_percent ?? 0);
    const laborHeight = Number(d.labor_height_percent ?? 0);

    totalParts += parts;
    totalLabor += labor;
    if (total > peakDayAmount) {
      peakDayAmount = total;
    }

    return {
      date: String(d.date ?? ''),
      day_label: String(d.day_label ?? ''),
      parts_amount: parts,
      parts_display: formatCompactCurrencyPhp(parts),
      labor_amount: labor,
      labor_display: formatCompactCurrencyPhp(labor),
      total_amount: total,
      parts_height_percent: partsHeight,
      labor_height_percent: laborHeight,
    };
  });

  return {
    days,
    peak_day_amount: peakDayAmount,
    total_parts_weekly: totalParts,
    total_labor_weekly: totalLabor,
    total_weekly_revenue: totalParts + totalLabor,
  };
}

/**
 * Zero-data fallbacks guaranteeing resilient rendering without crashing widgets
 */
export function getEmptyExecutiveKpis(): ExecutiveKpiData {
  return {
    gross_revenue_today: 0,
    gross_revenue_yesterday: 0,
    revenue_growth_pct: 0,
    active_work_orders_count: 0,
    pending_parts_count: 0,
    net_profit_margin_pct: 0,
    gross_profit_amount: 0,
    critical_low_stock_count: 0,
  };
}

export function getEmptyWeeklyRevenue(): WeeklyRevenueData {
  const days: RevenueTrendDay[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(
    (day_label) => ({
      date: new Date().toISOString().split('T')[0],
      day_label,
      parts_amount: 0,
      parts_display: '₱0',
      labor_amount: 0,
      labor_display: '₱0',
      total_amount: 0,
      parts_height_percent: 0,
      labor_height_percent: 0,
    })
  );

  return {
    days,
    peak_day_amount: 0,
    total_parts_weekly: 0,
    total_labor_weekly: 0,
    total_weekly_revenue: 0,
  };
}

export function getEmptyCategoryPnl(): CategoryPnlData {
  const standardCategories = [
    'Fluids',
    'Drivetrain',
    'Brakes',
    'Ignition',
    'Engine',
    'Tires',
    'Accessories',
    'Workshop Labor',
  ];

  const categories: CategoryPnlItem[] = standardCategories.map((category) => ({
    category,
    units_sold: 0,
    gross_revenue: 0,
    cogs: 0,
    net_profit: 0,
    margin_pct: 0,
  }));

  return {
    categories,
    summary: {
      total_units_sold: 0,
      total_gross_revenue: 0,
      total_cogs: 0,
      total_net_profit: 0,
      overall_margin_pct: 0,
    },
  };
}
