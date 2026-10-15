# Data Model & Entity Specifications: 7-Day Revenue Trend Comparison Engine

**Feature**: 7-Day Revenue Trend Comparison Engine (Parts Sales vs. Bay Labor Services)  
**Jira Issue**: [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) (STORY-6.2)  

---

## 1. Domain Entities & TypeScript Models

```typescript
/**
 * Daily revenue record representing an individual day in the 7-day rolling window
 */
export interface DailyRevenueData {
  /** Day label (e.g. 'Mon', 'Tue', 'Sun (Today)') */
  day: string;
  /** ISO date string YYYY-MM-DD if available */
  date?: string;
  /** Monetary parts sales amount in Philippine Pesos */
  partsAmount: number;
  /** Formatted compact display string (e.g. '₱28.5k' or '₱850') */
  partsDisplay: string;
  /** Monetary repair bay labor amount in Philippine Pesos */
  laborAmount: number;
  /** Formatted compact display string (e.g. '₱12.0k' or '₱500') */
  laborDisplay: string;
  /** Proportional height percentage (0 - 100%) computed against the 7-day peak */
  partsHeightPercent: number;
  /** Proportional height percentage (0 - 100%) computed against the 7-day peak */
  laborHeightPercent: number;
  /** Combined total for the day in Philippine Pesos */
  totalAmount?: number;
}

/**
 * Normalized 7-day weekly revenue aggregation dataset
 */
export interface NormalizedWeeklyRevenue {
  /** Array of exactly 7 rolling days (Monday through Sunday) */
  days: DailyRevenueData[];
  /** Peak channel amount across all 7 days used as the 100% height baseline */
  peakAmount: number;
  /** Aggregated sum of parts sales over the 7-day period */
  totalPartsWeekly: number;
  /** Aggregated sum of bay labor services over the 7-day period */
  totalLaborWeekly: number;
  /** Combined gross weekly revenue */
  totalWeeklyRevenue: number;
  /** Display label for the 7-day period span (e.g. 'Sept 22 - 28, 2026') */
  dateRangeLabel: string;
}

/**
 * Props accepted by the RevenueComparisonChart component
 */
export interface RevenueComparisonChartProps {
  /** Optional custom or dynamic weekly data (pre-computed or from server/RPC) */
  data?: DailyRevenueData[] | { days: DailyRevenueData[] };
  /** Optional header date badge label override (e.g. 'Sept 22 - 28, 2026') */
  dateRange?: string;
  /** Realtime increment to apply to today's parts bar (e.g. from POS checkout events) */
  todayPartsIncrement?: number;
  /** Realtime increment to apply to today's labor bar */
  todayLaborIncrement?: number;
  /** Initial filter state: 'all' | 'parts' | 'labor' */
  initialFilter?: 'all' | 'parts' | 'labor';
  /** Optional container className */
  className?: string;
}
```

---

## 2. Calculation & Normalization State Transitions

1. **Initial Raw Ingestion**:
   - Accepts an array of daily items with raw `partsAmount` and `laborAmount`.
2. **Peak Value Baseline**:
   - `peak = Math.max(...partsAmounts, ...laborAmounts, 1)`
3. **Proportional Normalization**:
   - For each day:
     - `partsHeightPercent = partsAmount > 0 ? Math.min(100, Math.max(4, Math.round((partsAmount / peak) * 100))) : 0`
     - `laborHeightPercent = laborAmount > 0 ? Math.min(100, Math.max(4, Math.round((laborAmount / peak) * 100))) : 0`
     - `partsDisplay = formatCompactCurrencyPhp(partsAmount)`
     - `laborDisplay = formatCompactCurrencyPhp(laborAmount)`
4. **Realtime POS Increment**:
   - When a sale event fires:
     - Today's parts amount increases by transaction `total_due`.
     - Peak is recalculated across all days with the new today amount.
     - All bar heights re-normalize instantaneously without layout shifting.
