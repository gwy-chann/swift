"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Wrench,
  User,
  Phone,
  Clock,
  MapPin,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  PackageCheck,
  PackageX,
  Play,
} from "lucide-react";
import type { DetailedWorkOrder } from "@/lib/types/workshop";
import type { WorkOrderStatus } from "@/lib/types/service";
import type { OnShiftMechanic } from "@/lib/workshop/intake-dispatch-contracts";
import { fetchOnShiftMechanicsAction } from "@/lib/workshop/workshop-actions";
import {
  formatWorkOrderStatusLabel,
  getWorkOrderStatusBadgeClass,
} from "@/lib/services/service-bay-queue";

interface WorkOrderDetailDrawerProps {
  order: DetailedWorkOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange: (orderId: string, newStatus: WorkOrderStatus) => void;
  isUpdating?: boolean;
  isAdmin?: boolean;
  isTimedIn?: boolean;
  availableMechanics?: OnShiftMechanic[];
  onAssignMechanic?: (orderId: string, mechanicId: string, mechanicName: string) => void | Promise<void>;
}

export function WorkOrderDetailDrawer({
  order,
  isOpen,
  onClose,
  onStatusChange,
  isUpdating = false,
  isAdmin = false,
  isTimedIn = true,
  availableMechanics: initialMechanics,
  onAssignMechanic,
}: Readonly<WorkOrderDetailDrawerProps>) {
  const [completedTasks, setCompletedTasks] = useState<Record<string, boolean>>({});
  const [onShiftMechanics, setOnShiftMechanics] = useState<OnShiftMechanic[]>(
    initialMechanics || []
  );
  const [prevInitialMechanics, setPrevInitialMechanics] = useState(initialMechanics);

  if (initialMechanics !== prevInitialMechanics) {
    setPrevInitialMechanics(initialMechanics);
    if (initialMechanics && initialMechanics.length > 0) {
      setOnShiftMechanics(initialMechanics);
    }
  }

  useEffect(() => {
    let ignore = false;
    if (isOpen && isAdmin && onShiftMechanics.length === 0) {
      void fetchOnShiftMechanicsAction().then((res) => {
        if (!ignore && res.success && res.data) {
          setOnShiftMechanics(res.data);
        }
      });
    }
    return () => {
      ignore = true;
    };
  }, [isOpen, isAdmin, onShiftMechanics.length]);

  if (!isOpen || !order) return null;

  function toggleTask(taskId: string) {
    setCompletedTasks((prev) => ({
      ...prev,
      [taskId]: !prev[taskId],
    }));
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        className="w-full max-w-lg bg-bg-card border-l border-border h-full shadow-2xl flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="drawer-title"
      >
        {/* Drawer Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-bg-surface flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-md bg-secondary flex items-center justify-center text-white shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="truncate">
              <h2 id="drawer-title" className="text-sm sm:text-base font-bold text-text-primary truncate">
                {order.orderNumber} • {order.vehicleModel}
              </h2>
              <div className="text-xs text-text-muted font-mono">{order.plateNumber}</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${getWorkOrderStatusBadgeClass(
                order.status
              )}`}
            >
              {formatWorkOrderStatusLabel(order.status)}
            </span>
            <button
              type="button"
              onClick={onClose}
              className="w-8 h-8 rounded flex items-center justify-center text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
              aria-label="Close details"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Drawer Body - Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5">
          {/* Section 1: Vehicle & Customer Profile */}
          <div className="bg-bg-surface border border-border rounded-lg p-3.5 space-y-2.5">
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted border-b border-border-subtle pb-1.5 flex items-center justify-between">
              <span>Customer & Vehicle Profile</span>
              <span className="text-primary font-mono text-[11px] font-bold">{order.bayName}</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-text-muted text-[11px] block">Customer</span>
                <span className="font-bold text-text-primary flex items-center gap-1 mt-0.5">
                  <User className="w-3 h-3 text-text-muted" />
                  {order.customerName}
                </span>
              </div>

              <div>
                <span className="text-text-muted text-[11px] block">Contact Number</span>
                <span className="font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                  <Phone className="w-3 h-3 text-text-muted" />
                  {order.customerPhone || "N/A"}
                </span>
              </div>

              <div>
                <span className="text-text-muted text-[11px] block">Assigned Mechanic</span>
                {isAdmin ? (
                  <div className="mt-1">
                    <select
                      aria-label="Assign Mechanic"
                      value={order.mechanicId || ""}
                      onChange={(e) => {
                        const targetId = e.target.value;
                        const targetMech = onShiftMechanics.find((m) => m.id === targetId);
                        if (targetMech && onAssignMechanic) {
                          onAssignMechanic(order.id, targetMech.id, targetMech.name);
                        }
                      }}
                      disabled={isUpdating || onShiftMechanics.length === 0}
                      className="w-full text-xs font-semibold rounded-md bg-bg-surface border border-border px-2 py-1 text-text-primary focus:border-primary focus:ring-1 focus:ring-primary/20 transition-colors"
                    >
                      <option value="" disabled>
                        {order.mechanicName ? `${order.mechanicName}` : "Assign on-shift mechanic..."}
                      </option>
                      {onShiftMechanics.map((mech) => (
                        <option key={mech.id} value={mech.id}>
                          {mech.name} (On Shift)
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <span className="font-bold text-text-primary flex items-center gap-1 mt-0.5">
                    <Wrench className="w-3 h-3 text-primary" />
                    {order.mechanicName || "Unassigned"}
                  </span>
                )}
              </div>

              <div>
                <span className="text-text-muted text-[11px] block">Estimated Duration</span>
                <span className="font-semibold text-text-primary flex items-center gap-1 mt-0.5">
                  <Clock className="w-3 h-3 text-text-muted" />
                  {order.estimatedDurationMinutes} Minutes
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Intake Notes */}
          {order.notes && (
            <div className="bg-accent-light/20 border border-accent/30 rounded-lg p-3.5">
              <div className="text-xs font-bold uppercase tracking-wider text-accent flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                <span>Customer Complaints & Intake Notes</span>
              </div>
              <p className="text-xs text-text-primary leading-relaxed font-medium">
                {order.notes}
              </p>
            </div>
          )}

          {/* Section 3: Diagnostic / Labor Checklist */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center justify-between">
              <span>Diagnostic & Labor Checklist</span>
              <span className="text-[11px] text-text-muted lowercase">
                {order.laborTasks?.length ?? 0} service tasks
              </span>
            </div>

            <div className="divide-y divide-border border border-border rounded-lg bg-bg-surface overflow-hidden">
              {order.laborTasks && order.laborTasks.length > 0 ? (
                order.laborTasks.map((task) => {
                  const isChecked = completedTasks[task.id] ?? task.completed;
                  return (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => toggleTask(task.id)}
                      className="w-full px-3.5 py-2.5 flex items-start gap-2.5 text-left hover:bg-bg-hover transition-colors cursor-pointer"
                    >
                      {isChecked ? (
                        <CheckSquare className="w-4 h-4 text-success mt-0.5 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                      )}
                      <span
                        className={`text-xs ${
                          isChecked ? "line-through text-text-muted" : "text-text-primary font-medium"
                        }`}
                      >
                        {task.description}
                      </span>
                    </button>
                  );
                })
              ) : (
                <div className="p-3 text-xs text-text-muted text-center">
                  Standard factory maintenance checklist applied.
                </div>
              )}
            </div>
          </div>

          {/* Section 4: Required Replacement Parts with Live Stock & Shelf Locator */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-text-muted mb-2 flex items-center justify-between">
              <span>Required Replacement Parts</span>
              <span className="text-[11px] text-text-muted lowercase">
                {order.requiredParts?.length ?? 0} line items
              </span>
            </div>

            <div className="space-y-2">
              {order.requiredParts && order.requiredParts.length > 0 ? (
                order.requiredParts.map((part) => (
                  <div
                    key={part.sku}
                    className="p-3 rounded-lg border border-border bg-bg-surface flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-bold text-text-primary flex items-center gap-2">
                        <span>{part.partName}</span>
                        <span className="font-mono text-[10px] text-text-muted">({part.sku})</span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-text-secondary">
                        <span className="flex items-center gap-1 font-medium bg-bg-base px-1.5 py-0.5 rounded border border-border-subtle">
                          <MapPin className="w-3 h-3 text-primary" />
                          {part.shelfLocation}
                        </span>
                        <span>•</span>
                        <span>Qty Needed: <strong>{part.quantityNeeded}</strong></span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {part.isAvailable ? (
                        <div className="flex flex-col items-end">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-success-light text-success border border-success/30 flex items-center gap-1">
                            <PackageCheck className="w-3 h-3" />
                            In Stock
                          </span>
                          <span className="text-[10px] text-text-muted mt-0.5">
                            {part.stockAvailable} avail
                          </span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-end">
                          <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-danger-light text-danger border border-danger/30 flex items-center gap-1">
                            <PackageX className="w-3 h-3" />
                            Low / Out
                          </span>
                          <span className="text-[10px] text-danger font-bold mt-0.5">
                            {part.stockAvailable} in store
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 border border-dashed border-border rounded-lg text-center text-xs text-text-muted">
                  No replacement parts billed. Pure labor service package.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Drawer Action Footer */}
        <div className="p-4 border-t border-border bg-bg-surface flex items-center justify-between gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 rounded text-xs font-semibold bg-bg-surface hover:bg-bg-hover text-text-secondary border border-border transition-colors cursor-pointer"
          >
            Close Details
          </button>

          <div className="flex items-center gap-2">
            {order.status === "QUEUED" && (
              <button
                type="button"
                disabled={isUpdating}
                onClick={() => {
                  onStatusChange(order.id, "IN PROGRESS");
                  onClose();
                }}
                className="px-4 py-2 rounded text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Start Job</span>
              </button>
            )}

            {order.status === "IN PROGRESS" && (
              <>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => {
                    onStatusChange(order.id, "PENDING_PARTS");
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded text-xs font-semibold bg-accent-light text-accent hover:bg-accent/20 border border-accent/30 transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Wait for Parts</span>
                </button>

                <button
                  type="button"
                  disabled={isUpdating || !isTimedIn}
                  onClick={() => {
                    onStatusChange(order.id, "COMPLETED");
                    onClose();
                  }}
                  title={!isTimedIn ? "You must be timed in (on shift) to complete a job" : "Complete Service"}
                  className={`px-4 py-2 rounded text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 ${
                    !isTimedIn
                      ? "bg-bg-muted text-text-muted border border-border cursor-not-allowed opacity-60"
                      : "bg-success hover:bg-success/90 text-white cursor-pointer disabled:opacity-50"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Service</span>
                </button>
              </>
            )}

            {order.status === "PENDING_PARTS" && (
              <>
                <button
                  type="button"
                  disabled={isUpdating}
                  onClick={() => {
                    onStatusChange(order.id, "IN PROGRESS");
                    onClose();
                  }}
                  className="px-3.5 py-2 rounded text-xs font-bold bg-primary hover:bg-primary-hover text-white shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <Play className="w-3.5 h-3.5" />
                  <span>Resume Work</span>
                </button>

                <button
                  type="button"
                  disabled={isUpdating || !isTimedIn}
                  onClick={() => {
                    onStatusChange(order.id, "COMPLETED");
                    onClose();
                  }}
                  title={!isTimedIn ? "You must be timed in (on shift) to complete a job" : "Complete Service"}
                  className={`px-4 py-2 rounded text-xs font-bold shadow-xs transition-colors flex items-center gap-1.5 ${
                    !isTimedIn
                      ? "bg-bg-muted text-text-muted border border-border cursor-not-allowed opacity-60"
                      : "bg-success hover:bg-success/90 text-white cursor-pointer disabled:opacity-50"
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Complete Service</span>
                </button>
              </>
            )}

            {order.status === "COMPLETED" && (
              <span className="px-3 py-1.5 text-xs font-bold text-success bg-success-light rounded border border-success/30 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Service Finished
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
