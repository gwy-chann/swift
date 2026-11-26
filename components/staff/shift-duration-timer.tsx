"use client";

import React, { useSyncExternalStore } from "react";
import { usePunchStore } from "@/lib/store/punch-store";

interface ShiftDurationTimerProps {
  initialSeconds?: number;
  className?: string;
  showLabel?: boolean;
}

const emptySubscribe = () => () => {};

function getLabelColor(isShiftActive: boolean, shiftStatus: string): string {
  if (!isShiftActive) return "text-text-muted";
  if (shiftStatus === "break") return "text-accent";
  return "text-success";
}

function getLabelText(isShiftActive: boolean, shiftStatus: string): string {
  if (!isShiftActive) return "Shift: Off";
  if (shiftStatus === "break") return "On Break:";
  return "Active Shift:";
}

function formatFallbackSeconds(seconds?: number): string {
  if (!seconds || seconds <= 0) return "00:00:00";
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  return `${String(hrs).padStart(2, "0")}:${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

export function ShiftDurationTimer({
  initialSeconds,
  className = "",
  showLabel = true,
}: Readonly<ShiftDurationTimerProps>) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const { formattedTimer, isShiftActive, shiftStatus } = usePunchStore();
  const effectiveShiftActive = isClient && isShiftActive;
  const effectiveShiftStatus = isClient ? shiftStatus : "idle";
  const labelColor = getLabelColor(effectiveShiftActive, effectiveShiftStatus);
  const labelText = getLabelText(effectiveShiftActive, effectiveShiftStatus);
  const fallbackDisplay = formatFallbackSeconds(initialSeconds);

  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      {showLabel && (
        <span className={`font-bold transition-colors ${labelColor}`}>
          {labelText}
        </span>
      )}
      <strong
        id="shiftTimerDisplay"
        className={`font-mono font-bold text-sm tracking-wider transition-colors ${
          effectiveShiftActive ? "text-text-primary" : "text-text-muted opacity-80"
        }`}
      >
        {effectiveShiftActive ? formattedTimer : fallbackDisplay}
      </strong>
    </div>
  );
}
