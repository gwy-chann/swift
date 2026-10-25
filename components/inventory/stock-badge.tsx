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
}: Readonly<StockBadgeProps>) {
  const healthStatus: StockHealthStatus = getStockHealthStatus({ stock, minThreshold });

  if (healthStatus === 'out_of_stock') {
    return (
      <output
        aria-label="Product is out of stock"
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-danger text-text-light whitespace-nowrap shadow-2xs shrink-0 ${className}`}
      >
        <AlertOctagon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{compact ? 'Out of Stock' : '0 Out of Stock'}</span>
      </output>
    );
  }

  if (healthStatus === 'low') {
    return (
      <output
        aria-label={`Low stock warning: ${stock} units remaining against minimum threshold of ${minThreshold}`}
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-danger-light text-danger border border-danger/30 whitespace-nowrap shadow-2xs shrink-0 ${className}`}
      >
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>
          {compact
            ? `Low: ${stock} (Min ${minThreshold})`
            : `Low: ${stock} left (Min ${minThreshold})`}
        </span>
      </output>
    );
  }

  return (
    <output
      aria-label={`Healthy stock: ${stock} units available`}
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-light text-success border border-success/30 whitespace-nowrap shrink-0 ${className}`}
    >
      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
      <span>{compact ? `${stock} in stock` : `${stock} Units`}</span>
    </output>
  );
}
