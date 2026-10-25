"use client";

import React from "react";
import {
  Wrench,
  Clock,
  User,
  Package,
  Play,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  HandMetal,
} from "lucide-react";
import type { DetailedWorkOrder } from "@/lib/types/workshop";
import type { WorkOrderStatus } from "@/lib/types/service";
import {
  formatWorkOrderStatusLabel,
  getWorkOrderStatusBadgeClass,
} from "@/lib/services/service-bay-queue";

interface WorkOrderCardProps {
  order: DetailedWorkOrder;
  currentMechanicId?: string;
  onInspect: (order: DetailedWorkOrder) => void;
  onStatusChange: (orderId: string, newStatus: WorkOrderStatus) => void;
  onClaimJob: (orderId: string) => void;
  isUpdating?: boolean;
  isTimedIn?: boolean;
}

export function WorkOrderCard({
  order,
  currentMechanicId,
  onInspect,
  onStatusChange,
  onClaimJob,
  isUpdating = false,
  isTimedIn = true,
}: Readonly<WorkOrderCardProps>) {
  const isAssignedToMe = Boolean(currentMechanicId && order.mechanicId === currentMechanicId);
  const isUnassigned = !order.mechanicId;

  // Parts availability calculations
  const totalParts = order.requiredParts?.length ?? 0;
  const missingParts = order.requiredParts?.filter((p) => !p.isAvailable).length ?? 0;
  const allPartsInStock = totalParts > 0 && missingParts === 0;

  let cardBorderClass = "border-border";
  if (order.status === "IN PROGRESS") {
    cardBorderClass = "border-primary/30 ring-1 ring-primary/20";
  } else if (order.status === "PENDING_PARTS") {
    cardBorderClass = "border-accent/40 bg-accent-light/10";
  }

  let durationText: React.ReactNode = `${order.estimatedDurationMinutes} mins est.`;
  if (order.status === "QUEUED") {
    durationText = "Waiting for bay";
  } else if (order.status === "COMPLETED") {
    durationText = <span className="text-success font-bold">Finished</span>;
  } else if (typeof order.remainingMinutes === "number") {
    durationText = `~${order.remainingMinutes} mins left`;
  }

  return (
    <div
      className={`bg-bg-card border rounded-lg p-4 sm:p-5 shadow-xs transition-all hover:border-primary/40 flex flex-col justify-between ${cardBorderClass}`}
    >
      <div>
        {/* Top Header Row: Bay Tag & Status Badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 truncate">
            <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-bg-surface border border-border text-text-primary tracking-wide shrink-0">
              {order.bayName || "Workshop Bay"}
            </span>
            <span className="text-xs font-mono font-bold text-text-muted">
              {order.orderNumber}
            </span>
          </div>

          <span
            className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${getWorkOrderStatusBadgeClass(
              order.status
            )}`}
          >
            {formatWorkOrderStatusLabel(order.status)}
          </span>
        </div>

        {/* Vehicle & Plate Title */}
        <div className="mb-2">
          <h3 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
            {order.vehicleModel}
          </h3>
          <div className="text-xs font-semibold text-text-secondary mt-0.5 flex items-center gap-1.5">
            <span className="bg-bg-surface px-1.5 py-0.5 rounded border border-border-subtle font-mono text-[11px]">
              {order.plateNumber}
            </span>
            <span>•</span>
            <span className="truncate">{order.customerName}</span>
          </div>
        </div>

        {/* Ordered Service */}
        <div className="bg-bg-surface border border-border-subtle rounded-md p-2.5 mb-3">
          <div className="text-xs font-bold text-text-primary flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{order.serviceName}</span>
          </div>
          {order.notes && (
            <p className="text-[11px] text-text-muted mt-1 italic line-clamp-2">
              &quot;{order.notes}&quot;
            </p>
          )}
        </div>

        {/* Metadata Details Grid */}
        <div className="grid grid-cols-2 gap-2 text-[11px] text-text-secondary mb-3">
          <div className="flex items-center gap-1.5 truncate">
            <User className="w-3 h-3 text-text-muted shrink-0" />
            <span className="truncate">
              {order.mechanicName ? (
                <>
                  <strong className={isAssignedToMe ? "text-primary" : "text-text-primary"}>
                    {order.mechanicName}
                  </strong>
                  {isAssignedToMe && " (You)"}
                </>
              ) : (
                <span className="text-accent font-bold">Unassigned</span>
              )}
            </span>
          </div>

          <div className="flex items-center gap-1.5 truncate justify-end">
            <Clock className="w-3 h-3 text-text-muted shrink-0" />
            <span>{durationText}</span>
          </div>
        </div>

        {/* Parts Stock Badge Indicator */}
        {totalParts > 0 && (
          <div className="flex items-center justify-between text-[11px] p-2 rounded bg-bg-surface border border-border-subtle mb-4">
            <div className="flex items-center gap-1.5">
              <Package className="w-3.5 h-3.5 text-text-muted" />
              <span className="text-text-secondary font-medium">Parts Inventory:</span>
            </div>
            {allPartsInStock ? (
              <span className="text-success font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />
                {totalParts} in stock
              </span>
            ) : (
              <span className="text-accent font-bold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {missingParts} item low/out
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Footer Buttons */}
      <div className="pt-3 border-t border-border-subtle flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onInspect(order)}
          className="px-2.5 py-1.5 rounded text-xs font-semibold bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span>Inspect</span>
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1.5">
          {/* Claim Job Button for Unassigned Orders */}
          {isUnassigned && order.status === "QUEUED" && (
            <button
              type="button"
              disabled={isUpdating || !isTimedIn}
              onClick={() => onClaimJob(order.id)}
              title={!isTimedIn ? "You must be timed in (on shift) to claim a job" : "Claim this job"}
              className={`px-3 py-1.5 rounded text-xs font-bold shadow-xs transition-colors flex items-center gap-1 ${
                !isTimedIn
                  ? "bg-bg-muted text-text-muted border border-border cursor-not-allowed opacity-60"
                  : "bg-primary hover:bg-primary-hover text-white cursor-pointer disabled:opacity-50"
              }`}
            >
              <HandMetal className="w-3.5 h-3.5" />
              <span>Claim Job</span>
            </button>
          )}

          {/* Quick Status Action Buttons */}
          {order.status === "QUEUED" && !isUnassigned && (
            <button
              type="button"
              disabled={isUpdating}
              onClick={() => onStatusChange(order.id, "IN PROGRESS")}
              className="px-3 py-1.5 rounded text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
            >
              <Play className="w-3 h-3" />
              <span>Start Job</span>
            </button>
          )}

          {order.status === "IN PROGRESS" && (
            <>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onStatusChange(order.id, "PENDING_PARTS")}
                className="px-2.5 py-1.5 rounded text-xs font-semibold bg-accent-light text-accent hover:bg-accent/20 border border-accent/30 transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                title="Mark Waiting for Parts"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>Parts</span>
              </button>

              <button
                type="button"
                disabled={isUpdating || !isTimedIn}
                onClick={() => onStatusChange(order.id, "COMPLETED")}
                title={!isTimedIn ? "You must be timed in (on shift) to complete a job" : "Mark as Completed"}
                className={`px-3 py-1.5 rounded text-xs font-bold shadow-xs transition-colors flex items-center gap-1 ${
                  !isTimedIn
                    ? "bg-bg-muted text-text-muted border border-border cursor-not-allowed opacity-60"
                    : "bg-success hover:bg-success/90 text-white cursor-pointer disabled:opacity-50"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete</span>
              </button>
            </>
          )}

          {order.status === "PENDING_PARTS" && (
            <>
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => onStatusChange(order.id, "IN PROGRESS")}
                className="px-3 py-1.5 rounded text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3 h-3" />
                <span>Resume</span>
              </button>

              <button
                type="button"
                disabled={isUpdating || !isTimedIn}
                onClick={() => onStatusChange(order.id, "COMPLETED")}
                title={!isTimedIn ? "You must be timed in (on shift) to complete a job" : "Mark as Completed"}
                className={`px-3 py-1.5 rounded text-xs font-bold shadow-xs transition-colors flex items-center gap-1 ${
                  !isTimedIn
                    ? "bg-bg-muted text-text-muted border border-border cursor-not-allowed opacity-60"
                    : "bg-success hover:bg-success/90 text-white cursor-pointer disabled:opacity-50"
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Complete</span>
              </button>
            </>
          )}

          {order.status === "COMPLETED" && (
            <span className="px-2.5 py-1 text-[11px] font-bold text-success bg-success-light rounded border border-success/30 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Done
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
