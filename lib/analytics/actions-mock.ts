import type {
  ExecutiveKpiData,
  WeeklyRevenueData,
  CategoryPnlData,
} from '../types/analytics.ts';
import type { ServiceBayDisplayItem } from '../../components/admin/service-bay-status.tsx';
import type { AnalyticsPeriod } from './export.ts';

export const DETERMINISTIC_FALLBACK_KPIS: ExecutiveKpiData = {
  gross_revenue_today: 45230.0,
  gross_revenue_yesterday: 40200.0,
  revenue_growth_pct: 12.51,
  active_work_orders_count: 8,
  pending_parts_count: 3,
  net_profit_margin_pct: 58.94,
  gross_profit_amount: 26660.0,
  critical_low_stock_count: 3,
};

export const DETERMINISTIC_FALLBACK_TREND: WeeklyRevenueData = {
  days: [
    {
      date: '2026-10-09',
      day_label: 'Sun',
      parts_amount: 28400,
      parts_display: '₱28,400',
      labor_amount: 9800,
      labor_display: '₱9,800',
      total_amount: 38200,
      parts_height_percent: 52.3,
      labor_height_percent: 18.0,
    },
    {
      date: '2026-10-10',
      day_label: 'Mon',
      parts_amount: 31200,
      parts_display: '₱31,200',
      labor_amount: 11500,
      labor_display: '₱11,500',
      total_amount: 42700,
      parts_height_percent: 57.5,
      labor_height_percent: 21.2,
    },
    {
      date: '2026-10-11',
      day_label: 'Tue',
      parts_amount: 29800,
      parts_display: '₱29,800',
      labor_amount: 8900,
      labor_display: '₱8,900',
      total_amount: 38700,
      parts_height_percent: 54.9,
      labor_height_percent: 16.4,
    },
    {
      date: '2026-10-12',
      day_label: 'Wed',
      parts_amount: 34500,
      parts_display: '₱34,500',
      labor_amount: 12800,
      labor_display: '₱12,800',
      total_amount: 47300,
      parts_height_percent: 63.5,
      labor_height_percent: 23.6,
    },
    {
      date: '2026-10-13',
      day_label: 'Thu',
      parts_amount: 36200,
      parts_display: '₱36,200',
      labor_amount: 14100,
      labor_display: '₱14,100',
      total_amount: 50300,
      parts_height_percent: 66.7,
      labor_height_percent: 26.0,
    },
    {
      date: '2026-10-14',
      day_label: 'Fri',
      parts_amount: 38900,
      parts_display: '₱38,900',
      labor_amount: 15400,
      labor_display: '₱15,400',
      total_amount: 54300,
      parts_height_percent: 71.6,
      labor_height_percent: 28.4,
    },
    {
      date: '2026-10-15',
      day_label: 'Sat (Today)',
      parts_amount: 32450,
      parts_display: '₱32,450',
      labor_amount: 12780,
      labor_display: '₱12,780',
      total_amount: 45230,
      parts_height_percent: 59.8,
      labor_height_percent: 23.5,
    },
  ],
  peak_day_amount: 54300,
  total_parts_weekly: 231450,
  total_labor_weekly: 85280,
  total_weekly_revenue: 316730,
};

export const DETERMINISTIC_FALLBACK_SERVICE_BAYS: ServiceBayDisplayItem[] = [
  {
    id: 'f0000000-0000-0000-0000-000000000001',
    bayName: 'Bay 1 (Quick Bay)',
    status: 'IN PROGRESS',
    vehicleService: 'Yamaha NMAX 155 • Oil Change + Brake Pads',
    mechanicInfo: 'Mechanic: Dante Reyes (~10 mins left)',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000002',
    bayName: 'Bay 2 (Scooter Bay)',
    status: 'IN PROGRESS',
    vehicleService: 'Honda Click 150i • Full CVT Overhaul',
    mechanicInfo: 'Mechanic: Dante Reyes (~25 mins left)',
  },
  {
    id: 'f0000000-0000-0000-0000-000000000003',
    bayName: 'Bay 3 (Mechanical Bay)',
    status: 'QUEUED',
    vehicleService: 'Suzuki Raider 150 Fi • Clutch Replacement',
    mechanicInfo: 'Waiting for Bay clearance',
  },
];

function getPeriodMultiplier(period: AnalyticsPeriod): number {
  if (period === 'monthly') {
    return 24;
  }
  if (period === 'weekly') {
    return 6.5;
  }
  return 1;
}

export function getDeterministicMockCategoryPnl(period: AnalyticsPeriod = 'daily'): CategoryPnlData {
  const multiplier = getPeriodMultiplier(period);

  const categories = [
    {
      category: 'Fluids & Lubricants',
      units_sold: Math.round(45 * multiplier),
      gross_revenue: Math.round(12500.0 * multiplier * 100) / 100,
      cogs: Math.round(7500.0 * multiplier * 100) / 100,
      net_profit: Math.round(5000.0 * multiplier * 100) / 100,
      margin_pct: 40.0,
    },
    {
      category: 'Drivetrain & Transmission',
      units_sold: Math.round(18 * multiplier),
      gross_revenue: Math.round(18450.0 * multiplier * 100) / 100,
      cogs: Math.round(11070.0 * multiplier * 100) / 100,
      net_profit: Math.round(7380.0 * multiplier * 100) / 100,
      margin_pct: 40.0,
    },
    {
      category: 'Brakes & Suspension',
      units_sold: Math.round(22 * multiplier),
      gross_revenue: Math.round(8900.0 * multiplier * 100) / 100,
      cogs: Math.round(4895.0 * multiplier * 100) / 100,
      net_profit: Math.round(4005.0 * multiplier * 100) / 100,
      margin_pct: 45.0,
    },
    {
      category: 'Electrical & Ignition',
      units_sold: Math.round(14 * multiplier),
      gross_revenue: Math.round(4350.0 * multiplier * 100) / 100,
      cogs: Math.round(2392.5 * multiplier * 100) / 100,
      net_profit: Math.round(1957.5 * multiplier * 100) / 100,
      margin_pct: 45.0,
    },
    {
      category: 'Tires & Wheels',
      units_sold: Math.round(8 * multiplier),
      gross_revenue: Math.round(9600.0 * multiplier * 100) / 100,
      cogs: Math.round(6240.0 * multiplier * 100) / 100,
      net_profit: Math.round(3360.0 * multiplier * 100) / 100,
      margin_pct: 35.0,
    },
    {
      category: 'Accessories & Helmets',
      units_sold: Math.round(11 * multiplier),
      gross_revenue: Math.round(7150.0 * multiplier * 100) / 100,
      cogs: Math.round(4290.0 * multiplier * 100) / 100,
      net_profit: Math.round(2860.0 * multiplier * 100) / 100,
      margin_pct: 40.0,
    },
    {
      category: 'Workshop Labor Services',
      units_sold: Math.round(28 * multiplier),
      gross_revenue: Math.round(14280.0 * multiplier * 100) / 100,
      cogs: 0.0,
      net_profit: Math.round(14280.0 * multiplier * 100) / 100,
      margin_pct: 100.0,
    },
  ];

  let total_units_sold = 0;
  let total_gross_revenue = 0;
  let total_cogs = 0;
  let total_net_profit = 0;

  for (const cat of categories) {
    total_units_sold += cat.units_sold;
    total_gross_revenue += cat.gross_revenue;
    total_cogs += cat.cogs;
    total_net_profit += cat.net_profit;
  }

  total_gross_revenue = Math.round(total_gross_revenue * 100) / 100;
  total_cogs = Math.round(total_cogs * 100) / 100;
  total_net_profit = Math.round(total_net_profit * 100) / 100;

  const overall_margin_pct =
    total_gross_revenue > 0
      ? Math.round((total_net_profit / total_gross_revenue) * 10000) / 100
      : 0;

  return {
    categories,
    summary: {
      total_units_sold,
      total_gross_revenue,
      total_cogs,
      total_net_profit,
      overall_margin_pct,
    },
  };
}
