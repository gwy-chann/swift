"use client";

import React from "react";
import { Wrench, CheckCircle2 } from "lucide-react";

interface WorkshopEmptyStateProps {
  tab: "my-jobs" | "all-bays";
  statusFilter: string;
  onResetFilters: () => void;
  onSwitchToAllBays: () => void;
}

function getEmptyStateTitle(isMyJobs: boolean, isCompleted: boolean): string {
  if (isMyJobs) {
    return isCompleted ? "No Completed Jobs Yet" : "No Active Jobs Assigned To You";
  }
  return isCompleted ? "No Completed Work Orders" : "No Work Orders Found in this Segment";
}

function getEmptyStateDescription(isMyJobs: boolean, statusFilter: string): string {
  const isCompleted = statusFilter === "COMPLETED";
  if (isMyJobs) {
    return isCompleted
      ? "You have not completed any work orders yet today."
      : "You currently have no jobs in progress or queued. Check the Workshop Bay Queue to claim an unassigned vehicle.";
  }
  if (isCompleted) {
    return "There are currently no completed repair jobs recorded.";
  }
  return `There are currently no repair jobs matching status "${statusFilter}". Try adjusting your filters.`;
}

export function WorkshopEmptyState({
  tab,
  statusFilter,
  onResetFilters,
  onSwitchToAllBays,
}: Readonly<WorkshopEmptyStateProps>) {
  const isMyJobs = tab === "my-jobs";

  return (
    <div className="bg-bg-card border border-border border-dashed rounded-lg p-8 sm:p-12 text-center flex flex-col items-center justify-center my-6">
      <div className="w-12 h-12 rounded-full bg-bg-surface border border-border flex items-center justify-center text-text-muted mb-3 shadow-xs">
        {statusFilter === "COMPLETED" ? (
          <CheckCircle2 className="w-6 h-6 text-success" />
        ) : (
          <Wrench className="w-6 h-6 text-primary" />
        )}
      </div>

      <h3 className="text-base font-bold text-text-primary tracking-tight">
        {getEmptyStateTitle(isMyJobs, statusFilter === "COMPLETED")}
      </h3>

      <p className="text-xs sm:text-sm text-text-muted max-w-md mt-1.5 mb-5">
        {getEmptyStateDescription(isMyJobs, statusFilter)}
      </p>

      <div className="flex items-center gap-2.5">
        {statusFilter !== "ALL" && (
          <button
            type="button"
            onClick={onResetFilters}
            className="px-3.5 py-2 rounded text-xs font-semibold bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border transition-colors cursor-pointer"
          >
            Clear Filter
          </button>
        )}

        {isMyJobs && (
          <button
            type="button"
            onClick={onSwitchToAllBays}
            className="px-4 py-2 rounded text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs transition-colors cursor-pointer"
          >
            View Workshop Bay Queue
          </button>
        )}
      </div>
    </div>
  );
}
