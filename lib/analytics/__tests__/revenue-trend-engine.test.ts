import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeHeightPercent,
  formatCompactCurrencyPhp,
  normalizeRevenueTrend,
  filterRevenueTrend,
  formatDateRangeLabel,
  INITIAL_WEEKLY_DATA,
  type DailyRevenueData,
} from '../revenue-trend-engine.ts';

describe('7-Day Revenue Trend Comparison Engine (SIAA-34)', () => {
  describe('Scenario 1: 7-Day Grouped Bar Data Generation', () => {
    it('generates exactly 7 rolling days from Monday to Sunday (Today)', () => {
      const normalized = normalizeRevenueTrend(INITIAL_WEEKLY_DATA);
      assert.equal(normalized.days.length, 7);
      assert.equal(normalized.days[0].day, 'Mon');
      assert.equal(normalized.days[1].day, 'Tue');
      assert.equal(normalized.days[2].day, 'Wed');
      assert.equal(normalized.days[3].day, 'Thu');
      assert.equal(normalized.days[4].day, 'Fri');
      assert.equal(normalized.days[5].day, 'Sat');
      assert.equal(normalized.days[6].day, 'Sun (Today)');
    });

    it('preserves distinct parts and labor monetary revenue amounts', () => {
      const normalized = normalizeRevenueTrend(INITIAL_WEEKLY_DATA);
      const saturday = normalized.days[5];
      assert.equal(saturday.partsAmount, 48000);
      assert.equal(saturday.laborAmount, 29500);
    });
  });

  describe('Scenario 2: Data Value Badges & Compact Currency Formatting', () => {
    it('formats values in compact Philippine Pesos notation (₱XX.Xk)', () => {
      assert.equal(formatCompactCurrencyPhp(48000), '₱48.0k');
      assert.equal(formatCompactCurrencyPhp(28500), '₱28.5k');
      assert.equal(formatCompactCurrencyPhp(12000), '₱12.0k');
      assert.equal(formatCompactCurrencyPhp(15500), '₱15.5k');
      assert.equal(formatCompactCurrencyPhp(850), '₱850');
      assert.equal(formatCompactCurrencyPhp(0), '₱0');
    });

    it('attaches formatted display strings to each channel for tooltip and data-val usage', () => {
      const normalized = normalizeRevenueTrend(INITIAL_WEEKLY_DATA);
      const friday = normalized.days[4];
      assert.equal(friday.partsDisplay, '₱44.5k');
      assert.equal(friday.laborDisplay, '₱24.0k');
    });
  });

  describe('Scenario 3: Date Range Context Header & Chart Legend Filtering', () => {
    it('formats or retains neutral 7-day calendar span header', () => {
      const range = formatDateRangeLabel('Sept 22 - 28, 2026');
      assert.equal(range, 'Sept 22 - 28, 2026');

      const defaultRange = formatDateRangeLabel();
      assert.equal(defaultRange, 'Sept 22 - 28, 2026');
    });

    it('formats dynamic date range when dates are provided in days array', () => {
      const daysWithDates: Partial<DailyRevenueData>[] = [
        { day: 'Tue', date: '2026-10-20', partsAmount: 100, laborAmount: 50 },
        { day: 'Wed', date: '2026-10-21', partsAmount: 100, laborAmount: 50 },
        { day: 'Thu', date: '2026-10-22', partsAmount: 100, laborAmount: 50 },
        { day: 'Fri', date: '2026-10-23', partsAmount: 100, laborAmount: 50 },
        { day: 'Sat', date: '2026-10-24', partsAmount: 100, laborAmount: 50 },
        { day: 'Sun', date: '2026-10-25', partsAmount: 100, laborAmount: 50 },
        { day: 'Mon', date: '2026-10-26', partsAmount: 100, laborAmount: 50 },
      ];
      const dynamicRange = formatDateRangeLabel(undefined, daysWithDates);
      assert.equal(dynamicRange, 'Oct 20 - 26, 2026');

      const normalized = normalizeRevenueTrend(daysWithDates);
      assert.equal(normalized.dateRangeLabel, 'Oct 20 - 26, 2026');
    });

    it('filters days and visibility flags correctly based on active legend filter', () => {
      const normalized = normalizeRevenueTrend(INITIAL_WEEKLY_DATA);
      const filteredAll = filterRevenueTrend(normalized.days, 'all');
      assert.equal(filteredAll.showParts, true);
      assert.equal(filteredAll.showLabor, true);

      const filteredParts = filterRevenueTrend(normalized.days, 'parts');
      assert.equal(filteredParts.showParts, true);
      assert.equal(filteredParts.showLabor, false);

      const filteredLabor = filterRevenueTrend(normalized.days, 'labor');
      assert.equal(filteredLabor.showParts, false);
      assert.equal(filteredLabor.showLabor, true);
    });
  });

  describe('Scenario 4: Proportional Scale Normalization', () => {
    it('scales the peak channel amount to 100% and normalizes others proportionally', () => {
      const testDays: Partial<DailyRevenueData>[] = [
        { day: 'Mon', partsAmount: 50000, laborAmount: 25000 }, // Peak is 50,000
        { day: 'Tue', partsAmount: 25000, laborAmount: 12500 },
        { day: 'Wed', partsAmount: 10000, laborAmount: 5000 },
        { day: 'Thu', partsAmount: 0, laborAmount: 0 },
        { day: 'Fri', partsAmount: 20000, laborAmount: 10000 },
        { day: 'Sat', partsAmount: 40000, laborAmount: 20000 },
        { day: 'Sun', partsAmount: 30000, laborAmount: 15000 },
      ];

      const normalized = normalizeRevenueTrend(testDays);
      assert.equal(normalized.peakAmount, 50000);

      // Mon parts (50,000 / 50,000) = 100%
      assert.equal(normalized.days[0].partsHeightPercent, 100);
      // Mon labor (25,000 / 50,000) = 50%
      assert.equal(normalized.days[0].laborHeightPercent, 50);

      // Tue parts (25,000 / 50,000) = 50%
      assert.equal(normalized.days[1].partsHeightPercent, 50);
      // Tue labor (12,500 / 50,000) = 25%
      assert.equal(normalized.days[1].laborHeightPercent, 25);
    });

    it('enforces a minimum 4% height on non-zero amounts to prevent visual collapse', () => {
      // 500 / 50000 is 1%, but minimum height clamp should ensure 4%
      const height = computeHeightPercent(500, 50000);
      assert.equal(height, 4);
    });

    it('returns 0% height when amount is zero', () => {
      const height = computeHeightPercent(0, 50000);
      assert.equal(height, 0);
    });

    it('dynamically recalculates heights when today increment is applied', () => {
      const normalizedBefore = normalizeRevenueTrend(INITIAL_WEEKLY_DATA);
      const sunBefore = normalizedBefore.days[6];

      // Add 20,000 increment to today's parts
      const normalizedAfter = normalizeRevenueTrend(INITIAL_WEEKLY_DATA, {
        todayPartsIncrement: 20000,
      });
      const sunAfter = normalizedAfter.days[6];

      assert.equal(sunAfter.partsAmount, sunBefore.partsAmount + 20000);
      assert.ok(sunAfter.partsHeightPercent > sunBefore.partsHeightPercent);
      // Sunday parts (38,200 + 20,000 = 58,200) becomes new peak, scaling to 100%
      assert.equal(sunAfter.partsHeightPercent, 100);
    });

    it('gracefully handles empty days array without throwing errors', () => {
      const normalized = normalizeRevenueTrend([]);
      assert.equal(normalized.days.length, 7);
      assert.equal(normalized.peakAmount, 0);
      assert.equal(normalized.totalWeeklyRevenue, 0);
      assert.equal(normalized.days[0].partsHeightPercent, 0);
    });
  });
});
