'use client';

import React from 'react';
import { Activity, Clock, AlertTriangle, Gauge } from 'lucide-react';
import type { RepairsDashboardKpiSummary } from '@/lib/repairs/repairs-contracts';

interface RepairsKpiSummaryProps {
  summary: RepairsDashboardKpiSummary;
}

export function RepairsKpiSummary({ summary }: Readonly<RepairsKpiSummaryProps>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric 1: Active Motors Under Repair */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-xs hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Active in Workshop
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <Activity className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-text-primary tracking-tight">
            {summary.activeRepairsCount}
          </span>
          <span className="text-xs text-text-muted">motors in service</span>
        </div>
        <div className="mt-2 text-[11px] text-text-secondary flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
          <span>Active work orders in progress or waiting</span>
        </div>
      </div>

      {/* Metric 2: In Repair (Active Bay Labor) */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-xs hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            In Repair (Bays)
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 tracking-tight">
            {summary.inProgressCount}
          </span>
          <span className="text-xs text-text-muted">on mechanic lift</span>
        </div>
        <div className="mt-2 text-[11px] text-text-secondary">
          Mechanics actively turning wrenches
        </div>
      </div>

      {/* Metric 3: Waiting for Parts (Bottlenecks) */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-xs hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Waiting for Parts
          </span>
          <div className="w-8 h-8 rounded-lg bg-red-500/10 text-red-600 dark:text-red-400 flex items-center justify-center">
            <AlertTriangle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-red-600 dark:text-red-400 tracking-tight">
            {summary.waitingForPartsCount}
          </span>
          <span className="text-xs text-text-muted">stalled jobs</span>
        </div>
        <div className="mt-2 text-[11px] text-text-secondary">
          Awaiting runner or inventory replenishment
        </div>
      </div>

      {/* Metric 4: Service Bay Utilization Rate */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-4 shadow-xs hover:border-primary/40 transition-colors">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
            Bay Utilization
          </span>
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
            <Gauge className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-black text-purple-600 dark:text-purple-400 tracking-tight">
            {summary.bayUtilizationPercent}%
          </span>
          <span className="text-xs text-text-muted">
            ({summary.occupiedBays}/{summary.totalBays} bays)
          </span>
        </div>
        <div className="mt-2 w-full bg-border-subtle h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-purple-600 h-full rounded-full transition-all duration-500"
            style={{ width: `${summary.bayUtilizationPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
