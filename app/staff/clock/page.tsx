"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Clock, Coffee, LogOut, Calendar, AlertCircle } from "lucide-react";
import { DEFAULT_STAFF_USER } from "@/lib/staff/navigation";
import { usePunchStore } from "@/lib/store/punch-store";
import { useStaffRealtimeShifts } from "@/lib/hooks/use-staff-realtime-shifts";
import {
  clockInShiftAction,
  clockOutShiftAction,
  toggleShiftBreakAction,
  getStaffAttendanceHistoryAction,
} from "@/lib/staff/actions";

function getShiftIconClass(isActive: boolean, status: string): string {
  if (!isActive) return "bg-bg-muted text-text-muted";
  if (status === "break") return "bg-accent-light text-accent";
  return "bg-success-light text-success";
}

function getShiftBadgeClass(isActive: boolean, status: string): string {
  if (!isActive) return "bg-text-muted";
  if (status === "break") return "bg-accent";
  return "bg-success";
}

function getShiftBadgeText(isActive: boolean, status: string): string {
  if (!isActive) return "OFF SHIFT";
  if (status === "break") return "ON BREAK";
  return "ON SHIFT";
}

function getStatusBadgeClass(status: string): string {
  if (status === "On Shift" || status === "on_shift") {
    return "bg-success-light text-success";
  }
  if (status === "Break" || status === "break") {
    return "bg-accent-light text-accent";
  }
  return "bg-bg-muted text-text-secondary";
}

function getClockButtonText(isSubmitting: boolean, isShiftActive: boolean): string {
  if (isSubmitting) return "Processing...";
  if (isShiftActive) return "Clock Out (End Shift)";
  return "Clock In (Start Shift)";
}

export default function StaffClockPage() {
  const {
    isShiftActive,
    shiftStatus,
    punchLogs,
    currentStaff,
    formattedTimer,
    tickSecond,
    clockIn: storeClockIn,
    clockOut: storeClockOut,
    toggleBreak: storeToggleBreak,
    rehydrateShift,
  } = usePunchStore();

  const [activeShiftId, setActiveShiftId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // SIAA-63: CDC Realtime Synchronization across all shop floor terminals
  useStaffRealtimeShifts();

  // 1-second drift-free shift duration counter
  useEffect(() => {
    if (!isShiftActive || shiftStatus === "break") return;
    const interval = setInterval(() => {
      tickSecond();
    }, 1000);
    return () => clearInterval(interval);
  }, [isShiftActive, shiftStatus, tickSecond]);

  // Initial attendance timesheet history hydration
  const refreshAttendanceHistory = useCallback(async () => {
    try {
      const res = await getStaffAttendanceHistoryAction();
      if (res.success) {
        if (res.activeShift) {
          setActiveShiftId(res.activeShift.id);
        } else {
          setActiveShiftId(null);
        }
        rehydrateShift(res.activeShift, res.logs);
      }
    } catch (err) {
      console.warn("Failed to refresh attendance history:", err);
    }
  }, [rehydrateShift]);

  useEffect(() => {
    let isMounted = true;
    getStaffAttendanceHistoryAction()
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          if (res.activeShift) {
            setActiveShiftId(res.activeShift.id);
          } else {
            setActiveShiftId(null);
          }
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

  const handlePunchToggle = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (isShiftActive) {
        // Clock Out
        const targetId = activeShiftId || "00000000-0000-0000-0000-000000000000";
        const result = await clockOutShiftAction(targetId);
        if (!result.success) {
          setErrorMessage(result.error || "Failed to clock out shift.");
        } else {
          storeClockOut();
          setActiveShiftId(null);
          await refreshAttendanceHistory();
        }
      } else {
        // Clock In
        const result = await clockInShiftAction("Terminal #01");
        if (!result.success) {
          setErrorMessage(result.error || "Failed to clock in shift.");
        } else {
          storeClockIn(result.staffName, result.terminalId);
          if (result.shiftId) {
            setActiveShiftId(result.shiftId);
          }
          await refreshAttendanceHistory();
        }
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unexpected punch clock error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBreakToggle = async () => {
    if (!isShiftActive) return;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const targetId = activeShiftId || "00000000-0000-0000-0000-000000000000";
      const result = await toggleShiftBreakAction(targetId);
      if (!result.success) {
        setErrorMessage(result.error || "Failed to toggle break status.");
      } else {
        storeToggleBreak();
        await refreshAttendanceHistory();
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Unexpected break toggle error.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const clockButtonLabel = getClockButtonText(isSubmitting, isShiftActive);
  const breakButtonLabel = shiftStatus === "break" ? "Resume Active Shift" : "Take Meal / Rest Break";

  return (
    <div className="space-y-5 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* High-Contrast Error Alert Banner */}
      {errorMessage && (
        <output
          className="p-3.5 bg-danger-light text-danger border border-danger/30 rounded-xl text-xs font-semibold flex items-center justify-between gap-3 shadow-xs shrink-0"
          aria-live="polite"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-xs opacity-70 hover:opacity-100 transition-opacity cursor-pointer"
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </output>
      )}

      {/* Active Shift Clock Card */}
      <div className="p-6 bg-bg-surface border border-border rounded-xl shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-xl flex items-center justify-center ${getShiftIconClass(
                isShiftActive,
                shiftStatus
              )}`}
            >
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-text-primary">Terminal Digital Shift Punch Clock</h3>
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-extrabold text-white ${getShiftBadgeClass(
                    isShiftActive,
                    shiftStatus
                  )}`}
                >
                  {getShiftBadgeText(isShiftActive, shiftStatus)}
                </span>
              </div>
              <p className="text-xs text-text-muted">
                Employee: <strong className="text-text-primary">{currentStaff || DEFAULT_STAFF_USER.name}</strong> ({DEFAULT_STAFF_USER.role})
              </p>
            </div>
          </div>

          <div className="p-3 bg-bg-base border border-border rounded-lg text-right">
            <span className="text-[11px] text-text-muted font-semibold block">Active Shift Counter</span>
            <div className="flex items-center justify-end gap-1.5 text-xs">
              <span className={`font-bold ${shiftStatus === "break" ? "text-accent" : "text-success"}`}>
                {shiftStatus === "break" ? "Paused (Break):" : "Active Shift:"}
              </span>
              <strong className="font-mono font-bold text-text-primary text-sm tracking-wider">
                {formattedTimer}
              </strong>
            </div>
          </div>
        </div>

        {/* Quick Shift Actions */}
        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handlePunchToggle}
            className={`flex-1 min-w-36 py-2.5 px-4 rounded-lg text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50 ${
              isShiftActive
                ? "bg-danger hover:bg-danger/90 text-white"
                : "bg-success hover:bg-success/90 text-white"
            }`}
          >
            <LogOut className="w-4 h-4" />
            <span>{clockButtonLabel}</span>
          </button>

          <button
            type="button"
            disabled={isSubmitting || !isShiftActive}
            onClick={handleBreakToggle}
            className="flex-1 min-w-36 py-2.5 px-4 bg-bg-base hover:bg-bg-hover text-text-secondary border border-border rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-40"
          >
            <Coffee className="w-4 h-4 text-accent" />
            <span>{breakButtonLabel}</span>
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
                <th className="py-3 px-4">Staff</th>
                <th className="py-3 px-4">Clock In</th>
                <th className="py-3 px-4">Clock Out</th>
                <th className="py-3 px-4">Total Duration</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {punchLogs.length > 0 ? (
                punchLogs.map((log, index) => {
                  const isCurrent = index === 0 && isShiftActive;
                  return (
                    <tr key={log.id || `log-${index}`} className="hover:bg-bg-hover transition-colors font-semibold">
                      <td className="py-3 px-4 text-text-primary">{log.date}</td>
                      <td className="py-3 px-4 text-text-secondary">{log.staff}</td>
                      <td className="py-3 px-4 text-text-secondary font-mono">{log.timeIn}</td>
                      <td className="py-3 px-4 text-text-muted font-mono">
                        {isCurrent ? "— (In Progress)" : log.timeOut}
                      </td>
                      <td className={`py-3 px-4 font-mono font-bold ${isCurrent ? "text-success" : "text-text-primary"}`}>
                        {isCurrent ? formattedTimer : log.duration}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${getStatusBadgeClass(log.status)}`}
                        >
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-text-muted">
                    No attendance records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
