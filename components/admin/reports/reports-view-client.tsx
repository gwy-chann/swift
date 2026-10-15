'use client';

import React, { useState, useTransition } from 'react';
import { Download, BarChart3, Printer } from 'lucide-react';
import { FinancialSummaryCards } from './financial-summary-cards';
import { CategoryPnlTable } from './category-pnl-table';
import {
  getCategoryPnlBreakdownAction,
  type AnalyticsPeriod,
} from '@/lib/admin/pnl-actions';
import { getInvoiceCountForPeriod } from '@/lib/admin/pnl-cogs-utils';
import { generateAccountingCsvString } from '@/lib/analytics/export-utils';
import type { CategoryPnlData } from '@/lib/types/analytics';

export type PeriodOption = AnalyticsPeriod;

export interface ReportsViewClientProps {
  initialData: CategoryPnlData;
  initialPeriod?: PeriodOption;
  initialInvoiceCount?: number;
}

export function ReportsViewClient({
  initialData,
  initialPeriod = 'daily',
  initialInvoiceCount,
}: ReportsViewClientProps) {
  const [data, setData] = useState<CategoryPnlData>(initialData);
  const [period, setPeriod] = useState<PeriodOption>(initialPeriod);
  const [invoiceCount, setInvoiceCount] = useState<number>(
    initialInvoiceCount ?? getInvoiceCountForPeriod(initialPeriod)
  );
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: PeriodOption) => {
    if (newPeriod === period) return;
    setPeriod(newPeriod);
    startTransition(async () => {
      const result = await getCategoryPnlBreakdownAction(newPeriod);
      if (result.success && result.data) {
        setData(result.data);
        setInvoiceCount(result.invoiceCount ?? getInvoiceCountForPeriod(newPeriod));
      }
    });
  };

  const handleExportCsv = () => {
    const csvContent = generateAccountingCsvString(data);
    const dateStr = new Date().toISOString().slice(0, 10);
    const filename = `swift_revenue_report_${dateStr}.csv`;

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  return (
    <section id="view-reports" className="space-y-6 animate-fadeIn">
      {/* Header & Controls Toolbar (Hidden during print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
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
          {/* Multi-Period Filter Buttons */}
          <div
            className="flex bg-bg-muted p-1 rounded-lg border border-border"
            role="group"
            aria-label="Sales Period Filter"
          >
            <button
              type="button"
              data-testid="filter-daily"
              onClick={() => handlePeriodChange('daily')}
              disabled={isPending}
              aria-pressed={period === 'daily'}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                period === 'daily'
                  ? 'bg-primary text-text-light shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              Daily Sales
            </button>
            <button
              type="button"
              data-testid="filter-weekly"
              onClick={() => handlePeriodChange('weekly')}
              disabled={isPending}
              aria-pressed={period === 'weekly'}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                period === 'weekly'
                  ? 'bg-primary text-text-light shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              Weekly Sales
            </button>
            <button
              type="button"
              data-testid="filter-monthly"
              onClick={() => handlePeriodChange('monthly')}
              disabled={isPending}
              aria-pressed={period === 'monthly'}
              className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                period === 'monthly'
                  ? 'bg-primary text-text-light shadow-xs'
                  : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
              }`}
            >
              Monthly Sales
            </button>
          </div>

          {/* Action Buttons: Export CSV & Print */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              data-testid="btn-export-csv"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-bg-card border border-border text-text-primary hover:bg-bg-hover hover:border-primary/40 transition-colors shadow-xs cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-text-secondary" />
              <span>Export CSV</span>
            </button>

            <button
              type="button"
              data-testid="btn-print-summary"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-bg-card border border-border text-text-primary hover:bg-bg-hover hover:border-primary/40 transition-colors shadow-xs cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-text-secondary" />
              <span>Print Summary</span>
            </button>
          </div>
        </div>
      </div>

      {/* Print-Only Header */}
      <div className="hidden print:block mb-6 border-b border-neutral-300 pb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-black">SWIFT Revenue & Profit Analytics</h1>
            <p className="text-xs text-neutral-600 mt-1">
              Period: {period.toUpperCase()} SALES | Generated on: {new Date().toLocaleDateString('en-PH')}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-800">
              Executive Briefing Report
            </span>
          </div>
        </div>
      </div>

      {/* Aggregate Financial Metric Cards */}
      <div
        className={`transition-opacity duration-200 ${
          isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'
        } print:break-inside-avoid`}
      >
        <FinancialSummaryCards summary={data.summary} invoiceCount={invoiceCount} />
      </div>

      {/* Category Breakdown Table */}
      <div
        className={`transition-opacity duration-200 ${
          isPending ? 'opacity-60 pointer-events-none' : 'opacity-100'
        } print:break-inside-avoid`}
      >
        <CategoryPnlTable categories={data.categories} />
      </div>
    </section>
  );
}
