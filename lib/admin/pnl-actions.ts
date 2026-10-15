'use server';

import type { CategoryPnlData } from '../types/analytics.ts';
import {
  getPeriodTimestampRange,
  type AnalyticsPeriod,
} from './pnl-cogs-utils.ts';
import { getEmptyCategoryPnl } from '../analytics/mapper.ts';

export type { AnalyticsPeriod };

export interface CategoryPnlActionResult {
  success: boolean;
  data: CategoryPnlData;
  source: 'database' | 'fallback_mock';
  period: AnalyticsPeriod;
  invoiceCount?: number;
  error?: string;
}

/**
 * Server action to fetch Categorized P&L Breakdown & COGS data.
 * Invokes PostgreSQL RPC get_category_pnl(p_start_date, p_end_date) and calculates exact real invoice count.
 */
export async function getCategoryPnlBreakdownAction(
  period: AnalyticsPeriod = 'daily'
): Promise<CategoryPnlActionResult> {
  const { startDate, endDate } = getPeriodTimestampRange(period);

  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    // Query actual invoice count from transactions table for this date range
    const { count: actualInvoiceCount, error: countError } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startDate)
      .lte('created_at', endDate);

    const invoiceCount = countError ? 0 : (actualInvoiceCount ?? 0);

    const { data, error } = await supabase.rpc('get_category_pnl', {
      p_start_date: startDate,
      p_end_date: endDate,
    });

    if (error || !data || !Array.isArray(data.categories) || data.categories.length === 0) {
      return {
        success: true,
        data: getEmptyCategoryPnl(),
        source: 'database',
        period,
        invoiceCount,
        error: error ? error.message : undefined,
      };
    }

    return {
      success: true,
      data: {
        categories: data.categories,
        summary: data.summary,
      },
      source: 'database',
      period,
      invoiceCount,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      success: true,
      data: getEmptyCategoryPnl(),
      source: 'database',
      period,
      invoiceCount: 0,
      error: message,
    };
  }
}
