'use client';

import React, { useState, useTransition } from 'react';
import {
  BarChart3,
  Download,
  TrendingUp,
  Package,
  Layers,
  Percent,
  Printer,
  Loader2,
} from 'lucide-react';
import { PesoIcon } from '@/components/icons/peso-icon';
import type { CategoryPnlData } from '@/lib/types/analytics';
import { getCategoryPnlAction } from '@/lib/analytics/actions';
import {
  exportAccountingCsvAction,
  type AnalyticsPeriod,
} from '@/lib/analytics/export';

export interface AdminReportsClientProps {
  initialPnlData: CategoryPnlData;
  initialPeriod?: AnalyticsPeriod;
}

const PERIOD_OPTIONS: { id: AnalyticsPeriod; label: string }[] = [
  { id: 'daily', label: 'Daily Sales' },
  { id: 'weekly', label: 'Weekly Sales' },
  { id: 'monthly', label: 'Monthly Sales' },
];

function formatCurrency(amount: number): string {
  return `₱${amount.toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function AdminReportsClient({
  initialPnlData,
  initialPeriod = 'daily',
}: AdminReportsClientProps) {
  const [period, setPeriod] = useState<AnalyticsPeriod>(initialPeriod);
  const [pnlData, setPnlData] = useState<CategoryPnlData>(initialPnlData);
  const [isExporting, setIsExporting] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handlePeriodChange = (newPeriod: AnalyticsPeriod) => {
    if (newPeriod === period || isPending) return;
    setPeriod(newPeriod);
    startTransition(async () => {
      try {
        const updated = await getCategoryPnlAction({ period: newPeriod });
        setPnlData(updated);
      } catch (err) {
        console.error('[Reports UI] Error changing period:', err);
      }
    });
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const result = await exportAccountingCsvAction({ period });
      if (result.success && result.csvContent) {
        const blob = new Blob([result.csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', result.filename);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('[Reports UI] CSV export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handlePrint = () => {
    if (typeof window !== 'undefined') {
      window.print();
    }
  };

  const summary = pnlData.summary || {
    total_units_sold: 0,
    total_gross_revenue: 0,
    total_cogs: 0,
    total_net_profit: 0,
    overall_margin_pct: 0,
  };

  const summaryCards = [
    {
      title: 'Total Gross Revenue',
      badge: period.toUpperCase(),
      value: formatCurrency(summary.total_gross_revenue),
      subtext: `${summary.total_units_sold.toLocaleString()} total units & services delivered`,
      subtextColor: 'text-text-muted',
      icon: PesoIcon,
    },
    {
      title: 'Cost of Goods (COGS)',
      badge: 'Physical Inventory',
      value: formatCurrency(summary.total_cogs),
      subtext: 'Direct landed product expenditure',
      subtextColor: 'text-text-muted',
      icon: Package,
    },
    {
      title: 'Net Gross Profit',
      badge: 'Retained',
      value: formatCurrency(summary.total_net_profit),
      valueColor: 'text-success',
      subtext: `${summary.overall_margin_pct.toFixed(1)}% blended profit margin`,
      subtextColor: 'text-success font-semibold',
      icon: TrendingUp,
    },
    {
      title: 'Overall Margin %',
      badge: 'Target > 45%',
      value: `${summary.overall_margin_pct.toFixed(2)}%`,
      valueColor:
        summary.overall_margin_pct >= 50 ? 'text-success' : 'text-text-primary',
      subtext:
        summary.overall_margin_pct >= 50
          ? 'Healthy operational margin'
          : 'Review parts pricing & markups',
      subtextColor:
        summary.overall_margin_pct >= 50 ? 'text-success' : 'text-accent',
      icon: Percent,
    },
  ];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn">
      {/* Header and Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
              Reports & Financial Analytics
            </h2>
            <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
              Categorized P&L statements, COGS cost accounting, and multi-period revenue audits.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePrint}
            aria-label="Print Report"
            className="px-3 py-2 rounded-lg border border-border bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary text-xs font-semibold flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            aria-label="Export Accounting CSV"
            className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-hover text-text-light text-xs font-bold flex items-center gap-2 shadow-xs transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none disabled:opacity-50"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Time Period Filter Pills */}
      <div className="flex items-center justify-between flex-wrap gap-3 border-b border-border pb-4">
        <div className="flex items-center gap-2 bg-bg-surface p-1 rounded-lg border border-border">
          {PERIOD_OPTIONS.map((opt) => {
            const isActive = period === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => handlePeriodChange(opt.id)}
                disabled={isPending}
                className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
                  isActive
                    ? 'bg-primary text-text-light shadow-xs'
                    : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Layers className="w-3.5 h-3.5" />
          <span>
            Displaying{' '}
            <span className="font-semibold text-text-primary">
              {pnlData.categories.length}
            </span>{' '}
            active catalog and workshop categories
          </span>
          {isPending && (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary ml-1" />
          )}
        </div>
      </div>

      {/* Top 4 Summary Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="p-5 rounded-lg bg-bg-card border border-border flex flex-col justify-between shadow-xs transition-all hover:border-primary/40"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-text-muted shrink-0" />
                  <span className="text-xs font-semibold text-text-muted">
                    {card.title}
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-bg-muted text-text-secondary border border-border-subtle">
                  {card.badge}
                </span>
              </div>

              <div>
                <div
                  className={`text-2xl sm:text-3xl font-black tracking-tight ${
                    card.valueColor || 'text-text-primary'
                  }`}
                >
                  {card.value}
                </div>
                <div
                  className={`text-xs mt-1 flex items-center gap-1 ${card.subtextColor}`}
                >
                  <span>{card.subtext}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Categorized P&L and COGS Breakdown Table */}
      <div className="bg-bg-card border border-border rounded-lg shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-text-primary">
              Categorized Profit & Loss (P&L) Breakdown
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Unit sales, gross revenue, product cost deductions, and net margins per category.
            </p>
          </div>
          <span className="text-xs font-bold text-text-muted uppercase">
            Currency: PHP (₱)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table
            className="w-full text-left text-xs border-collapse"
            role="table"
          >
            <thead>
              <tr className="border-b border-border bg-bg-surface text-text-secondary uppercase font-bold tracking-wider">
                <th scope="col" className="py-3 px-4">
                  Category
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Units Sold
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Gross Revenue
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  COGS
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Net Profit
                </th>
                <th scope="col" className="py-3 px-4 text-right">
                  Margin %
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {pnlData.categories.map((cat) => {
                const isHighMargin = cat.margin_pct >= 70.0;
                return (
                  <tr
                    key={cat.category}
                    className="hover:bg-bg-hover transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-text-primary">
                      {cat.category}
                    </td>
                    <td className="py-3 px-4 text-right text-text-secondary">
                      {cat.units_sold.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right text-text-primary font-medium">
                      {formatCurrency(cat.gross_revenue)}
                    </td>
                    <td className="py-3 px-4 text-right text-text-muted">
                      {cat.cogs === 0 ? '—' : formatCurrency(cat.cogs)}
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-text-primary">
                      {formatCurrency(cat.net_profit)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {isHighMargin ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-success-light text-success font-bold">
                          {cat.margin_pct.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-text-secondary font-medium">
                          {cat.margin_pct.toFixed(1)}%
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="bg-bg-muted font-black text-text-primary border-t-2 border-border">
                <td className="py-3.5 px-4 uppercase tracking-wider text-xs font-black">
                  Total
                </td>
                <td className="py-3.5 px-4 text-right font-bold">
                  {summary.total_units_sold.toLocaleString()}
                </td>
                <td className="py-3.5 px-4 text-right font-black">
                  {formatCurrency(summary.total_gross_revenue)}
                </td>
                <td className="py-3.5 px-4 text-right text-text-muted font-bold">
                  {formatCurrency(summary.total_cogs)}
                </td>
                <td className="py-3.5 px-4 text-right font-black text-success">
                  {formatCurrency(summary.total_net_profit)}
                </td>
                <td className="py-3.5 px-4 text-right">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-success-light text-success font-black">
                    {summary.overall_margin_pct.toFixed(2)}%
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
