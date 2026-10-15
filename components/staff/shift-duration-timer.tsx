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

function getLabelText(shiftStatus: string): string {
  if (shiftStatus === "break") return "On Break:";
  return "Active Shift:";
}

export function ShiftDurationTimer({
  className = "",
  showLabel = true,
}: ShiftDurationTimerProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const { formattedTimer, isShiftActive, shiftStatus } = usePunchStore();
  const labelColor = getLabelColor(isShiftActive, shiftStatus);
  const labelText = getLabelText(shiftStatus);

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
          isShiftActive ? "text-text-primary" : "text-text-muted opacity-80"
        }`}
      >
        {isClient ? formattedTimer : "04:12:30"}
      </strong>
    </div>
  );
}
