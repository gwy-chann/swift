"use client";

import React, { useEffect } from "react";
import { PunchClockPanel } from "@/components/staff/clock/punch-clock-panel";
import { usePunchStore } from "@/lib/store/punch-store";
import { useStaffRealtimeShifts } from "@/lib/hooks/use-staff-realtime-shifts";
import { getStaffAttendanceHistoryAction } from "@/lib/staff/actions";
import { Calendar, UserCheck } from "lucide-react";
import type { PunchLog } from "@/lib/types/logs";

function renderClockOutCell(log: PunchLog) {
  if (log.status === "On Shift" || log.status === "on_shift") {
    return <span className="text-success font-semibold">— (In Progress)</span>;
  }
  if (log.status === "Break" || log.status === "break") {
    return <span className="text-accent font-semibold">— (On Break)</span>;
  }
  return log.timeOut;
}

function getStatusBadgeStyle(status: string): string {
  if (status === "On Shift" || status === "on_shift") {
    return "bg-success-light text-success";
  }
  if (status === "Break" || status === "break") {
    return "bg-accent-light text-accent";
  }
  return "bg-bg-muted text-text-secondary";
}

export default function StaffClockPage() {
  const { punchLogs, rehydrateShift } = usePunchStore();

  // SIAA-63: CDC Realtime Synchronization across all shop floor terminals
  useStaffRealtimeShifts();

  // Initial attendance timesheet history hydration
  useEffect(() => {
    let isMounted = true;
    getStaffAttendanceHistoryAction()
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          rehydrateShift(res.activeShift, res.logs);
        }
      })
      .catch((err) => {
        console.warn("Failed to refresh attendance history:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [rehydrateShift]);

  return (
    <section
      id="view-staff-clock"
      aria-label="Staff Punch Clock & Time Logging Station"
      className="view-section space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200"
    >
      {/* 1. Interactive Terminal Digital Time Clock & Punch Actions */}
      <PunchClockPanel />

      {/* 2. Staff Shift Attendance Log History & Timesheet */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Recent Shift History (This Week)
            </h4>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-muted">
            <UserCheck className="w-3.5 h-3.5 text-success" />
            <span className="font-mono text-[11px]">Synced with Attendance Log</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bg-base/60 text-text-muted font-bold border-b border-border">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4">Total Duration</th>
                <th className="py-3 px-4">Terminal</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {punchLogs.length > 0 ? (
                punchLogs.map((log) => {
                  const statusStyle = getStatusBadgeStyle(log.status);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-bg-hover transition-colors font-medium"
                    >
                      <td className="py-3 px-4 text-text-primary font-semibold">{log.date}</td>
                      <td className="py-3 px-4 text-text-primary">{log.staff}</td>
                      <td className="py-3 px-4 text-text-secondary font-mono">{log.timeIn}</td>
                      <td className="py-3 px-4 text-text-secondary font-mono">
                        {renderClockOutCell(log)}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-text-primary">
                        {log.duration}
                      </td>
                      <td className="py-3 px-4 text-text-muted text-[11px] font-mono">
                        {log.terminal}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-extrabold uppercase ${statusStyle}`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-text-muted">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
