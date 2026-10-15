import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateExecutiveKpis,
  validateWeeklyRevenue,
  validateCategoryPnl,
} from '../contracts.ts';

describe('Analytics Contracts & Schema Validation (SIAA-67)', () => {
  describe('Executive KPIs Validation', () => {
    it('validates a complete, healthy executive KPI payload', () => {
      const payload = {
        gross_revenue_today: 45230.0,
        gross_revenue_yesterday: 38400.0,
        revenue_growth_pct: 17.79,
        active_work_orders_count: 3,
        pending_parts_count: 1,
        net_profit_margin_pct: 34.2,
        gross_profit_amount: 15468.66,
        critical_low_stock_count: 5,
      };

      const result = validateExecutiveKpis(payload);
      assert.equal(result.success, true);
      assert.equal(result.data?.gross_revenue_today, 45230.0);
      assert.equal(result.data?.revenue_growth_pct, 17.79);
      assert.equal(result.data?.active_work_orders_count, 3);
      assert.equal(result.data?.critical_low_stock_count, 5);
    });

    it('gracefully coerces zero-data and boundary payloads', () => {
      const payload = {
        gross_revenue_today: 0,
        gross_revenue_yesterday: 0,
        revenue_growth_pct: 0,
        active_work_orders_count: 0,
        pending_parts_count: 0,
        net_profit_margin_pct: 0,
        gross_profit_amount: 0,
        critical_low_stock_count: 0,
      };

      const result = validateExecutiveKpis(payload);
      assert.equal(result.success, true);
      assert.equal(result.data?.gross_revenue_today, 0);
      assert.equal(result.data?.revenue_growth_pct, 0);
      assert.equal(result.data?.gross_profit_amount, 0);
    });

    it('rejects invalid payload types', () => {
      const payload = {
        gross_revenue_today: -100, // Negative revenue is invalid
        gross_revenue_yesterday: 'not a number',
      };

      const result = validateExecutiveKpis(payload);
      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('7-Day Revenue Trend Validation', () => {
    it('validates a complete 7-day revenue trend dataset with peak-day normalization', () => {
      const payload = {
        days: [
          {
            date: '2026-10-09',
            day_label: 'Fri',
            parts_amount: 28500,
            labor_amount: 12000,
            total_amount: 40500,
            parts_height_percent: 60.5,
            labor_height_percent: 39.5,
          },
          {
            date: '2026-10-10',
            day_label: 'Sat',
            parts_amount: 44500,
            labor_amount: 24000,
            total_amount: 68500,
            parts_height_percent: 64.96,
            labor_height_percent: 35.04,
          },
        ],
        peak_day_amount: 68500,
        total_parts_weekly: 73000,
        total_labor_weekly: 36000,
        total_weekly_revenue: 109000,
      };

      const result = validateWeeklyRevenue(payload);
      assert.equal(result.success, true);
      assert.equal(result.data?.days.length, 2);
      assert.equal(result.data?.peak_day_amount, 68500);
      assert.equal(result.data?.total_weekly_revenue, 109000);
    });

    it('rejects out-of-bounds height percentages (>100%)', () => {
      const payload = {
        days: [
          {
            date: '2026-10-09',
            day_label: 'Fri',
            parts_amount: 100,
            labor_amount: 200,
            total_amount: 300,
            parts_height_percent: 150, // Out of bounds
            labor_height_percent: 50,
          },
        ],
        peak_day_amount: 300,
        total_parts_weekly: 100,
        total_labor_weekly: 200,
        total_weekly_revenue: 300,
      };

      const result = validateWeeklyRevenue(payload);
      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('Categorized P&L Validation', () => {
    it('validates a complete categorized P&L breakdown and summary', () => {
      const payload = {
        categories: [
          {
            category: 'Fluids',
            units_sold: 45,
            gross_revenue: 15750.0,
            cogs: 9000.0,
            net_profit: 6750.0,
            margin_pct: 42.86,
          },
          {
            category: 'Workshop Labor',
            units_sold: 12,
            gross_revenue: 6000.0,
            cogs: 0.0,
            net_profit: 6000.0,
            margin_pct: 100.0,
          },
        ],
        summary: {
          total_units_sold: 57,
          total_gross_revenue: 21750.0,
          total_cogs: 9000.0,
          total_net_profit: 12750.0,
          overall_margin_pct: 58.62,
        },
      };

      const result = validateCategoryPnl(payload);
      assert.equal(result.success, true);
      assert.equal(result.data?.categories.length, 2);
      assert.equal(result.data?.summary.total_gross_revenue, 21750.0);
      assert.equal(result.data?.summary.overall_margin_pct, 58.62);
    });
  });
});
