'use client';

import React from 'react';
import type { AttendanceSummaryMetrics } from '@/lib/types/logs';
import { UserCheck, Coffee, CheckCircle2, Clock } from 'lucide-react';

interface AttendanceKpiCardsProps {
  metrics: AttendanceSummaryMetrics;
}

export function AttendanceKpiCards({ metrics }: Readonly<AttendanceKpiCardsProps>) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* 1. Active Staff On Duty */}
      <div className="bg-bg-card border border-border-subtle rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
            Active On Duty
          </div>
          <div className="text-2xl font-black text-text-primary tracking-tight">
            {metrics.currentlyOnShift}
          </div>
          <div className="text-[11px] text-success font-medium mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
            <span>Clocked in & working</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-success/10 text-success border border-success/20 flex items-center justify-center shrink-0">
          <UserCheck className="w-5 h-5" />
        </div>
      </div>

      {/* 2. Staff on Break */}
      <div className="bg-bg-card border border-border-subtle rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
            Currently on Break
          </div>
          <div className="text-2xl font-black text-text-primary tracking-tight">
            {metrics.currentlyOnBreak}
          </div>
          <div className="text-[11px] text-accent font-medium mt-0.5 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-accent" />
            <span>Meal / rest interval</span>
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-accent/10 text-accent border border-accent/20 flex items-center justify-center shrink-0">
          <Coffee className="w-5 h-5" />
        </div>
      </div>

      {/* 3. Shifts Completed Today */}
      <div className="bg-bg-card border border-border-subtle rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
            Completed Today
          </div>
          <div className="text-2xl font-black text-text-primary tracking-tight">
            {metrics.shiftsCompletedToday}
          </div>
          <div className="text-[11px] text-text-muted font-medium mt-0.5">
            Shift end punch logged
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary border border-primary/20 flex items-center justify-center shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
      </div>

      {/* 4. Total Hours Logged Today */}
      <div className="bg-bg-card border border-border-subtle rounded-xl p-4 shadow-xs flex items-center justify-between">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-1">
            Total Hours Today
          </div>
          <div className="text-2xl font-black text-text-primary tracking-tight">
            {metrics.totalHoursLoggedToday}
          </div>
          <div className="text-[11px] text-text-muted font-medium mt-0.5">
            Cumulative store labor
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-bg-subtle text-text-primary border border-border-subtle flex items-center justify-center shrink-0">
          <Clock className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
