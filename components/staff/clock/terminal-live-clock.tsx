"use client";

import React, { useState, useEffect, useSyncExternalStore } from "react";

interface TerminalLiveClockProps {
  className?: string;
  initialTimeString?: string;
}

const emptySubscribe = () => () => {};

export function TerminalLiveClock({
  className = "",
  initialTimeString = "08:14:30 AM",
}: TerminalLiveClockProps) {
  const isClient = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const [timeString, setTimeString] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    }
    return initialTimeString;
  });

  useEffect(() => {
    function updateClock() {
      setTimeString(
        new Date().toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        })
      );
    }

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="liveClockDisplay"
      className={`font-mono text-4xl sm:text-5xl lg:text-6xl font-black text-text-primary tracking-tight select-none my-3 ${className}`}
    >
      {isClient ? timeString : initialTimeString}
    </div>
  );
}
