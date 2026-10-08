"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";

interface ShiftDurationTimerProps {
  initialSeconds?: number;
  className?: string;
}

const emptySubscribe = () => () => {};

function formatTime(totalSeconds: number): string {
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
}

export function ShiftDurationTimer({
  initialSeconds = 15150, // 04:12:30 default base
  className = "",
}: Readonly<ShiftDurationTimerProps>) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [seconds, setSeconds] = useState(initialSeconds);

  useEffect(() => {
    const interval = setInterval(() => {
      setSeconds((prev) => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`flex items-center gap-1.5 text-xs ${className}`}>
      <span className="text-success font-bold">Active Shift:</span>
      <strong className="font-mono font-bold text-text-primary text-sm tracking-wider">
        {isClient ? formatTime(seconds) : formatTime(initialSeconds)}
      </strong>
    </div>
  );
}
