/**
 * SWIFT 7-Day Revenue Trend Comparison Engine
 * Jira Issue: SIAA-34 (STORY-6.2)
 * Pure domain logic for proportional scaling, compact currency formatting, and channel filtering.
 */

export interface DailyRevenueData {
  day: string;
  date?: string;
  partsAmount: number;
  partsDisplay: string;
  laborAmount: number;
  laborDisplay: string;
  partsHeightPercent: number;
  laborHeightPercent: number;
  totalAmount?: number;
}

export interface NormalizedWeeklyRevenue {
  days: DailyRevenueData[];
  peakAmount: number;
  totalPartsWeekly: number;
  totalLaborWeekly: number;
  totalWeeklyRevenue: number;
  dateRangeLabel: string;
}

export interface NormalizeOptions {
  todayPartsIncrement?: number;
  todayLaborIncrement?: number;
  dateRangeLabel?: string;
}

export const INITIAL_WEEKLY_DATA: DailyRevenueData[] = [
  {
    day: 'Mon',
    partsAmount: 28500,
    partsDisplay: '₱28.5k',
    laborAmount: 12000,
    laborDisplay: '₱12.0k',
    partsHeightPercent: 60,
    laborHeightPercent: 35,
  },
  {
    day: 'Tue',
    partsAmount: 34000,
    partsDisplay: '₱34.0k',
    laborAmount: 15500,
    laborDisplay: '₱15.5k',
    partsHeightPercent: 75,
    laborHeightPercent: 40,
  },
  {
    day: 'Wed',
    partsAmount: 22100,
    partsDisplay: '₱22.1k',
    laborAmount: 10200,
    laborDisplay: '₱10.2k',
    partsHeightPercent: 50,
    laborHeightPercent: 30,
  },
  {
    day: 'Thu',
    partsAmount: 41000,
    partsDisplay: '₱41.0k',
    laborAmount: 21400,
    laborDisplay: '₱21.4k',
    partsHeightPercent: 85,
    laborHeightPercent: 55,
  },
  {
    day: 'Fri',
    partsAmount: 44500,
    partsDisplay: '₱44.5k',
    laborAmount: 24000,
    laborDisplay: '₱24.0k',
    partsHeightPercent: 90,
    laborHeightPercent: 60,
  },
  {
    day: 'Sat',
    partsAmount: 48000,
    partsDisplay: '₱48.0k',
    laborAmount: 29500,
    laborDisplay: '₱29.5k',
    partsHeightPercent: 95,
    laborHeightPercent: 70,
  },
  {
    day: 'Sun (Today)',
    partsAmount: 38200,
    partsDisplay: '₱38.2k',
    laborAmount: 19000,
    laborDisplay: '₱19.0k',
    partsHeightPercent: 80,
    laborHeightPercent: 50,
  },
];

const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun (Today)'];

/**
 * Formats a monetary amount into compact Philippine Pesos notation (e.g. ₱48.0k, ₱850)
 */
export function formatCompactCurrencyPhp(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  if (Math.abs(safe) >= 1000) {
    const inK = (safe / 1000).toFixed(1);
    return `₱${inK}k`;
  }
  return `₱${Math.round(safe)}`;
}

/**
 * Computes a proportional bar height percentage (0 - 100%) relative to a peak baseline.
 * Enforces a minimum 4% height on non-zero amounts to prevent zero-height distortion or clipping.
 */
export function computeHeightPercent(amount: number, peak: number): number {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  if (safeAmount <= 0 || peak <= 0) {
    return 0;
  }
  const ratio = (safeAmount / peak) * 100;
  // Floor at 4% for small values, clamp at 100%
  return Math.min(100, Math.max(4, Math.round(ratio)));
}

/**
 * Resolves the date range label for the 7-day period.
 */
export function formatDateRangeLabel(customRange?: string): string {
  if (customRange && customRange.trim().length > 0) {
    return customRange.trim();
  }
  return 'Sept 22 - 28, 2026';
}

/**
 * Normalizes rolling 7-day revenue records, dynamically computing proportional heights,
 * compact display strings, channel sums, and applying today's real-time increments.
 */
export function normalizeRevenueTrend(
  rawDays: Partial<DailyRevenueData>[],
  options: NormalizeOptions = {}
): NormalizedWeeklyRevenue {
  const partsInc = Number(options.todayPartsIncrement ?? 0);
  const laborInc = Number(options.todayLaborIncrement ?? 0);

  // Fallback to default zeroed 7 days if empty array provided
  const sourceDays: Partial<DailyRevenueData>[] =
    Array.isArray(rawDays) && rawDays.length > 0
      ? rawDays
      : DEFAULT_DAYS.map((day) => ({
          day,
          partsAmount: 0,
          laborAmount: 0,
        }));

  // Step 1: Pre-calculate raw amounts including increments on today (the last day)
  const adjustedDays = sourceDays.map((d, index) => {
    const isToday = index === sourceDays.length - 1;
    const baseParts = Number(d.partsAmount ?? 0);
    const baseLabor = Number(d.laborAmount ?? 0);
    const partsAmount = isToday ? baseParts + partsInc : baseParts;
    const laborAmount = isToday ? baseLabor + laborInc : baseLabor;

    return {
      day: String(d.day || DEFAULT_DAYS[index] || `Day ${index + 1}`),
      date: d.date,
      partsAmount,
      laborAmount,
      totalAmount: partsAmount + laborAmount,
    };
  });

  // Step 2: Determine the peak channel amount across all 7 days
  let peakAmount = 0;
  let totalPartsWeekly = 0;
  let totalLaborWeekly = 0;

  for (const item of adjustedDays) {
    totalPartsWeekly += item.partsAmount;
    totalLaborWeekly += item.laborAmount;
    if (item.partsAmount > peakAmount) peakAmount = item.partsAmount;
    if (item.laborAmount > peakAmount) peakAmount = item.laborAmount;
  }

  // Step 3: Compute normalized heights and compact display strings
  const days: DailyRevenueData[] = adjustedDays.map((item) => ({
    day: item.day,
    date: item.date,
    partsAmount: item.partsAmount,
    partsDisplay: formatCompactCurrencyPhp(item.partsAmount),
    laborAmount: item.laborAmount,
    laborDisplay: formatCompactCurrencyPhp(item.laborAmount),
    partsHeightPercent: computeHeightPercent(item.partsAmount, peakAmount),
    laborHeightPercent: computeHeightPercent(item.laborAmount, peakAmount),
    totalAmount: item.totalAmount,
  }));

  return {
    days,
    peakAmount,
    totalPartsWeekly,
    totalLaborWeekly,
    totalWeeklyRevenue: totalPartsWeekly + totalLaborWeekly,
    dateRangeLabel: formatDateRangeLabel(options.dateRangeLabel),
  };
}

/**
 * Computes visibility flags for channel filtering based on legend clicks.
 */
export function filterRevenueTrend(
  days: DailyRevenueData[],
  filter: 'all' | 'parts' | 'labor' = 'all'
): {
  days: DailyRevenueData[];
  showParts: boolean;
  showLabor: boolean;
} {
  return {
    days,
    showParts: filter === 'all' || filter === 'parts',
    showLabor: filter === 'all' || filter === 'labor',
  };
}
