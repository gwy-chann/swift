import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchExecutiveKpis,
  fetchRevenueTrend7d,
  fetchCategoryPnl,
} from '../rpc.ts';
import type { SupabaseClient } from '@supabase/supabase-js';

describe('Analytics Supabase RPC Client Bindings (SIAA-67)', () => {
  it('calls get_executive_kpis and returns validated ExecutiveKpiData', async () => {
    const mockSupabase = {
      rpc: async (fn: string, params: Record<string, unknown>) => {
        assert.equal(fn, 'get_executive_kpis');
        assert.equal(params?.p_date, '2026-10-15');
        return {
          data: {
            gross_revenue_today: 45230.0,
            gross_revenue_yesterday: 38400.0,
            revenue_growth_pct: 17.79,
            active_work_orders_count: 3,
            pending_parts_count: 1,
            net_profit_margin_pct: 34.2,
            gross_profit_amount: 15468.66,
            critical_low_stock_count: 5,
          },
          error: null,
        };
      },
    } as unknown as SupabaseClient;

    const kpis = await fetchExecutiveKpis(mockSupabase, '2026-10-15');
    assert.equal(kpis.gross_revenue_today, 45230.0);
    assert.equal(kpis.revenue_growth_pct, 17.79);
    assert.equal(kpis.active_work_orders_count, 3);
  });

  it('gracefully falls back on get_executive_kpis database error', async () => {
    const mockSupabase = {
      rpc: async () => ({
        data: null,
        error: { message: 'Database connection failed' },
      }),
    } as unknown as SupabaseClient;

    const kpis = await fetchExecutiveKpis(mockSupabase, '2026-10-15');
    assert.equal(kpis.gross_revenue_today, 0);
    assert.equal(kpis.revenue_growth_pct, 0);
  });

  it('calls get_revenue_trend_7d and returns normalized WeeklyRevenueData', async () => {
    const mockSupabase = {
      rpc: async (fn: string, params: Record<string, unknown>) => {
        assert.equal(fn, 'get_revenue_trend_7d');
        assert.equal(params?.p_end_date, '2026-10-15');
        return {
          data: [
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
          ],
          error: null,
        };
      },
    } as unknown as SupabaseClient;

    const trend = await fetchRevenueTrend7d(mockSupabase, '2026-10-15');
    assert.equal(trend.days.length, 2);
    assert.equal(trend.peak_day_amount, 68500);
    assert.equal(trend.total_weekly_revenue, 109000);
  });

  it('calls get_category_pnl and returns validated CategoryPnlData', async () => {
    const mockSupabase = {
      rpc: async (fn: string, params: Record<string, unknown>) => {
        assert.equal(fn, 'get_category_pnl');
        assert.ok(params?.p_start_date);
        assert.ok(params?.p_end_date);
        return {
          data: {
            categories: [
              {
                category: 'Fluids',
                units_sold: 45,
                gross_revenue: 15750.0,
                cogs: 9000.0,
                net_profit: 6750.0,
                margin_pct: 42.86,
              },
            ],
            summary: {
              total_units_sold: 45,
              total_gross_revenue: 15750.0,
              total_cogs: 9000.0,
              total_net_profit: 6750.0,
              overall_margin_pct: 42.86,
            },
          },
          error: null,
        };
      },
    } as unknown as SupabaseClient;

    const pnl = await fetchCategoryPnl(
      mockSupabase,
      new Date('2026-10-01'),
      new Date('2026-10-15')
    );
    assert.equal(pnl.categories.length, 1);
    assert.equal(pnl.summary.total_gross_revenue, 15750.0);
  });
});
