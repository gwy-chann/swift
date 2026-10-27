"use client";

import React from "react";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import type { WorkshopQueueSummary } from "@/lib/types/workshop";

interface WorkshopQueueHeaderProps {
  summary: WorkshopQueueSummary;
  mechanicName?: string;
  isRefreshing?: boolean;
  onRefresh?: () => void;
}

export function WorkshopQueueHeader({
  summary,
}: Readonly<WorkshopQueueHeaderProps>) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
      <div className="bg-bg-card border border-border rounded-lg p-3 sm:p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">My Active Jobs</span>
          <Clock className="w-3.5 h-3.5 text-primary" />
        </div>
        <div className="text-xl font-extrabold text-text-primary mt-1">
          {summary.myJobsCount}
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-3 sm:p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Bay Utilization</span>
          <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
        </div>
        <div className="text-xl font-extrabold text-text-primary mt-1">
          {summary.activeBaysCount} / {summary.totalBaysCount}
          <span className="text-xs font-medium text-text-muted ml-1.5">Bays Occupied</span>
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-3 sm:p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Pending Parts</span>
          <AlertTriangle className="w-3.5 h-3.5 text-accent" />
        </div>
        <div className="text-xl font-extrabold text-accent mt-1">
          {summary.pendingPartsCount}
        </div>
      </div>

      <div className="bg-bg-card border border-border rounded-lg p-3 sm:p-3.5 shadow-xs">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Completed Today</span>
          <CheckCircle2 className="w-3.5 h-3.5 text-success" />
        </div>
        <div className="text-xl font-extrabold text-success mt-1">
          {summary.completedTodayCount}
        </div>
      </div>
    </div>
  );
}

