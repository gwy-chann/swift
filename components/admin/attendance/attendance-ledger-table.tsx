'use client';

import React from 'react';
import type { AdminStaffShift } from '@/lib/types/logs';
import { Clock, AlertTriangle, Monitor, RotateCcw } from 'lucide-react';

interface AttendanceLedgerTableProps {
  shifts: AdminStaffShift[];
  onResetFilters?: () => void;
  hasActiveFilters?: boolean;
}

export function AttendanceLedgerTable({
  shifts,
  onResetFilters,
  hasActiveFilters,
}: Readonly<AttendanceLedgerTableProps>) {
  if (shifts.length === 0) {
    return (
      <div className="bg-bg-card border border-border-subtle rounded-xl p-12 text-center shadow-xs">
        <div className="w-12 h-12 rounded-full bg-bg-subtle text-text-muted flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-text-primary mb-1">
          No Attendance Records Found
        </h3>
        <p className="text-xs text-text-muted max-w-sm mx-auto mb-5">
          {hasActiveFilters
            ? 'No staff shifts match the selected filters or search criteria.'
            : 'There are currently no staff shift records logged in the system.'}
        </p>
        {hasActiveFilters && onResetFilters && (
          <button
            type="button"
            onClick={onResetFilters}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-lg bg-primary text-white hover:bg-primary-hover transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All Filters</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-border-subtle bg-bg-subtle/50 text-text-muted font-bold uppercase tracking-wider text-[10px]">
              <th scope="col" className="py-3 px-4">Staff Member</th>
              <th scope="col" className="py-3 px-4">Shift Date</th>
              <th scope="col" className="py-3 px-4">Time In</th>
              <th scope="col" className="py-3 px-4">Time Out</th>
              <th scope="col" className="py-3 px-4">Duration</th>
              <th scope="col" className="py-3 px-4">Terminal</th>
              <th scope="col" className="py-3 px-4 text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle/50">
            {shifts.map((shift) => {
              const isActive = shift.status === 'on_shift';
              const isOnBreak = shift.status === 'break';
              const isCompleted = shift.status === 'completed';

              return (
                <tr
                  key={shift.id}
                  className="hover:bg-bg-subtle/30 transition-colors group"
                >
                  {/* Staff Member */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-primary/10 text-primary border border-primary/20 flex items-center justify-center font-bold text-[11px] shrink-0">
                        {shift.staffName.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-text-primary group-hover:text-primary transition-colors">
                          {shift.staffName}
                        </div>
                        <div className="text-[10px] text-text-muted">
                          {shift.staffRole || 'Store Staff'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Shift Date */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="flex items-center gap-1.5 font-medium text-text-primary">
                      <span>{shift.date}</span>
                      {shift.isToday && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/15 text-primary border border-primary/30 uppercase tracking-tight">
                          Today
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Time In */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-text-primary">
                    {shift.timeIn}
                  </td>

                  {/* Time Out */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    {isActive || isOnBreak ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                        <span>-- Active Shift --</span>
                      </span>
                    ) : (
                      <span className="font-mono text-[11px] text-text-primary">
                        {shift.timeOut}
                      </span>
                    )}
                  </td>

                  {/* Duration */}
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px]">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          isActive
                            ? 'text-success font-bold'
                            : isOnBreak
                            ? 'text-accent font-bold'
                            : 'text-text-primary font-medium'
                        }
                      >
                        {shift.duration}
                      </span>
                      {shift.isExtendedShift && (
                        <span
                          title="Extended Shift: Exceeds 16 hours continuous duration"
                          className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[9px] font-bold bg-danger/15 text-danger border border-danger/30"
                        >
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>16h+</span>
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Terminal Station */}
                  <td className="py-3 px-4 whitespace-nowrap text-text-muted text-[11px]">
                    <div className="flex items-center gap-1">
                      <Monitor className="w-3.5 h-3.5 text-text-muted/70 shrink-0" />
                      <span>{shift.terminalId}</span>
                    </div>
                  </td>

                  {/* Status Badge */}
                  <td className="py-3 px-4 whitespace-nowrap text-center">
                    {isActive && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-success/15 text-success border border-success/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-success animate-ping" />
                        <span>On Shift</span>
                      </span>
                    )}
                    {isOnBreak && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-accent/15 text-accent border border-accent/30">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent" />
                        <span>Break</span>
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-bg-subtle text-text-muted border border-border-subtle">
                        Completed
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Footer Summary */}
      <div className="p-3 border-t border-border-subtle bg-bg-subtle/30 flex items-center justify-between text-[11px] text-text-muted">
        <div>
          Showing <span className="font-bold text-text-primary">{shifts.length}</span> recorded shift{shifts.length === 1 ? '' : 's'}
        </div>
        <div className="text-[10px]">
          Time-in and Time-out recorded in Store Local Time
        </div>
      </div>
    </div>
  );
}
