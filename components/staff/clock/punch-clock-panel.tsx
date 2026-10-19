"use client";

import React, { useState } from "react";
import { TerminalLiveClock } from "./terminal-live-clock";
import { usePunchStore } from "@/lib/store/punch-store";
import { LogIn, LogOut, Coffee, AlertCircle, CheckCircle2, X } from "lucide-react";
import { DEFAULT_STAFF_USER, DEFAULT_STAFF_SHIFT } from "@/lib/staff/navigation";
import {
  clockInShiftAction,
  clockOutShiftAction,
  toggleShiftBreakAction,
} from "@/lib/staff/actions";

interface PunchClockPanelProps {
  className?: string;
}

type FeedbackType = "error" | "success" | "warning";

function getFeedbackBannerClass(type: FeedbackType): string {
  if (type === "error") {
    return "bg-danger-light border-danger text-danger";
  }
  if (type === "success") {
    return "bg-success-light border-success text-success";
  }
  return "bg-accent-light border-accent text-accent";
}

function getStatusBadgeClass(isShiftActive: boolean, shiftStatus: string): string {
  if (!isShiftActive) {
    return "bg-bg-muted text-text-muted border-border";
  }
  if (shiftStatus === "break") {
    return "bg-accent-light text-accent border-accent/40";
  }
  return "bg-success-light text-success border-success/40";
}

function getStatusDotClass(isShiftActive: boolean, shiftStatus: string): string {
  if (!isShiftActive) {
    return "bg-text-muted";
  }
  if (shiftStatus === "break") {
    return "bg-accent animate-pulse";
  }
  return "bg-success animate-pulse";
}

function getStatusText(isShiftActive: boolean, shiftStatus: string): string {
  if (!isShiftActive) {
    return "CURRENT STATUS: CLOCKED OUT";
  }
  if (shiftStatus === "break") {
    return "CURRENT STATUS: ON BREAK";
  }
  return "CURRENT STATUS: ON SHIFT";
}

export function PunchClockPanel({ className = "" }: PunchClockPanelProps) {
  const {
    isShiftActive,
    shiftStatus,
    activeShiftId,
    clockIn,
    clockOut,
    toggleBreak,
    currentStaff,
  } = usePunchStore();

  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    message: string;
  } | null>(null);

  const displayStaffName = currentStaff || DEFAULT_STAFF_USER.name;

  function showNotification(message: string, type: FeedbackType) {
    setFeedback({ type, message });
    if (typeof window !== "undefined" && typeof window.alert === "function") {
      try {
        window.alert(message);
      } catch {
        // Ignore in headless test environments
      }
    }
  }

  function handleClockIn() {
    if (isShiftActive && (shiftStatus === "on_shift" || shiftStatus === "break")) {
      showNotification("You are already clocked in for this shift!", "error");
      return;
    }

    try {
      clockIn(displayStaffName, DEFAULT_STAFF_SHIFT.terminalId);
      showNotification("Clock-In recorded successfully. Shift started!", "success");
      clockInShiftAction(DEFAULT_STAFF_SHIFT.terminalId).catch((err) => {
        console.warn("[PunchClockPanel] clockInShiftAction error:", err);
      });
    } catch {
      showNotification("You are already clocked in for this shift!", "error");
    }
  }

  function handleClockOut() {
    if (!isShiftActive) {
      showNotification("No active shift to clock out from.", "error");
      return;
    }

    const currentShiftId = activeShiftId || "00000000-0000-0000-0000-000000000000";

    try {
      const durationStr = clockOut(displayStaffName);
      showNotification(
        `Clock-Out recorded. Shift ended (${durationStr}) and logged to attendance history.`,
        "success"
      );
      clockOutShiftAction(currentShiftId).catch((err) => {
        console.warn("[PunchClockPanel] clockOutShiftAction error:", err);
      });
    } catch {
      showNotification("No active shift to clock out from.", "error");
    }
  }

  function handleToggleBreak() {
    if (!isShiftActive) {
      showNotification("Cannot toggle break when no shift is currently active.", "warning");
      return;
    }

    const currentShiftId = activeShiftId || "00000000-0000-0000-0000-000000000000";

    try {
      const next = toggleBreak();
      if (next === "break") {
        showNotification("Meal / rest break started. Shift duration paused.", "warning");
      } else {
        showNotification("Break concluded. Resumed active shift clock.", "success");
      }
      toggleShiftBreakAction(currentShiftId).catch((err) => {
        console.warn("[PunchClockPanel] toggleShiftBreakAction error:", err);
      });
    } catch {
      showNotification("Cannot toggle break when no shift is currently active.", "warning");
    }
  }

  const statusBadgeClass = getStatusBadgeClass(isShiftActive, shiftStatus);
  const statusDotClass = getStatusDotClass(isShiftActive, shiftStatus);
  const statusText = getStatusText(isShiftActive, shiftStatus);

  return (
    <div
      className={`max-w-2xl mx-auto bg-bg-surface border border-border rounded-xl p-6 sm:p-8 text-center shadow-md ${className}`}
    >
      {/* Alert Banner / Duplicate Punch Notification */}
      {feedback && (
        <div
          role="alert"
          aria-live="assertive"
          className={`mb-6 p-4 rounded-lg flex items-center justify-between text-left text-xs font-semibold border animate-in fade-in duration-150 ${getFeedbackBannerClass(
            feedback.type
          )}`}
        >
          <div className="flex items-center gap-2.5">
            {feedback.type === "error" && <AlertCircle className="w-4 h-4 shrink-0" />}
            {feedback.type === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {feedback.type === "warning" && <Coffee className="w-4 h-4 shrink-0" />}
            <span>{feedback.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Close notification"
            className="p-1 hover:opacity-75 transition-opacity cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header Label */}
      <div className="text-text-muted text-xs font-black tracking-wider uppercase">
        TERMINAL DIGITAL TIME CLOCK
      </div>

      {/* Large Live Digital Clock */}
      <TerminalLiveClock />

      {/* Dynamic Status Badge */}
      <div className="mb-6">
        <div
          id="punchStatusBadge"
          className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs transition-colors ${statusBadgeClass}`}
        >
          <span className={`w-2 h-2 rounded-full ${statusDotClass}`} />
          <span>{statusText}</span>
        </div>
      </div>

      {/* Staff Terminal Info */}
      <div className="text-xs text-text-muted mb-6">
        Operator: <strong className="text-text-primary">{displayStaffName}</strong> • {DEFAULT_STAFF_SHIFT.terminalId}
      </div>

      {/* Primary Punch Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-lg mx-auto">
        <button
          type="button"
          onClick={handleClockIn}
          className="w-full py-3.5 px-5 bg-success hover:bg-success/90 text-white rounded-lg font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>TIME IN (SHIFT START)</span>
        </button>

        <button
          type="button"
          onClick={handleClockOut}
          className="w-full py-3.5 px-5 bg-danger hover:bg-danger/90 text-white rounded-lg font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-xs transition-all active:scale-[0.98] cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>TIME OUT (SHIFT END)</span>
        </button>
      </div>

      {/* Break Toggle Action */}
      <div className="mt-4 max-w-lg mx-auto">
        <button
          type="button"
          onClick={handleToggleBreak}
          disabled={!isShiftActive}
          className={`w-full py-2.5 px-4 bg-bg-base hover:bg-bg-hover text-text-secondary border border-border rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-colors ${
            !isShiftActive ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
          }`}
        >
          <Coffee className="w-3.5 h-3.5 text-accent" />
          <span>{shiftStatus === "break" ? "End Break & Resume Shift" : "Take Meal / Rest Break"}</span>
        </button>
      </div>
    </div>
  );
}
