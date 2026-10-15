'use client';

import React, { useState, useTransition } from 'react';
import { Download, RefreshCw, BarChart3 } from 'lucide-react';
import { FinancialSummaryCards } from './financial-summary-cards';
import { CategoryPnlTable } from './category-pnl-table';
import { getCategoryPnlBreakdownAction } from '@/lib/admin/pnl-actions';
import type { CategoryPnlData } from '@/lib/types/analytics';

export interface ReportsViewClientProps {
  initialData: CategoryPnlData;
  initialPeriod?: 'daily' | 'weekly' | 'monthly';
}

export function ReportsViewClient({
  initialData,
  initialPeriod = 'daily',
}: ReportsViewClientProps) {
  const [data, setData] = useState<CategoryPnlData>(initialData);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>(initialPeriod);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: 'daily' | 'weekly' | 'monthly') => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    startTransition(async () => {
      const result = await getCategoryPnlBreakdownAction(newPeriod);
      if (result.success && result.data) {
        setData(result.data);
      }
    });
  };

  const handleExportCsv = () => {
    // SIAA-37 hook: generates or dispatches accounting CSV export
    const headers = ['Category', 'Units Sold', 'Gross Revenue (PHP)', 'COGS (PHP)', 'Net Profit (PHP)', 'Margin (%)'];
    const rows = data.categories.map((c) => [
      `"${c.category}"`,
      c.units_sold,
      c.gross_revenue.toFixed(2),
      c.cogs.toFixed(2),
      c.net_profit.toFixed(2),
      c.margin_pct.toFixed(1),
    ]);
    const summaryRow = [
      '"Total / Overall"',
      data.summary.total_units_sold,
      data.summary.total_gross_revenue.toFixed(2),
      data.summary.total_cogs.toFixed(2),
      data.summary.total_net_profit.toFixed(2),
      data.summary.overall_margin_pct.toFixed(1),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(',')), summaryRow.join(',')].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SWIFT_PNL_Breakdown_${period.toUpperCase()}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <section id="view-reports" className="space-y-6 animate-fadeIn">
      {/* Header & Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-text-primary">
              Reports & Profit Analytics
            </h1>
            <p className="text-xs text-text-secondary">
              Contrasting Gross Revenue against wholesale COGS and workshop labor yield.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Filter Buttons */}
          <div className="flex bg-bg-muted p-1 rounded-lg border border-border" role="group" aria-label="Sales Period Filter">
            <button
              type="button"
              onClick={() => handlePeriodChange('daily')}
              disabled={isPending}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'daily'
                  ? 'bg-primary text-text-light shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Daily Sales
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('weekly')}
              disabled={isPending}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'weekly'
                  ? 'bg-primary text-text-light shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Weekly Sales
            </button>
            <button
              type="button"
              onClick={() => handlePeriodChange('monthly')}
              disabled={isPending}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                period === 'monthly'
                  ? 'bg-primary text-text-light shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              Monthly Sales
            </button>
          </div>

          {/* Export Action Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-bg-card border border-border text-text-primary hover:bg-bg-hover hover:border-primary/40 transition-colors shadow-xs"
          >
            <Download className="w-3.5 h-3.5 text-text-secondary" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Aggregate Financial Metric Cards */}
      <div className={`transition-opacity duration-200 ${isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        <FinancialSummaryCards summary={data.summary} />
      </div>

      {/* Category Breakdown Table */}
      <div className={`transition-opacity duration-200 ${isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'}`}>
        <CategoryPnlTable categories={data.categories} />
      </div>
    </section>
  );
}
