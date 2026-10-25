"use client";

import React from "react";
import { Wrench, RefreshCw, AlertTriangle, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import type { WorkshopQueueSummary } from "@/lib/types/workshop";

interface WorkshopQueueHeaderProps {
  summary: WorkshopQueueSummary;
  mechanicName?: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}

export function WorkshopQueueHeader({
  summary,
  mechanicName = "Dante Reyes",
  isRefreshing,
  onRefresh,
}: Readonly<WorkshopQueueHeaderProps>) {
  return (
    <div className="bg-bg-card border border-border rounded-lg p-4 sm:p-5 shadow-xs mb-5">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Title and Active Technician Badge */}
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-white shadow-xs">
              <Wrench className="w-4 h-4" />
            </div>
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-text-primary">
              Workshop Repair Queue
            </h1>
            <span className="px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-success-light text-success border border-success/30 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" />
              Live Shop Floor
            </span>
          </div>
          <p className="text-xs sm:text-sm text-text-muted">
            Logged in as <strong className="text-text-primary">{mechanicName}</strong> • Service Bay Work Order Progression
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-2 rounded text-xs font-semibold bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh Queue"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-primary" : ""}`} />
            <span>{isRefreshing ? "Syncing..." : "Sync Queue"}</span>
          </button>
        </div>
      </div>

      {/* Metric Cards Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-border-subtle">
        <div className="bg-bg-surface border border-border-subtle rounded-md p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">My Active Jobs</span>
            <Clock className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="text-xl font-extrabold text-text-primary mt-1">
            {summary.myJobsCount}
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-md p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Bay Utilization</span>
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
          </div>
          <div className="text-xl font-extrabold text-text-primary mt-1">
            {summary.activeBaysCount} / {summary.totalBaysCount}
            <span className="text-xs font-medium text-text-muted ml-1.5">Bays Occupied</span>
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-md p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Pending Parts</span>
            <AlertTriangle className="w-3.5 h-3.5 text-accent" />
          </div>
          <div className="text-xl font-extrabold text-accent mt-1">
            {summary.pendingPartsCount}
          </div>
        </div>

        <div className="bg-bg-surface border border-border-subtle rounded-md p-3">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">Completed Today</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          </div>
          <div className="text-xl font-extrabold text-success mt-1">
            {summary.completedTodayCount}
          </div>
        </div>
      </div>
    </div>
  );
}
