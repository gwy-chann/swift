'use client';

import React from 'react';
import {
  Clock,
  User,
  Phone,
  Wrench,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import type { AdminMotorRepairItem, RepairStageBadge } from '@/lib/repairs/repairs-contracts';

interface RepairMotorCardProps {
  item: AdminMotorRepairItem;
  onSelect: (item: AdminMotorRepairItem) => void;
}

function getBadgeStyles(badge: RepairStageBadge): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  switch (badge) {
    case 'In Progress':
      return {
        bg: 'bg-blue-500/10',
        text: 'text-blue-600 dark:text-blue-400',
        border: 'border-blue-500/20',
        dot: 'bg-blue-500',
      };
    case 'Waiting for Parts':
      return {
        bg: 'bg-red-500/10',
        text: 'text-red-600 dark:text-red-400',
        border: 'border-red-500/20',
        dot: 'bg-red-500',
      };
    case 'Ready for Release':
      return {
        bg: 'bg-emerald-500/10',
        text: 'text-emerald-600 dark:text-emerald-400',
        border: 'border-emerald-500/20',
        dot: 'bg-emerald-500',
      };
    case 'Pending':
    default:
      return {
        bg: 'bg-amber-500/10',
        text: 'text-amber-600 dark:text-amber-400',
        border: 'border-amber-500/20',
        dot: 'bg-amber-500',
      };
  }
}

function renderTimingStatus(item: AdminMotorRepairItem, isOverdue: boolean, remainingMins: number) {
  if (isOverdue) {
    return (
      <span className="text-red-500 font-bold flex items-center gap-0.5">
        <AlertCircle className="w-3 h-3" /> Overdue
      </span>
    );
  }
  if (item.status === 'COMPLETED') {
    return (
      <span className="text-emerald-500 font-bold flex items-center gap-0.5">
        <CheckCircle2 className="w-3 h-3" /> Released
      </span>
    );
  }
  return <span>~{remainingMins}m est. remaining</span>;
}

export function RepairMotorCard({ item, onSelect }: Readonly<RepairMotorCardProps>) {
  const badgeStyle = getBadgeStyles(item.stageBadge);
  const remainingMins = item.remainingMinutes ?? Math.max(0, item.estimatedDurationMinutes - item.elapsedMinutes);
  const isOverdue = item.status === 'IN PROGRESS' && item.elapsedMinutes > item.estimatedDurationMinutes;

  return (
    <div
      onClick={() => onSelect(item)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(item);
        }
      }}
      tabIndex={0}
      role="button"
      className="group relative bg-bg-surface border border-border-subtle hover:border-primary/50 rounded-xl p-5 shadow-xs hover:shadow-md transition-all duration-200 cursor-pointer flex flex-col justify-between text-left focus:outline-hidden focus:ring-2 focus:ring-primary/20"
    >
      {/* Header: Vehicle Plate & Stage Badge */}
      <div>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-black text-text-primary group-hover:text-primary transition-colors tracking-tight">
                {item.plateNumber}
              </span>
              <span className="text-[11px] font-mono text-text-muted px-1.5 py-0.5 rounded bg-bg-base border border-border-subtle">
                {item.chassisNumber}
              </span>
            </div>
            <div className="text-sm font-bold text-text-secondary mt-0.5">
              {item.vehicleModel}
            </div>
          </div>

          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${badgeStyle.bg} ${badgeStyle.text} ${badgeStyle.border}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${badgeStyle.dot} ${item.status === 'IN PROGRESS' ? 'animate-pulse' : ''}`} />
            {item.stageBadge}
          </span>
        </div>

        {/* Customer & Bay Strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-text-secondary mt-3 pt-3 border-t border-border-subtle/60">
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-text-muted" />
            <span className="font-semibold text-text-primary">{item.customerName}</span>
          </div>
          {item.customerPhone && (
            <div className="flex items-center gap-1.5 text-text-muted">
              <Phone className="w-3 h-3" />
              <span>{item.customerPhone}</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-bg-base border border-border-subtle text-text-secondary">
              {item.bayName || 'Unassigned Bay'}
            </span>
          </div>
        </div>

        {/* Service Title & Primary Complaint */}
        <div className="mt-3 space-y-1.5 bg-bg-base/70 p-3 rounded-lg border border-border-subtle/50">
          <div className="flex items-center gap-1.5 text-xs font-bold text-text-primary">
            <Wrench className="w-3.5 h-3.5 text-primary shrink-0" />
            <span className="truncate">{item.serviceName}</span>
          </div>
          {item.notes && (
            <div className="text-xs text-text-muted line-clamp-2 italic">
              &quot;{item.notes}&quot;
            </div>
          )}
        </div>
      </div>

      {/* Footer: Mechanic & Time Progress */}
      <div className="mt-4 pt-3 border-t border-border-subtle/60 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-[10px]">
            {item.mechanicName ? item.mechanicName.charAt(0) : '?'}
          </div>
          <div>
            <div className="text-[10px] uppercase font-bold text-text-muted tracking-wider">
              Technician
            </div>
            <div className="font-semibold text-text-primary truncate max-w-[120px]">
              {item.mechanicName || (
                <span className="text-amber-600 dark:text-amber-400 font-bold">Unassigned</span>
              )}
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="flex items-center gap-1 justify-end font-semibold text-text-primary">
            <Clock className="w-3.5 h-3.5 text-text-muted" />
            <span>{item.elapsedMinutes}m elapsed</span>
          </div>
          <div className="text-[10px] text-text-muted mt-0.5">
            {renderTimingStatus(item, isOverdue, remainingMins)}
          </div>
        </div>
      </div>
    </div>
  );
}
