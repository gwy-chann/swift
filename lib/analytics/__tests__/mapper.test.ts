import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCurrencyPhp,
  formatCompactCurrencyPhp,
  formatGrowthPercent,
  formatMarginPercent,
  normalizeWeeklyRevenue,
  getEmptyExecutiveKpis,
  getEmptyWeeklyRevenue,
  getEmptyCategoryPnl,
} from '../mapper.ts';

describe('Analytics Formatters & Mappers (SIAA-67)', () => {
  describe('Currency & Metric Formatters', () => {
    it('formats PHP currency with commas and peso sign', () => {
      assert.equal(formatCurrencyPhp(45230.5), '₱45,230.50');
      assert.equal(formatCurrencyPhp(0), '₱0.00');
    });

    it('formats compact PHP currency (e.g. ₱28.5k)', () => {
      assert.equal(formatCompactCurrencyPhp(28500), '₱28.5k');
      assert.equal(formatCompactCurrencyPhp(1200), '₱1.2k');
      assert.equal(formatCompactCurrencyPhp(500), '₱500');
    });

    it('formats growth percentage with explicit signs', () => {
      assert.equal(formatGrowthPercent(17.79), '+17.8%');
      assert.equal(formatGrowthPercent(-5.4), '-5.4%');
      assert.equal(formatGrowthPercent(0), '0.0%');
    });

    it('formats margin percentages', () => {
      assert.equal(formatMarginPercent(34.2), '34.2%');
      assert.equal(formatMarginPercent(0), '0.0%');
    });
  });

  describe('Revenue Trend Normalization', () => {
    it('computes display labels and aggregates weekly totals', () => {
      const rawDays = [
        {
          date: '2026-10-09',
          day_label: 'Fri',
          parts_amount: 28500,
          labor_amount: 12000,
          total_amount: 40500,
          parts_height_percent: 60,
          labor_height_percent: 40,
        },
        {
          date: '2026-10-10',
          day_label: 'Sat',
          parts_amount: 44500,
          labor_amount: 24000,
          total_amount: 68500,
          parts_height_percent: 65,
          labor_height_percent: 35,
        },
      ];

      const normalized = normalizeWeeklyRevenue(rawDays);
      assert.equal(normalized.days.length, 2);
      assert.equal(normalized.days[0].parts_display, '₱28.5k');
      assert.equal(normalized.days[0].labor_display, '₱12.0k');
      assert.equal(normalized.peak_day_amount, 68500);
      assert.equal(normalized.total_parts_weekly, 73000);
      assert.equal(normalized.total_labor_weekly, 36000);
      assert.equal(normalized.total_weekly_revenue, 109000);
    });

    it('gracefully handles empty days array', () => {
      const normalized = normalizeWeeklyRevenue([]);
      assert.equal(normalized.days.length, 0);
      assert.equal(normalized.peak_day_amount, 0);
      assert.equal(normalized.total_weekly_revenue, 0);
    });
  });

  describe('Empty & Zero-Data Fallbacks', () => {
    it('returns valid zeroed default executive KPIs', () => {
      const empty = getEmptyExecutiveKpis();
      assert.equal(empty.gross_revenue_today, 0);
      assert.equal(empty.gross_profit_amount, 0);
      assert.equal(empty.active_work_orders_count, 0);
    });

    it('returns valid zeroed default weekly revenue', () => {
      const empty = getEmptyWeeklyRevenue();
      assert.equal(empty.days.length, 7);
      assert.equal(empty.total_weekly_revenue, 0);
    });

    it('returns valid zeroed default category P&L', () => {
      const empty = getEmptyCategoryPnl();
      assert.ok(empty.categories.length >= 8);
      assert.equal(empty.summary.total_gross_revenue, 0);
    });
  });
});
