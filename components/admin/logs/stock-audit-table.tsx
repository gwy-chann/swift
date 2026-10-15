import React from 'react';
import { ShieldCheck, PackageX } from 'lucide-react';
import type { StockAdjustmentLogEntry } from '@/lib/types/stock-audit';
import { formatAuditTimestamp } from '@/lib/admin/stock-audit-utils';

interface StockAuditTableProps {
  logs: StockAdjustmentLogEntry[];
  isLoading?: boolean;
}

export function StockAuditTable({
  logs,
  isLoading = false,
}: StockAuditTableProps) {
  const getAdjustmentTypeBadge = (type: string) => {
    const t = type.toLowerCase();
    if (t.includes('damaged')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-accent-light text-accent border border-accent/30">
          {type}
        </span>
      );
    }
    if (t.includes('return') || t.includes('restock') || t.includes('inbound')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-info-light text-info border border-info/30">
          {type}
        </span>
      );
    }
    if (t.includes('count') || t.includes('audit')) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-primary-light text-primary border border-primary-border">
          {type}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-bg-muted text-text-secondary border border-border">
        {type}
      </span>
    );
  };

  const renderTableRows = () => {
    if (isLoading) {
      return (
        <tr>
          <td colSpan={6} className="py-12 text-center text-text-muted">
            <div className="inline-flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span>Loading immutable stock adjustment ledger...</span>
            </div>
          </td>
        </tr>
      );
    }

    if (logs.length === 0) {
      return (
        <tr id="stockAuditEmptyState">
          <td colSpan={6} className="py-12 text-center">
            <div className="flex flex-col items-center justify-center gap-2 text-text-muted">
              <PackageX className="w-8 h-8 opacity-40 text-text-secondary" />
              <p className="text-sm font-semibold text-text-primary">
                No matching stock adjustment records found
              </p>
              <p className="text-xs text-text-secondary max-w-sm">
                Try adjusting your search query, filter criteria, or date range to inspect audit entries.
              </p>
            </div>
          </td>
        </tr>
      );
    }

    return logs.map((log) => {
      const isPositive = log.quantityDelta > 0;
      const formattedDelta = isPositive
        ? `+${log.quantityDelta} Units`
        : `${log.quantityDelta} Units`;

      return (
        <tr
          key={log.id}
          className="hover:bg-bg-hover/60 transition-colors"
        >
          {/* Timestamp */}
          <td className="py-3 px-4 font-mono text-text-secondary whitespace-nowrap">
            {formatAuditTimestamp(log.createdAt)}
          </td>

          {/* SKU */}
          <td className="py-3 px-4 font-mono font-bold text-text-primary whitespace-nowrap">
            {log.sku}
          </td>

          {/* Adjustment Type Badge */}
          <td className="py-3 px-4 whitespace-nowrap">
            {getAdjustmentTypeBadge(log.adjustmentType)}
          </td>

          {/* Delta Pill */}
          <td className="py-3 px-4 whitespace-nowrap">
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold ${
                isPositive
                  ? 'bg-success-light text-success border border-success/30'
                  : 'bg-danger-light text-danger border border-danger/30'
              }`}
            >
              {formattedDelta}
            </span>
          </td>

          {/* Reason / Reference */}
          <td className="py-3 px-4 text-text-primary max-w-xs truncate" title={log.reason}>
            {log.reason || (
              <span className="text-text-muted italic">No reason specified</span>
            )}
          </td>

          {/* Authorized User */}
          <td className="py-3 px-4 text-text-secondary whitespace-nowrap">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
              <span>{log.userName}</span>
            </span>
          </td>
        </tr>
      );
    });
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse text-xs">
        <thead>
          <tr className="border-b border-border bg-bg-muted/50 text-text-muted uppercase tracking-wider font-semibold">
            <th className="py-3 px-4">Timestamp</th>
            <th className="py-3 px-4">SKU</th>
            <th className="py-3 px-4">Type</th>
            <th className="py-3 px-4">Change</th>
            <th className="py-3 px-4">Reason / Reference</th>
            <th className="py-3 px-4">Authorized By</th>
          </tr>
        </thead>
        <tbody id="stockAdjLogsBody" className="divide-y divide-border/60">
          {renderTableRows()}
        </tbody>
      </table>
    </div>
  );
}
