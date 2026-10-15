import React from 'react';
import { formatCurrencyPhp, formatUnitCount, isHighYieldMargin } from '@/lib/admin/pnl-cogs-utils';
import type { CategoryPnlItem } from '@/lib/types/analytics';
import { ArrowUpRight, AlertCircle } from 'lucide-react';

export interface CategoryPnlTableProps {
  categories: CategoryPnlItem[];
  targetMarginThreshold?: number;
}

export function CategoryPnlTable({
  categories,
  targetMarginThreshold = 30.0,
}: CategoryPnlTableProps) {
  return (
    <div className="bg-bg-card border border-border rounded-xl shadow-xs overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-text-primary">
            Category Revenue & Margin Breakdown
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">
            Direct wholesale inventory cost (COGS) vs retail revenue and net margin yield.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-success-light text-success border border-success/30">
            <ArrowUpRight className="w-3.5 h-3.5" />
            Target: &gt;={targetMarginThreshold}%
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm border-collapse" data-testid="category-pnl-table">
          <thead>
            <tr className="bg-bg-surface text-text-secondary text-xs font-semibold uppercase tracking-wider border-b border-border">
              <th scope="col" className="px-5 py-3.5">Category</th>
              <th scope="col" className="px-4 py-3.5 text-right">Units Sold</th>
              <th scope="col" className="px-4 py-3.5 text-right">Gross Revenue</th>
              <th scope="col" className="px-4 py-3.5 text-right">COGS</th>
              <th scope="col" className="px-4 py-3.5 text-right">Net Profit</th>
              <th scope="col" className="px-5 py-3.5 text-right">Margin</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {categories.map((item) => {
              const highYield = isHighYieldMargin(item.margin_pct, targetMarginThreshold);

              return (
                <tr
                  key={item.category}
                  className="hover:bg-bg-hover transition-colors"
                  data-testid={`row-${item.category}`}
                >
                  <td className="px-5 py-4 font-semibold text-text-primary whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <span>{item.category}</span>
                      {item.category.toLowerCase().includes('labor') && (
                        <span className="px-1.5 py-0.5 text-[10px] uppercase font-bold rounded-sm bg-primary-light text-primary">
                          Service
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-right text-text-secondary font-mono whitespace-nowrap">
                    {formatUnitCount(item.category, item.units_sold)}
                  </td>
                  <td className="px-4 py-4 text-right text-text-primary font-mono whitespace-nowrap">
                    {formatCurrencyPhp(item.gross_revenue)}
                  </td>
                  <td className="px-4 py-4 text-right text-text-secondary font-mono whitespace-nowrap">
                    {formatCurrencyPhp(item.cogs)}
                  </td>
                  <td
                    className={`px-4 py-4 text-right font-mono whitespace-nowrap ${
                      highYield
                        ? 'text-success font-semibold'
                        : item.net_profit < 0
                        ? 'text-danger font-semibold'
                        : 'text-text-primary'
                    }`}
                  >
                    {formatCurrencyPhp(item.net_profit)}
                  </td>
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center justify-end gap-1.5">
                      <span
                        className={`font-mono text-xs px-2 py-0.5 rounded-md font-semibold ${
                          highYield
                            ? 'bg-success-light text-success'
                            : item.margin_pct < 0
                            ? 'bg-danger-light text-danger'
                            : 'bg-accent-light text-accent'
                        }`}
                      >
                        {item.margin_pct.toFixed(1)}%
                      </span>
                      {!highYield && item.margin_pct >= 0 && (
                        <span
                          title="Under target margin - Review retail markup"
                          className="text-accent cursor-help"
                        >
                          <AlertCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
