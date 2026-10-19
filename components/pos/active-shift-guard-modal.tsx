'use client';

import React, { useEffect, useCallback } from 'react';
import { Clock, ArrowRight, X, AlertCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ShiftStateStatus } from '@/lib/store/punch-store';

export interface ActiveShiftGuardModalProps {
  isOpen: boolean;
  shiftStatus?: ShiftStateStatus;
  currentStaff?: string | null;
  onClose: () => void;
}

export function ActiveShiftGuardModal({
  isOpen,
  shiftStatus = 'idle',
  currentStaff,
  onClose
}: Readonly<ActiveShiftGuardModalProps>) {
  const router = useRouter();

  const handleNavigateToClock = useCallback(() => {
    onClose();
    router.push('/staff/clock');
  }, [onClose, router]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  let title = 'Active Shift Required';
  let description =
    'You must clock in / time in before processing customer orders. All completed sales and inventory decrements must be attributed to an active cashier on duty.';

  if (shiftStatus === 'break') {
    title = 'Shift Currently on Break';
    description =
      'Your shift is currently paused on break. Cashiers must resume their active shift before processing customer sales.';
  } else if (shiftStatus === 'completed') {
    description =
      'Your previous shift has ended. Please clock in for a new shift to resume ringing up customer sales.';
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="active-shift-guard-title"
      aria-describedby="active-shift-guard-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="w-full max-w-md bg-bg-surface border border-border rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Modal Header */}
        <div className="p-4 border-b border-border bg-warning/15 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-warning/20 text-warning">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 id="active-shift-guard-title" className="text-sm font-extrabold text-text-primary">
                {title}
              </h3>
              <p className="text-[11px] text-warning font-semibold">
                Staff Accountability &amp; Sales Attribution Guard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close active shift guard modal"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-bg-base border border-border">
            <AlertCircle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p id="active-shift-guard-description" className="text-xs text-text-secondary leading-relaxed">
                {description}
              </p>
              {currentStaff && (
                <p className="text-[11px] text-text-muted">
                  Logged in staff: <span className="font-semibold text-text-primary">{currentStaff}</span>
                </p>
              )}
            </div>
          </div>

          <div className="text-[11px] text-text-muted bg-bg-surface/50 p-2.5 rounded-lg border border-border-subtle">
            💡 <span className="font-medium">Shift Time-In Requirement:</span> Transactions cannot be settled without an accountable on-duty employee. Navigate to the Punch Clock to record your shift punch.
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-semibold bg-bg-base hover:bg-bg-hover text-text-secondary border border-border transition-colors cursor-pointer"
            >
              Dismiss
            </button>
            <button
              type="button"
              data-testid="time-in-punch-clock-button"
              onClick={handleNavigateToClock}
              className="flex-1 py-2.5 px-4 rounded-xl text-xs font-extrabold bg-primary hover:bg-primary-hover text-text-light shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Go to Punch Clock</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
