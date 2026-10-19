'use client';

import React, { useEffect } from 'react';
import { ShieldAlert, X, KeyRound, AlertTriangle, ArrowLeft } from 'lucide-react';

export interface UnauthorizedRoleModalProps {
  isOpen: boolean;
  currentStaff?: string | null;
  currentStaffRole?: string | null;
  onClose: () => void;
  onRequestOverride: () => void;
}

function formatRoleTitle(role?: string | null): string {
  if (!role) return 'Non-Cashier Profile';
  switch (role.toLowerCase()) {
    case 'mechanic':
      return 'Shop Floor Mechanic';
    case 'inventory_clerk':
      return 'Warehouse Inventory Clerk';
    case 'staff':
      return 'Floor Staff Member';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

export function UnauthorizedRoleModal({
  isOpen,
  currentStaff,
  currentStaffRole,
  onClose,
  onRequestOverride,
}: Readonly<UnauthorizedRoleModalProps>) {
  // Handle Escape key to dismiss
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

  const roleDisplay = formatRoleTitle(currentStaffRole);
  const operatorName = currentStaff?.trim() || 'Floor Employee';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="unauthorized-role-title"
      aria-describedby="unauthorized-role-description"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
    >
      <div className="w-full max-w-md bg-bg-surface border border-danger/40 rounded-2xl shadow-2xl overflow-hidden animate-scaleIn">
        {/* Modal Header */}
        <div className="p-4 border-b border-border bg-danger/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-danger/20 text-danger">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 id="unauthorized-role-title" className="text-sm font-extrabold text-text-primary">
                Access Restricted: Cashier Only
              </h3>
              <p className="text-[11px] text-danger font-semibold">
                Cash Drawer Segregation &amp; Accountability Guard
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close restricted checkout modal"
            className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4">
          {/* Active Operator Banner */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-bg-card border border-border">
            <div>
              <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider block">
                Current Terminal Operator
              </span>
              <span className="text-sm font-extrabold text-text-primary">
                {operatorName}
              </span>
            </div>
            <span className="inline-flex items-center text-xs font-bold text-danger bg-danger/10 px-2.5 py-1 rounded-full border border-danger/30">
              {roleDisplay}
            </span>
          </div>

          {/* Restriction Notice */}
          <div className="flex items-start gap-3 p-3.5 rounded-xl bg-bg-base border border-border">
            <AlertTriangle className="w-5 h-5 text-danger shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p id="unauthorized-role-description" className="text-xs text-text-primary font-medium leading-relaxed">
                Access Restricted: Only active Cashiers or Store Managers can process sales and accept payments.
              </p>
              <p className="text-[11px] text-text-muted leading-relaxed">
                Floor mechanics and warehouse inventory clerks cannot punch orders or tender cash from the shared terminal. You may continue adding parts to the customer cart, but checkout must be finalized by an authorized cashier.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border bg-bg-card/50 flex flex-col sm:flex-row items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border bg-bg-surface hover:bg-bg-hover text-text-secondary text-xs font-bold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Return to Cart</span>
          </button>
          <button
            type="button"
            onClick={onRequestOverride}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Request Manager Override</span>
          </button>
        </div>
      </div>
    </div>
  );
}
