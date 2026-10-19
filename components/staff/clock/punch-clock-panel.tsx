"use client";

import React, { useState, useEffect } from "react";
import { TerminalLiveClock } from "./terminal-live-clock";
import { StaffProfileSwitcher } from "./staff-profile-switcher";
import { StaffPinModal } from "./staff-pin-modal";
import { TerminalEnrollmentModal } from "./terminal-enrollment-modal";
import { usePunchStore, registerOfflineSyncDispatcher } from "@/lib/store/punch-store";
import { LogIn, LogOut, Coffee, AlertCircle, CheckCircle2, X, WifiOff, Laptop, ShieldAlert } from "lucide-react";
import { DEFAULT_STAFF_USER, DEFAULT_STAFF_SHIFT } from "@/lib/staff/navigation";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/users";
import {
  clockInShiftAction,
  clockOutShiftAction,
  toggleShiftBreakAction,
} from "@/lib/staff/actions";
import {
  getStoredTerminalDevice,
  getStoredTerminalDeviceToken,
  autoEnrollPrimaryTerminalIfFirstRun,
} from "@/lib/terminal/device-binding";
import type { TerminalDevice } from "@/lib/terminal/types";
import type { StaffKioskProfile } from "@/lib/staff/types";
import type { QueuedPunchAction } from "@/lib/contracts/offline-shift-sync";

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
    currentProfileId,
    setActiveShiftId,
    enqueueOfflinePunch,
    getOfflineQueue,
    syncOfflineQueue,
  } = usePunchStore();

  const [feedback, setFeedback] = useState<{
    type: FeedbackType;
    message: string;
  } | null>(null);

  const [isClockInPinOpen, setIsClockInPinOpen] = useState(false);
  const [terminalDevice, setTerminalDevice] = useState<TerminalDevice | null>(() => {
    if (typeof window !== "undefined") {
      return autoEnrollPrimaryTerminalIfFirstRun();
    }
    return null;
  });
  const [isTerminalEnrollmentOpen, setIsTerminalEnrollmentOpen] = useState(false);

  // Synchronize terminal device binding events
  useEffect(() => {
    const handleDeviceChange = (e: Event) => {
      const customEvent = e as CustomEvent<TerminalDevice | null>;
      setTerminalDevice(customEvent.detail || getStoredTerminalDevice());
    };

    if (typeof window !== "undefined") {
      window.addEventListener("swift:terminal-device-changed", handleDeviceChange);
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("swift:terminal-device-changed", handleDeviceChange);
      }
    };
  }, []);

  // Register production RPC sync dispatcher on mount
  useEffect(() => {
    registerOfflineSyncDispatcher(async (action: QueuedPunchAction) => {
      if (action.type === "clock_in") {
        const deviceToken = action.deviceToken || getStoredTerminalDeviceToken() || "";
        const res = await clockInShiftAction(action.terminalId, undefined, action.profileId, deviceToken);
        return { success: res.success, shiftId: res.shiftId, error: res.error };
      }
      if (action.type === "toggle_break") {
        const res = await toggleShiftBreakAction(action.shiftId || "", action.profileId);
        return { success: res.success, shiftId: action.shiftId, error: res.error };
      }
      if (action.type === "clock_out") {
        const res = await clockOutShiftAction(action.shiftId || "", undefined, action.profileId);
        return { success: res.success, shiftId: action.shiftId, error: res.error };
      }
      return { success: false, error: "Unknown action type" };
    });

    // Opportunistically sync queue if online on mount
    if (typeof navigator !== "undefined" && navigator.onLine) {
      syncOfflineQueue().catch((err) => {
        console.warn("[PunchClockPanel] Initial queue sync error:", err);
      });
    }
  }, [syncOfflineQueue]);

  const displayStaffName = currentStaff || DEFAULT_STAFF_USER.name;
  const currentProfile =
    MOCK_STAFF_PROFILES.find((p) => p.id === currentProfileId) || MOCK_STAFF_PROFILES[1];

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

  function handleClockInClick() {
    if (isShiftActive && (shiftStatus === "on_shift" || shiftStatus === "break")) {
      showNotification("You are already clocked in for this shift!", "error");
      return;
    }

    // Open PIN verification modal to authenticate before starting shift
    setIsClockInPinOpen(true);
  }

  async function handleClockInPinSuccess(profile: StaffKioskProfile) {
    setIsClockInPinOpen(false);

    const currentToken = getStoredTerminalDeviceToken();
    const isAuthorized = Boolean(terminalDevice?.isAuthorized && currentToken);
    const assignedTerminal = terminalDevice?.terminalId || DEFAULT_STAFF_SHIFT.terminalId;
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    // SIAA-82: Pre-check device authorization. Unauthorized personal phones cannot punch in.
    if (!isAuthorized) {
      showNotification(
        "Clock-in blocked: UNAUTHORIZED_TERMINAL_DEVICE. Attendance punch actions are restricted to authorized physical store counter terminals.",
        "error"
      );
      return;
    }

    try {
      if (isOffline) {
        clockIn(profile.name, assignedTerminal, profile.id);
        enqueueOfflinePunch({
          type: "clock_in",
          profileId: profile.id,
          staffName: profile.name,
          terminalId: assignedTerminal,
          deviceToken: currentToken || undefined,
        });
        showNotification(
          `Clock-In recorded locally (offline mode). Will sync automatically when connectivity returns.`,
          "warning"
        );
      } else {
        const res = await clockInShiftAction(
          assignedTerminal,
          undefined,
          profile.id,
          currentToken || ""
        );

        if (res.success && res.shiftId) {
          clockIn(profile.name, res.terminalId || assignedTerminal, profile.id);
          setActiveShiftId(res.shiftId, profile.id);
          showNotification(
            `Clock-In recorded successfully. Shift started for ${profile.name}!`,
            "success"
          );
        } else if (res.code === "UNAUTHORIZED_TERMINAL_DEVICE" || res.error === "UNAUTHORIZED_TERMINAL_DEVICE") {
          showNotification(
            "Clock-in blocked: UNAUTHORIZED_TERMINAL_DEVICE. Attendance punch actions are restricted to physical store counter terminals.",
            "error"
          );
        } else {
          // General server fallback: enqueue offline punch
          clockIn(profile.name, assignedTerminal, profile.id);
          enqueueOfflinePunch({
            type: "clock_in",
            profileId: profile.id,
            staffName: profile.name,
            terminalId: assignedTerminal,
            deviceToken: currentToken || undefined,
          });
          showNotification(
            `Clock-In recorded locally (offline mode). Will sync automatically when connectivity returns.`,
            "warning"
          );
        }
      }
    } catch {
      showNotification("You are already clocked in for this shift!", "error");
    }
  }

  function handleClockOut() {
    if (!isShiftActive) {
      showNotification("No active shift to clock out from.", "error");
      return;
    }

    const currentShiftId = activeShiftId || "";
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    try {
      const durationStr = clockOut(displayStaffName, currentProfileId);

      if (isOffline) {
        enqueueOfflinePunch({
          type: "clock_out",
          profileId: currentProfileId,
          staffName: displayStaffName,
          terminalId: DEFAULT_STAFF_SHIFT.terminalId,
          shiftId: currentShiftId,
        });
        showNotification(
          `Clock-Out recorded locally (${durationStr}). Queued for offline sync.`,
          "warning"
        );
      } else {
        showNotification(
          `Clock-Out recorded. Shift ended (${durationStr}) and logged to attendance history.`,
          "success"
        );
        if (currentShiftId) {
          clockOutShiftAction(currentShiftId, undefined, currentProfileId).catch((err) => {
            console.warn("[PunchClockPanel] clockOutShiftAction error, enqueuing offline punch:", err);
            enqueueOfflinePunch({
              type: "clock_out",
              profileId: currentProfileId,
              staffName: displayStaffName,
              terminalId: DEFAULT_STAFF_SHIFT.terminalId,
              shiftId: currentShiftId,
            });
          });
        }
      }
    } catch {
      showNotification("No active shift to clock out from.", "error");
    }
  }

  function handleToggleBreak() {
    if (!isShiftActive) {
      showNotification("Cannot toggle break when no shift is currently active.", "warning");
      return;
    }

    const currentShiftId = activeShiftId || "";
    const isOffline = typeof navigator !== "undefined" && !navigator.onLine;

    try {
      const next = toggleBreak(currentProfileId);

      if (isOffline) {
        enqueueOfflinePunch({
          type: "toggle_break",
          profileId: currentProfileId,
          staffName: displayStaffName,
          terminalId: DEFAULT_STAFF_SHIFT.terminalId,
          shiftId: currentShiftId,
        });
        showNotification("Break toggled locally (offline mode). Queued for sync.", "warning");
      } else {
        if (next === "break") {
          showNotification("Meal / rest break started. Shift duration paused.", "warning");
        } else {
          showNotification("Break concluded. Resumed active shift clock.", "success");
        }
        if (currentShiftId) {
          toggleShiftBreakAction(currentShiftId, currentProfileId).catch((err) => {
            console.warn("[PunchClockPanel] toggleShiftBreakAction error, enqueuing offline punch:", err);
            enqueueOfflinePunch({
              type: "toggle_break",
              profileId: currentProfileId,
              staffName: displayStaffName,
              terminalId: DEFAULT_STAFF_SHIFT.terminalId,
              shiftId: currentShiftId,
            });
          });
        }
      }
    } catch {
      showNotification("Cannot toggle break when no shift is currently active.", "warning");
    }
  }

  const statusBadgeClass = getStatusBadgeClass(isShiftActive, shiftStatus);
  const statusDotClass = getStatusDotClass(isShiftActive, shiftStatus);
  const statusText = getStatusText(isShiftActive, shiftStatus);
  const offlineQueueCount = getOfflineQueue().length;

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

      {/* SIAA-82: Terminal Device Binding Status Badge */}
      <div className="mb-4 flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 rounded-lg bg-bg-base border border-border text-xs">
        {terminalDevice?.isAuthorized && getStoredTerminalDeviceToken() ? (
          <div className="flex items-center gap-2 text-success font-semibold">
            <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
            <Laptop className="w-3.5 h-3.5" />
            <span>
              Authorized Terminal:{" "}
              <strong className="text-text-primary">
                {terminalDevice.terminalId || "Terminal #01"}
              </strong>{" "}
              ({terminalDevice.deviceName || "Counter Laptop"})
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-danger font-semibold">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>
              UNAUTHORIZED REMOTE DEVICE: Punch-in restricted to store counter terminals
            </span>
          </div>
        )}

        <button
          type="button"
          onClick={() => setIsTerminalEnrollmentOpen(true)}
          className="text-[11px] font-semibold text-text-muted hover:text-primary transition-colors underline cursor-pointer"
        >
          {terminalDevice?.isAuthorized && getStoredTerminalDeviceToken()
            ? "Terminal Settings"
            : "Enroll as Counter Terminal (Master PIN)"}
        </button>
      </div>

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

        {/* Offline Queue Indicator */}
        {offlineQueueCount > 0 && (
          <div
            role="status"
            aria-live="polite"
            className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-accent-light text-accent border border-accent/30 animate-in fade-in"
          >
            <WifiOff className="w-3 h-3 shrink-0" />
            <span>
              {offlineQueueCount} pending offline action{offlineQueueCount > 1 ? "s" : ""} — syncing when online
            </span>
          </div>
        )}
      </div>

      {/* Staff Profile Switcher & Operator Attribution */}
      <StaffProfileSwitcher
        onStaffSwitched={(profile) => {
          showNotification(`Switched operator to ${profile.name} (${profile.roleDisplay}).`, "success");
        }}
      />

      {/* Primary Punch Actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-w-lg mx-auto">
        <button
          type="button"
          onClick={handleClockInClick}
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

      {/* PIN Verification Modal on Clock In */}
      <StaffPinModal
        isOpen={isClockInPinOpen}
        onClose={() => setIsClockInPinOpen(false)}
        targetProfile={{
          id: currentProfile.id,
          name: currentProfile.name,
          role: currentProfile.roleDisplay,
          avatarInitials: currentProfile.name
            .split(" ")
            .map((n) => n[0])
            .join("")
            .toUpperCase(),
        }}
        onSuccess={handleClockInPinSuccess}
        actionContext="clock_in"
      />

      {/* SIAA-82: Terminal Device Enrollment & Elevation Modal */}
      <TerminalEnrollmentModal
        isOpen={isTerminalEnrollmentOpen}
        onClose={() => setIsTerminalEnrollmentOpen(false)}
        currentDevice={terminalDevice}
        onSuccess={(device) => {
          setTerminalDevice(device);
          showNotification(
            `Device authorized successfully as ${device.terminalId} (${device.deviceName}).`,
            "success"
          );
        }}
      />
    </div>
  );
}
