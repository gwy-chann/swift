import React from 'react';
import { CheckCircle2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { getStockHealthStatus, StockHealthStatus } from '@/lib/inventory/catalog-filter';

export interface StockBadgeProps {
  stock: number;
  minThreshold: number;
  compact?: boolean;
  className?: string;
}

export function StockBadge({
  stock,
  minThreshold,
  compact = false,
  className = ''
}: StockBadgeProps) {
  const healthStatus: StockHealthStatus = getStockHealthStatus({ stock, minThreshold });

  if (healthStatus === 'out_of_stock') {
    return (
      <span
        role="status"
        aria-label="Product is out of stock"
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-danger text-text-light shadow-2xs ${className}`}
      >
        <AlertOctagon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{compact ? 'Out of Stock' : '0 Out of Stock'}</span>
      </span>
    );
  }

  if (healthStatus === 'low') {
    return (
      <span
        role="status"
        aria-label={`Low stock warning: ${stock} units remaining against minimum threshold of ${minThreshold}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-bold bg-danger-light text-danger border border-danger/30 shadow-2xs ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          {compact
            ? `Low: ${stock} (Min ${minThreshold})`
            : `Low: ${stock} left (Min ${minThreshold})`}
        </span>
      </span>
    );
  }

  return (
    <span
      role="status"
      aria-label={`Healthy stock: ${stock} units available`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-xs font-semibold bg-success-light text-success border border-success/30 ${className}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{compact ? `${stock} in stock` : `${stock} Units`}</span>
    </span>
  );
}
