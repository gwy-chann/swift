'use client';

import React, { useState } from 'react';
import {
  X,
  Clock,
  Wrench,
  CheckCircle2,
  Circle,
  PackageCheck,
  UserCheck,
  Send,
  Loader2,
  ShieldAlert,
} from 'lucide-react';
import type { AdminMotorRepairItem } from '@/lib/repairs/repairs-contracts';

interface OnShiftMechanicOption {
  id: string;
  name: string;
  status: string;
}

interface RepairInspectionDrawerProps {
  item: AdminMotorRepairItem | null;
  isOpen: boolean;
  onClose: () => void;
  availableMechanics: OnShiftMechanicOption[];
  onReassignMechanic: (
    workOrderId: string,
    orderNumber: string,
    mechanicId: string,
    mechanicName: string,
    bayId?: string | null,
    reason?: string
  ) => Promise<boolean>;
}

export function RepairInspectionDrawer({
  item,
  isOpen,
  onClose,
  availableMechanics,
  onReassignMechanic,
}: Readonly<RepairInspectionDrawerProps>) {
  const [selectedMechanicId, setSelectedMechanicId] = useState<string>('');
  const [reassignReason, setReassignReason] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !item) {
    return null;
  }

  const tasks = item.laborTasks || [];
  const parts = item.requiredParts || [];
  const completedTasksCount = tasks.filter((t) => t.completed).length;
  const taskProgressPercent = tasks.length > 0 ? Math.round((completedTasksCount / tasks.length) * 100) : 0;

  async function handleConfirmReassignment() {
    if (!selectedMechanicId || !item) return;
    const targetMech = availableMechanics.find((m) => m.id === selectedMechanicId);
    if (!targetMech) return;

    setIsSubmitting(true);
    setFeedbackMessage(null);

    try {
      const success = await onReassignMechanic(
        item.id,
        item.orderNumber,
        targetMech.id,
        targetMech.name,
        item.bayId,
        reassignReason || 'Workshop supervisory load balancing'
      );

      if (success) {
        setFeedbackMessage({
          type: 'success',
          text: `Successfully reassigned to ${targetMech.name}. System audit log updated.`,
        });
        setSelectedMechanicId('');
        setReassignReason('');
      } else {
        setFeedbackMessage({
          type: 'error',
          text: 'Failed to complete mechanic reassignment.',
        });
      }
    } catch {
      setFeedbackMessage({
        type: 'error',
        text: 'An unexpected error occurred during reassignment.',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      {/* Dimmed Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-300"
        aria-hidden="true"
      />

      {/* Slide-over Inspection Panel */}
      <div className="relative w-full max-w-2xl bg-bg-surface border-l border-border-subtle h-full shadow-2xl flex flex-col z-10 overflow-hidden">
        {/* Drawer Header */}
        <div className="p-5 border-b border-border-subtle bg-bg-base flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-sm">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-text-primary tracking-tight">
                  {item.plateNumber}
                </h2>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-bg-surface border border-border-subtle text-text-muted">
                  {item.chassisNumber}
                </span>
              </div>
              <div className="text-xs font-semibold text-text-secondary mt-0.5">
                {item.vehicleModel} &bull; Work Order #{item.orderNumber}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-surface border border-transparent hover:border-border-subtle transition-colors"
            title="Close Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Customer & Location Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-bg-base border border-border-subtle text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Customer Name
              </span>
              <span className="font-bold text-text-primary mt-0.5 block">{item.customerName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Phone Contact
              </span>
              <span className="font-semibold text-text-primary mt-0.5 block">
                {item.customerPhone || 'None Provided'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">
                Assigned Service Bay
              </span>
              <span className="font-semibold text-primary mt-0.5 block">
                {item.bayName || 'Unassigned'}
              </span>
            </div>
          </div>

          {/* Section: Live Technician Status & Punch Duration */}
          <div className="p-4 rounded-xl border border-border-subtle bg-bg-base/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-4 h-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                  Assigned Technician
                </span>
              </div>
              <span className="text-xs font-semibold text-text-secondary">
                {item.mechanicName || 'Unassigned Job'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-border-subtle/60">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-text-muted" />
                <div>
                  <div className="text-[10px] text-text-muted">Elapsed Time on Job</div>
                  <div className="font-bold text-text-primary">{item.elapsedMinutes} mins</div>
                </div>
              </div>
              <div>
                <div className="text-[10px] text-text-muted">Target Service Duration</div>
                <div className="font-bold text-text-primary">
                  {item.estimatedDurationMinutes} mins estimated
                </div>
              </div>
            </div>
          </div>

          {/* Section: Diagnostic & Mechanical Task Checklist */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                Diagnostic & Service Checklist ({completedTasksCount}/{tasks.length})
              </h3>
              <span className="text-xs font-bold text-text-primary">{taskProgressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-bg-base h-2 rounded-full overflow-hidden border border-border-subtle">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${taskProgressPercent}%` }}
              />
            </div>

            {/* Task Items */}
            <div className="space-y-2">
              {tasks.length > 0 ? (
                tasks.map((task) => (
                  <div
                    key={task.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border text-xs transition-colors ${
                      task.completed
                        ? 'bg-emerald-500/5 border-emerald-500/20 text-text-primary'
                        : 'bg-bg-base border-border-subtle text-text-secondary'
                    }`}
                  >
                    {task.completed ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    ) : (
                      <Circle className="w-4 h-4 text-text-muted shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <div className={task.completed ? 'line-through text-text-muted' : 'font-medium'}>
                        {task.description}
                      </div>
                      {task.notes && (
                        <div className="text-[11px] text-text-muted mt-1 italic">
                          Notes: {task.notes}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-xs text-text-muted italic p-3 bg-bg-base rounded-lg border border-border-subtle">
                  No individual labor checklist items defined for this job.
                </div>
              )}
            </div>
          </div>

          {/* Section: Billed Parts & Inventory Replenishment */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-blue-500" />
              Installed Parts & Consumables ({parts.length})
            </h3>

            {parts.length > 0 ? (
              <div className="space-y-2">
                {parts.map((part) => (
                  <div
                    key={part.sku}
                    className="p-3 rounded-lg bg-bg-base border border-border-subtle flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-text-primary">{part.partName}</div>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-text-muted">
                        <span className="font-mono">{part.sku}</span>
                        <span>&bull;</span>
                        <span className="text-text-secondary">Location: {part.shelfLocation}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-text-primary">Qty: {part.quantityNeeded}</div>
                      <div className="mt-1">
                        {part.isAvailable ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            In Stock ({part.stockAvailable})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20">
                            Out of Stock
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-text-muted italic p-3 bg-bg-base rounded-lg border border-border-subtle">
                No inventory parts billed on this work order.
              </div>
            )}
          </div>

          {/* Section: Mechanic Floor Notes & Observations */}
          <div className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-text-muted">
              Diagnostic Notes & Observations
            </h3>
            <div className="p-4 rounded-xl bg-bg-base border border-border-subtle text-xs text-text-secondary leading-relaxed">
              {item.notes ? (
                <p>&ldquo;{item.notes}&rdquo;</p>
              ) : (
                <p className="text-text-muted italic">No floor observations recorded yet.</p>
              )}
            </div>
          </div>

          {/* Section: Admin Mechanic Reassignment & Bottleneck Escalation */}
          <div className="p-4 rounded-xl border border-primary/30 bg-primary/5 space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-primary uppercase tracking-wider">
              <ShieldAlert className="w-4 h-4" />
              <span>Admin Live Mechanic Reassignment</span>
            </div>

            <p className="text-xs text-text-secondary">
              Reassign this job to balance workload or escalate stalled bay bottlenecks. The action
              is immediately synced across technician terminals and logged in the audit ledger.
            </p>

            {feedbackMessage && (
              <div
                className={`p-3 rounded-lg text-xs font-medium border ${
                  feedbackMessage.type === 'success'
                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                    : 'bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/30'
                }`}
              >
                {feedbackMessage.text}
              </div>
            )}

            <div className="space-y-3 pt-1">
              <div>
                <label
                  htmlFor="mechanic-select"
                  className="block text-[11px] font-bold uppercase text-text-muted mb-1"
                >
                  Select On-Shift Mechanic
                </label>
                <select
                  id="mechanic-select"
                  value={selectedMechanicId}
                  onChange={(e) => setSelectedMechanicId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-subtle text-xs text-text-primary focus:outline-hidden focus:border-primary"
                >
                  <option value="">-- Choose on-shift technician --</option>
                  {availableMechanics.map((mech) => (
                    <option key={mech.id} value={mech.id}>
                      {mech.name} ({mech.status === 'on_shift' ? 'Active On Shift' : 'Clocked In'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="reassign-reason"
                  className="block text-[11px] font-bold uppercase text-text-muted mb-1"
                >
                  Reassignment Reason (Audit Log)
                </label>
                <input
                  id="reassign-reason"
                  type="text"
                  value={reassignReason}
                  onChange={(e) => setReassignReason(e.target.value)}
                  placeholder="e.g. Bottleneck escalation, technician specialist required"
                  className="w-full px-3 py-2 rounded-lg bg-bg-surface border border-border-subtle text-xs text-text-primary focus:outline-hidden focus:border-primary"
                />
              </div>

              <button
                type="button"
                disabled={!selectedMechanicId || isSubmitting}
                onClick={handleConfirmReassignment}
                className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary-hover disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Reassigning Work Order...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Confirm Technician Reassignment</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
