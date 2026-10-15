import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  ExecutiveKpiData,
  WeeklyRevenueData,
  CategoryPnlData,
  RevenueTrendDay,
} from '../types/analytics.ts';
import {
  validateExecutiveKpis,
  validateCategoryPnl,
} from './contracts.ts';
import {
  normalizeWeeklyRevenue,
  getEmptyExecutiveKpis,
  getEmptyWeeklyRevenue,
  getEmptyCategoryPnl,
} from './mapper.ts';

/**
 * Fetches executive operational KPIs via Supabase stored procedure `get_executive_kpis`.
 * @param client Supabase client instance (browser or server)
 * @param date Optional ISO date string 'YYYY-MM-DD' (defaults to current date)
 */
export async function fetchExecutiveKpis(
  client: SupabaseClient,
  date?: string
): Promise<ExecutiveKpiData> {
  try {
    const params = date ? { p_date: date } : {};
    const { data, error } = await client.rpc('get_executive_kpis', params);

    if (error || !data) {
      console.error('[Analytics RPC] Error calling get_executive_kpis:', error);
      return getEmptyExecutiveKpis();
    }

    const validation = validateExecutiveKpis(data);
    if (!validation.success || !validation.data) {
      console.warn('[Analytics RPC] Validation warning for get_executive_kpis:', validation.error);
      return getEmptyExecutiveKpis();
    }

    return validation.data;
  } catch (err) {
    console.error('[Analytics RPC] Unexpected exception in fetchExecutiveKpis:', err);
    return getEmptyExecutiveKpis();
  }
}

/**
 * Fetches rolling 7-day revenue comparison via Supabase stored procedure `get_revenue_trend_7d`.
 * @param client Supabase client instance (browser or server)
 * @param endDate Optional ISO date string 'YYYY-MM-DD' (defaults to current date)
 */
export async function fetchRevenueTrend7d(
  client: SupabaseClient,
  endDate?: string
): Promise<WeeklyRevenueData> {
  try {
    const params = endDate ? { p_end_date: endDate } : {};
    const { data, error } = await client.rpc('get_revenue_trend_7d', params);

    if (error || !data || !Array.isArray(data)) {
      console.error('[Analytics RPC] Error calling get_revenue_trend_7d:', error);
      return getEmptyWeeklyRevenue();
    }

    return normalizeWeeklyRevenue(data as Partial<RevenueTrendDay>[]);
  } catch (err) {
    console.error('[Analytics RPC] Unexpected exception in fetchRevenueTrend7d:', err);
    return getEmptyWeeklyRevenue();
  }
}

/**
 * Fetches categorized P&L and COGS breakdown via Supabase stored procedure `get_category_pnl`.
 * @param client Supabase client instance (browser or server)
 * @param startDate Start timestamp or Date instance
 * @param endDate End timestamp or Date instance
 */
export async function fetchCategoryPnl(
  client: SupabaseClient,
  startDate: Date | string,
  endDate: Date | string
): Promise<CategoryPnlData> {
  try {
    const p_start_date =
      startDate instanceof Date ? startDate.toISOString() : new Date(startDate).toISOString();
    const p_end_date =
      endDate instanceof Date ? endDate.toISOString() : new Date(endDate).toISOString();

    const { data, error } = await client.rpc('get_category_pnl', {
      p_start_date,
      p_end_date,
    });

    if (error || !data) {
      console.error('[Analytics RPC] Error calling get_category_pnl:', error);
      return getEmptyCategoryPnl();
    }

    const validation = validateCategoryPnl(data);
    if (!validation.success || !validation.data) {
      console.warn('[Analytics RPC] Validation warning for get_category_pnl:', validation.error);
      return getEmptyCategoryPnl();
    }

    return validation.data;
  } catch (err) {
    console.error('[Analytics RPC] Unexpected exception in fetchCategoryPnl:', err);
    return getEmptyCategoryPnl();
  }
}
