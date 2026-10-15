import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  dailyRevenueItemSchema,
  normalizedWeeklyRevenueSchema,
  revenueComparisonChartPropsSchema,
} from '../../../specs/034-7-day-revenue-trend-comparison-engine/contracts/revenue-trend.contract.ts';
import {
  normalizeRevenueTrend,
  filterRevenueTrend,
  INITIAL_WEEKLY_DATA,
} from '../revenue-trend-engine.ts';

describe('Revenue Comparison Chart Component Contracts (SIAA-34)', () => {
  describe('Scenario 1: 7-Day Comparative Bar Chart Data Structure', () => {
    it('validates 7-day items conforming to dailyRevenueItemSchema', () => {
      const normalized = normalizeRevenueTrend(INITIAL_WEEKLY_DATA);
      assert.equal(normalized.days.length, 7);

      for (const day of normalized.days) {
        const result = dailyRevenueItemSchema.safeParse(day);
        assert.equal(result.success, true);
      }
    });

    it('confirms parts and labor bars have required DOM attribute values and class bindings', () => {
      const normalized = normalizeRevenueTrend(INITIAL_WEEKLY_DATA);
      const days = normalized.days;

      days.forEach((item) => {
        assert.ok(item.day.length > 0);
        assert.ok(item.partsDisplay.startsWith('₱'));
        assert.ok(item.laborDisplay.startsWith('₱'));
        assert.ok(item.partsHeightPercent >= 0 && item.partsHeightPercent <= 100);
        assert.ok(item.laborHeightPercent >= 0 && item.laborHeightPercent <= 100);
      });
    });
  });

  describe('Scenario 2: Data Value Badges & Tooltips on Hover (data-val)', () => {
    it('generates exact data-val string attributes for floating tooltips', () => {
      const normalized = normalizeRevenueTrend(INITIAL_WEEKLY_DATA);
      const saturday = normalized.days[5];

      assert.equal(saturday.partsDisplay, '₱48.0k');
      assert.equal(saturday.laborDisplay, '₱29.5k');
    });

    it('rejects negative or malformed revenue items', () => {
      const malformedItem = {
        day: 'Mon',
        partsAmount: -100, // Invalid negative
        partsDisplay: '₱-100',
        laborAmount: 50,
        laborDisplay: '₱50',
        partsHeightPercent: 120, // Invalid > 100
        laborHeightPercent: 50,
      };

      const result = dailyRevenueItemSchema.safeParse(malformedItem);
      assert.equal(result.success, false);
    });
  });

  describe('Scenario 3: Date Range Context Header & Chart Legend', () => {
    it('validates normalized weekly revenue container contract', () => {
      const normalized = normalizeRevenueTrend(INITIAL_WEEKLY_DATA, {
        dateRangeLabel: 'Sept 22 - 28, 2026',
      });
      const result = normalizedWeeklyRevenueSchema.safeParse(normalized);
      assert.equal(result.success, true);
      assert.equal(normalized.dateRangeLabel, 'Sept 22 - 28, 2026');
    });

    it('validates component props schema with initial filter and custom date range', () => {
      const props = {
        data: INITIAL_WEEKLY_DATA,
        dateRange: 'Oct 01 - 07, 2026',
        todayPartsIncrement: 5000,
        todayLaborIncrement: 1200,
        initialFilter: 'parts' as const,
        className: 'custom-chart-wrapper',
      };

      const result = revenueComparisonChartPropsSchema.safeParse(props);
      assert.equal(result.success, true);
    });

    it('supports channel filtering toggles without corrupting day items', () => {
      const normalized = normalizeRevenueTrend(INITIAL_WEEKLY_DATA);
      const filteredParts = filterRevenueTrend(normalized.days, 'parts');
      assert.equal(filteredParts.showParts, true);
      assert.equal(filteredParts.showLabor, false);
      assert.equal(filteredParts.days.length, 7);

      const filteredLabor = filterRevenueTrend(normalized.days, 'labor');
      assert.equal(filteredLabor.showParts, false);
      assert.equal(filteredLabor.showLabor, true);
      assert.equal(filteredLabor.days.length, 7);
    });
  });

  describe('Scenario 4: Proportional Scale Normalization', () => {
    it('normalizes peak bar to exactly 100% and scales all other bars proportionally', () => {
      const sample = [
        { day: 'Mon', partsAmount: 10000, laborAmount: 5000 },
        { day: 'Tue', partsAmount: 20000, laborAmount: 10000 },
        { day: 'Wed', partsAmount: 30000, laborAmount: 15000 },
        { day: 'Thu', partsAmount: 40000, laborAmount: 20000 },
        { day: 'Fri', partsAmount: 50000, laborAmount: 25000 },
        { day: 'Sat', partsAmount: 100000, laborAmount: 50000 }, // Peak is 100,000
        { day: 'Sun', partsAmount: 80000, laborAmount: 40000 },
      ];

      const normalized = normalizeRevenueTrend(sample);
      assert.equal(normalized.peakAmount, 100000);

      // Saturday parts is peak -> 100%
      assert.equal(normalized.days[5].partsHeightPercent, 100);
      // Saturday labor is 50,000 / 100,000 -> 50%
      assert.equal(normalized.days[5].laborHeightPercent, 50);

      // Friday parts is 50,000 / 100,000 -> 50%
      assert.equal(normalized.days[4].partsHeightPercent, 50);
      // Thursday parts is 40,000 / 100,000 -> 40%
      assert.equal(normalized.days[3].partsHeightPercent, 40);
      // Wednesday parts is 30,000 / 100,000 -> 30%
      assert.equal(normalized.days[2].partsHeightPercent, 30);
      // Tuesday parts is 20,000 / 100,000 -> 20%
      assert.equal(normalized.days[1].partsHeightPercent, 20);
      // Monday parts is 10,000 / 100,000 -> 10%
      assert.equal(normalized.days[0].partsHeightPercent, 10);
    });

    it('protects against visual clipping and ensures zero-height safety', () => {
      const sampleWithTinyAndZero = [
        { day: 'Mon', partsAmount: 0, laborAmount: 0 },
        { day: 'Tue', partsAmount: 50, laborAmount: 20 }, // very small relative to 100k
        { day: 'Wed', partsAmount: 0, laborAmount: 0 },
        { day: 'Thu', partsAmount: 0, laborAmount: 0 },
        { day: 'Fri', partsAmount: 0, laborAmount: 0 },
        { day: 'Sat', partsAmount: 100000, laborAmount: 50000 },
        { day: 'Sun', partsAmount: 0, laborAmount: 0 },
      ];

      const normalized = normalizeRevenueTrend(sampleWithTinyAndZero);

      // Mon zero amounts
      assert.equal(normalized.days[0].partsHeightPercent, 0);
      assert.equal(normalized.days[0].laborHeightPercent, 0);

      // Tue non-zero tiny amounts get minimum 4%
      assert.equal(normalized.days[1].partsHeightPercent, 4);
      assert.equal(normalized.days[1].laborHeightPercent, 4);
    });
  });
});
