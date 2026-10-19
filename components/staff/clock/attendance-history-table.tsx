"use client";

import React, { useMemo } from "react";
import { Calendar } from "lucide-react";
import { usePunchStore } from "@/lib/store/punch-store";
import type { PunchLog } from "@/lib/types/logs";

export interface AttendanceHistoryTableProps {
  initialLogs?: PunchLog[];
  title?: string;
  terminalLabel?: string;
}

function getStatusBadgeClass(status: string): string {
  const normalized = status.toLowerCase();
  if (normalized === "on shift" || normalized === "on_shift") {
    return "bg-success-light text-success border border-success/20";
  }
  if (normalized === "break") {
    return "bg-accent-light text-accent border border-accent/20";
  }
  return "bg-bg-muted text-text-secondary border border-border";
}

function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return "—";
  const todayIso = new Date().toISOString().split("T")[0];
  if (dateStr === todayIso) {
    return `${dateStr} (Today)`;
  }
  return dateStr;
}

export function AttendanceHistoryTable({
  initialLogs,
  title = "My Attendance & Shift Log History",
  terminalLabel = "Terminal #01",
}: AttendanceHistoryTableProps) {
  const { punchLogs: storeLogs, isShiftActive, activeShiftId, formattedTimer } = usePunchStore();

  const logs = useMemo(() => {
    const raw = storeLogs.length > 0 ? storeLogs : (initialLogs ?? []);
    // Sort in reverse chronological order (newest date and time on top)
    return [...raw].sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return (b.timeIn || "").localeCompare(a.timeIn || "");
    });
  }, [storeLogs, initialLogs]);

  return (
    <div
      id="attendance-history-panel"
      className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden"
    >
      <div className="p-4 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-primary" />
          <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
            {title}
          </h4>
        </div>
        <span className="text-xs text-text-muted font-mono">{terminalLabel}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-bg-base/60 text-text-muted font-bold border-b border-border">
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4">Staff Name</th>
              <th className="py-3 px-4">Time-In</th>
              <th className="py-3 px-4">Time-Out</th>
              <th className="py-3 px-4">Shift Duration</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {logs.length > 0 ? (
              logs.map((log, index) => {
                const isActive =
                  isShiftActive &&
                  (log.status === "On Shift" || log.status === "on_shift" || log.status === "Break" || log.status === "break") &&
                  (activeShiftId ? log.id === activeShiftId : (index === 0 && log.timeOut === "-- Active Shift --"));

                return (
                  <tr
                    key={log.id || `shift-log-${index}`}
                    className="hover:bg-bg-hover transition-colors font-medium"
                  >
                    <td className="py-3 px-4 text-text-primary font-bold">
                      {formatDisplayDate(log.date)}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{log.staff}</td>
                    <td className="py-3 px-4 text-text-secondary font-mono">{log.timeIn}</td>
                    <td className="py-3 px-4 font-mono">
                      {isActive ? (
                        <span className="text-accent font-semibold">-- Active Shift --</span>
                      ) : (
                        <span className="text-text-secondary">{log.timeOut}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-text-primary">
                      {isActive ? formattedTimer : log.duration}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(
                          log.status
                        )}`}
                      >
                        {log.status === "on_shift" ? "On Shift" : log.status}
                      </span>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={6} className="py-8 text-center text-text-muted">
                  No attendance records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
