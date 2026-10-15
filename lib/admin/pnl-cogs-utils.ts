/**
 * P&L and Cost of Goods Sold (COGS) Calculation Utilities.
 * Jira Issue: SIAA-36 (STORY-6.4)
 * Parent Epic: SIAA-6 (Executive Analytics, Revenue & Profit Margins)
 */

/**
 * Calculates net profit as Gross Revenue minus Cost of Goods Sold (COGS).
 */
export function calculateNetProfit(grossRevenue: number, cogs: number): number {
  return Number((grossRevenue - cogs).toFixed(2));
}

/**
 * Calculates profit margin percentage rounded to 1 decimal place.
 * Safely guards against zero or negative gross revenue to prevent NaN / Infinity.
 */
export function calculateMarginPct(grossRevenue: number, cogs: number): number {
  if (grossRevenue <= 0) {
    return 0.0;
  }
  const netProfit = grossRevenue - cogs;
  return Number(((netProfit / grossRevenue) * 100).toFixed(1));
}

/**
 * Determines if a profit margin qualifies as high-yield (default >= 30.0%).
 */
export function isHighYieldMargin(marginPct: number, targetThreshold: number = 30.0): boolean {
  return marginPct >= targetThreshold;
}

/**
 * Formats a numeric value into standard Philippine Peso currency representation.
 * Uses Intl.NumberFormat to avoid complex regex backtracking.
 */
export function formatCurrencyPhp(amount: number): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(safeAmount);

  return `₱${formatted}`;
}

/**
 * Formats unit count based on category type (e.g., '14 Jobs' for labor, '24' for merchandise).
 */
export function formatUnitCount(category: string, units: number): string {
  const isLabor = category.toLowerCase().includes("labor");
  return isLabor ? `${units} Jobs` : `${units}`;
}
