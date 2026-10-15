import React from 'react';
import { Coins, Percent, ReceiptText } from 'lucide-react';
import { PesoIcon } from '@/components/icons/peso-icon';
import { formatCurrencyPhp, isHighYieldMargin } from '@/lib/admin/pnl-cogs-utils';
import type { CategoryPnlSummary } from '@/lib/types/analytics';

export interface FinancialSummaryCardsProps {
  summary: CategoryPnlSummary;
  invoiceCount?: number;
}

export function FinancialSummaryCards({ summary, invoiceCount }: FinancialSummaryCardsProps) {
  const displayInvoices = invoiceCount ?? summary.invoice_count ?? 38;
  const isTargetMarginMet = isHighYieldMargin(summary.overall_margin_pct, 30.0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Gross Sales Revenue */}
      <div className="bg-bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Gross Sales Revenue
          </span>
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
            <PesoIcon className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-text-primary">
            {formatCurrencyPhp(summary.total_gross_revenue)}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Across {displayInvoices} Completed Invoices
          </div>
        </div>
      </div>

      {/* 2. Cost of Goods (COGS) */}
      <div className="bg-bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Cost of Goods (COGS)
          </span>
          <div className="w-8 h-8 rounded-lg bg-bg-muted text-text-secondary flex items-center justify-center">
            <ReceiptText className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-text-primary">
            {formatCurrencyPhp(summary.total_cogs)}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Direct wholesale inventory cost
          </div>
        </div>
      </div>

      {/* 3. Net Profit Margin */}
      <div className="bg-bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Net Profit Margin
          </span>
          <div className="w-8 h-8 rounded-lg bg-success-light text-success flex items-center justify-center">
            <Coins className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-success">
            {formatCurrencyPhp(summary.total_net_profit)}
          </div>
          <div className="text-xs text-text-secondary mt-1">
            Net after labor and parts cost
          </div>
        </div>
      </div>

      {/* 4. Profit Margin % */}
      <div className="bg-bg-card border border-border rounded-xl p-5 shadow-xs flex flex-col justify-between">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Profit Margin %
          </span>
          <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center">
            <Percent className="w-4 h-4" />
          </div>
        </div>
        <div className="mt-3">
          <div className="text-2xl font-bold text-text-primary">
            {summary.overall_margin_pct.toFixed(1)}%
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                isTargetMarginMet
                  ? 'bg-success-light text-success'
                  : 'bg-accent-light text-accent'
              }`}
            >
              {isTargetMarginMet ? 'Within target range (>30%)' : 'Below target range (≤30%)'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
