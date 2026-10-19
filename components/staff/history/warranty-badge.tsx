import React from 'react';
import { ShieldCheck, ShieldAlert } from 'lucide-react';
import type { WarrantyStatus } from '@/lib/staff/warranty';

interface WarrantyBadgeProps {
  readonly warranty: WarrantyStatus;
  readonly className?: string;
}

export function WarrantyBadge({ warranty, className = '' }: WarrantyBadgeProps) {
  if (warranty.isValid) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-success-light text-success border border-success/30 ${className}`}
        title={`Eligible for parts return / warranty (${warranty.daysRemaining} days remaining)`}
      >
        <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
        <span>{warranty.label}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-bg-muted text-text-muted border border-border ${className}`}
      title="Outside the standard 7-day warranty window"
    >
      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
      <span>{warranty.label}</span>
    </span>
  );
}
