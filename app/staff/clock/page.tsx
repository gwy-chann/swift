"use client";

import React, { useState } from "react";
import { Clock, Coffee, LogOut, Calendar } from "lucide-react";
import { ShiftDurationTimer } from "@/components/staff/shift-duration-timer";
import { DEFAULT_STAFF_USER, DEFAULT_STAFF_SHIFT } from "@/lib/staff/navigation";

export default function StaffClockPage() {
  const [isOnShift, setIsOnShift] = useState(true);

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Active Shift Clock Card */}
      <div className="p-6 bg-bg-surface border border-border rounded-xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              isOnShift ? "bg-success-light text-success" : "bg-bg-muted text-text-muted"
            }`}>
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary">Terminal Digital Shift Punch Clock</h3>
                <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold text-white ${
                  isOnShift ? "bg-success" : "bg-text-muted"
                }`}>
                  {isOnShift ? "ON SHIFT" : "OFF SHIFT"}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Employee: <strong className="text-text-primary">{DEFAULT_STAFF_USER.name}</strong> ({DEFAULT_STAFF_USER.role})
              </p>
            </div>
          </div>

          <div className="p-3 bg-bg-base border border-border rounded-lg text-right">
            <span className="text-[11px] text-text-muted font-semibold block">Active Shift Counter</span>
            <ShiftDurationTimer initialSeconds={DEFAULT_STAFF_SHIFT.initialElapsedSeconds} />
          </div>
        </div>

        {/* Quick Shift Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            onClick={() => setIsOnShift(!isOnShift)}
            className={`flex-1 min-w-36 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer ${
              isOnShift
                ? "bg-danger hover:bg-danger/90 text-white"
                : "bg-success hover:bg-success/90 text-white"
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>{isOnShift ? "Clock Out (End Shift)" : "Clock In (Start Shift)"}</span>
          </button>

          <button
            type="button"
            className="flex-1 min-w-36 py-2.5 px-4 bg-bg-base hover:bg-bg-hover text-text-secondary border border-border rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <Coffee className="w-4 h-4 text-accent" />
            <span>Take Meal / Rest Break</span>
          </button>
        </div>
      </div>

      {/* Attendance & Shift Timesheet History */}
      <div className="bg-bg-surface border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-primary" />
            <h4 className="text-xs font-bold text-text-primary uppercase tracking-wider">
              Recent Shift History (This Week)
            </h4>
          </div>
          <span className="text-xs text-text-muted font-mono">Terminal #01</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-bg-base/60 text-text-muted font-bold border-b border-border">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4">Total Duration</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              <tr className="hover:bg-bg-hover transition-colors font-semibold">
                <td className="py-3 px-4 text-text-primary">Today</td>
                <td className="py-3 px-4 text-text-secondary font-mono">08:00 AM</td>
                <td className="py-3 px-4 text-text-muted font-mono">— (In Progress)</td>
                <td className="py-3 px-4 font-mono font-bold text-success">04h 12m</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success-light text-success">
                    Active
                  </span>
                </td>
              </tr>
              <tr className="hover:bg-bg-hover transition-colors">
                <td className="py-3 px-4 text-text-primary">Yesterday</td>
                <td className="py-3 px-4 text-text-secondary font-mono">08:02 AM</td>
                <td className="py-3 px-4 text-text-secondary font-mono">05:04 PM</td>
                <td className="py-3 px-4 font-mono text-text-primary">09h 02m</td>
                <td className="py-3 px-4">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-bg-muted text-text-secondary">
                    Completed
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
