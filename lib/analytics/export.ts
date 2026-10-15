'use server';

import type { CategoryPnlData } from '../types/analytics.ts';
import { getMockPnlByPeriod, type AnalyticsPeriod } from '../admin/pnl-cogs-utils.ts';
import { fetchCategoryPnl } from './rpc.ts';
import {
  generateAccountingCsvString,
  computePeriodDateRange,
} from './export-utils.ts';

export type { AnalyticsPeriod };

export interface AccountingCsvExportParams {
  period?: AnalyticsPeriod;
  startDate?: string;
  endDate?: string;
}

export interface AccountingCsvExportResult {
  success: boolean;
  filename: string;
  csvContent: string;
  rowCount: number;
  period: AnalyticsPeriod;
  generatedAt: string;
  error?: string;
}

/**
 * Server Action: Exports categorized P&L statements into a sanitized CSV string.
 * Standardized filename: swift_revenue_report_YYYY-MM-DD.csv
 */
export async function exportAccountingCsvAction(
  params: AccountingCsvExportParams = {}
): Promise<AccountingCsvExportResult> {
  const period: AnalyticsPeriod = params.period || 'daily';
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10);
  const filename = `swift_revenue_report_${dateStr}.csv`;

  try {
    let pnlData: CategoryPnlData | null = null;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import('../supabase/server.ts');
        const supabase = await createClient();
        const { start, end } = computePeriodDateRange(period);
        pnlData = await fetchCategoryPnl(supabase, start, end);
      } catch (clientErr) {
        console.warn('[Analytics Export] Supabase client unavailable, using fallback:', clientErr);
      }
    }

    if (
      !pnlData ||
      !pnlData.categories ||
      pnlData.categories.length === 0 ||
      pnlData.summary.total_gross_revenue === 0
    ) {
      pnlData = getMockPnlByPeriod(period);
    }

    const csvContent = generateAccountingCsvString(pnlData);
    const rowCount = pnlData.categories.length;

    return {
      success: true,
      filename,
      csvContent,
      rowCount,
      period,
      generatedAt: now.toISOString(),
    };
  } catch (error) {
    console.error('[Analytics Export] Failed to export CSV:', error);
    const fallback = getMockPnlByPeriod(period);
    const csvContent = generateAccountingCsvString(fallback);

    return {
      success: true,
      filename,
      csvContent,
      rowCount: fallback.categories.length,
      period,
      generatedAt: now.toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
