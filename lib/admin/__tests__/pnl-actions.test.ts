import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPeriodTimestampRange,
  getMockPnlByPeriod,
  MOCK_CATEGORY_PNL_DATA,
} from '../pnl-cogs-utils.ts';
import {
  getCategoryPnlBreakdownAction,
} from '../pnl-actions.ts';

describe('Category P&L Server Actions & Period Ranges (SIAA-36)', () => {
  describe('getPeriodTimestampRange', () => {
    it('generates valid start and end ISO dates for daily period', () => {
      const fixedDate = new Date('2026-10-15T12:00:00.000Z');
      const { startDate, endDate } = getPeriodTimestampRange('daily', fixedDate);

      assert.ok(startDate.includes('2026-10-15'));
      assert.ok(endDate.includes('2026-10-15'));
      assert.ok(new Date(startDate) <= new Date(endDate));
    });

    it('generates 7-day span for weekly period', () => {
      const fixedDate = new Date('2026-10-15T12:00:00.000Z');
      const { startDate, endDate } = getPeriodTimestampRange('weekly', fixedDate);

      const diffMs = new Date(endDate).getTime() - new Date(startDate).getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      assert.equal(diffDays, 7);
    });

    it('generates month-to-date span for monthly period', () => {
      const fixedDate = new Date('2026-10-15T12:00:00.000Z');
      const { startDate, endDate } = getPeriodTimestampRange('monthly', fixedDate);

      const start = new Date(startDate);
      assert.equal(start.getDate(), 1);
      assert.ok(new Date(startDate) <= new Date(endDate));
    });
  });

  describe('getMockPnlByPeriod', () => {
    it('returns exact baseline mock data for daily period', () => {
      const result = getMockPnlByPeriod('daily');
      assert.equal(result.categories.length, MOCK_CATEGORY_PNL_DATA.categories.length);
      assert.equal(result.summary.total_gross_revenue, MOCK_CATEGORY_PNL_DATA.summary.total_gross_revenue);
    });

    it('maintains mathematical conservation across all period scalings', () => {
      for (const period of ['daily', 'weekly', 'monthly'] as const) {
        const result = getMockPnlByPeriod(period);
        const calcGross = Math.round(result.categories.reduce((sum, c) => sum + c.gross_revenue, 0) * 100) / 100;
        const calcCogs = Math.round(result.categories.reduce((sum, c) => sum + c.cogs, 0) * 100) / 100;

        assert.equal(result.summary.total_gross_revenue, calcGross);
        assert.equal(result.summary.total_cogs, calcCogs);
        assert.equal(result.summary.total_net_profit, Math.round((calcGross - calcCogs) * 100) / 100);
      }
    });
  });

  describe('getCategoryPnlBreakdownAction', () => {
    it('returns successful payload falling back gracefully when Supabase is not configured', async () => {
      const result = await getCategoryPnlBreakdownAction('daily');
      assert.equal(result.success, true);
      assert.ok(Array.isArray(result.data.categories));
      assert.ok(result.data.categories.length > 0);
      assert.ok(result.data.summary.total_gross_revenue > 0);
    });
  });
});
