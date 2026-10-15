import React from 'react';
import {
  ClipboardList,
  TrendingDown,
  TrendingUp,
  PackageMinus,
  PackagePlus,
} from 'lucide-react';
import type { StockAuditSummaryMetrics } from '@/lib/types/stock-audit';

interface StockAuditSummaryKpisProps {
  metrics: StockAuditSummaryMetrics;
  isLoading?: boolean;
}

function getNetDeltaColorClass(netDelta: number): string {
  if (netDelta > 0) return 'text-success';
  if (netDelta < 0) return 'text-danger';
  return 'text-text-primary';
}

export function StockAuditSummaryKpis({
  metrics,
  isLoading = false,
}: StockAuditSummaryKpisProps) {
  const netDeltaFormatted =
    metrics.netDelta > 0
      ? `+${metrics.netDelta.toLocaleString()}`
      : metrics.netDelta.toLocaleString();

  const netDeltaColor = getNetDeltaColorClass(metrics.netDelta);

  return (
    <div
      id="stockAuditSummaryKpi"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
    >
      {/* 1. Total Adjustment Events */}
      <div className="p-4 rounded-xl bg-bg-card border border-border shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-text-secondary">
            Total Adjustment Events
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-text-primary tracking-tight">
              {isLoading ? '...' : metrics.totalCount.toLocaleString()}
            </span>
            <span className="text-xs text-text-muted">entries logged</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
          <ClipboardList className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Net Unit Delta */}
      <div className="p-4 rounded-xl bg-bg-card border border-border shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-text-secondary">
            Net Unit Delta
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-2xl font-bold tracking-tight ${netDeltaColor}`}>
              {isLoading ? '...' : `${netDeltaFormatted} Units`}
            </span>
          </div>
        </div>
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
            metrics.netDelta >= 0
              ? 'bg-success-light text-success'
              : 'bg-danger-light text-danger'
          }`}
        >
          {metrics.netDelta >= 0 ? (
            <TrendingUp className="w-5 h-5" />
          ) : (
            <TrendingDown className="w-5 h-5" />
          )}
        </div>
      </div>

      {/* 3. Total Shrinkage Units */}
      <div className="p-4 rounded-xl bg-bg-card border border-border shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-text-secondary">
            Total Shrinkage Loss
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-danger tracking-tight">
              {isLoading
                ? '...'
                : `-${metrics.totalShrinkage.toLocaleString()} Units`}
            </span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-danger-light text-danger flex items-center justify-center shrink-0">
          <PackageMinus className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Total Inbound Intake */}
      <div className="p-4 rounded-xl bg-bg-card border border-border shadow-xs flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-text-secondary">
            Total Intake / Restock
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-bold text-success tracking-tight">
              {isLoading
                ? '...'
                : `+${metrics.totalIntake.toLocaleString()} Units`}
            </span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-success-light text-success flex items-center justify-center shrink-0">
          <PackagePlus className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
