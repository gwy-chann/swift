"use client";

import React, { useEffect } from "react";
import { PunchClockPanel } from "@/components/staff/clock/punch-clock-panel";
import { AttendanceHistoryTable } from "@/components/staff/clock/attendance-history-table";
import { usePunchStore } from "@/lib/store/punch-store";
import { useStaffRealtimeShifts } from "@/lib/hooks/use-staff-realtime-shifts";
import { getStaffAttendanceHistoryAction } from "@/lib/staff/actions";

export default function StaffClockPage() {
  const { punchLogs, rehydrateShift, rehydrateFromStorage, currentProfileId } = usePunchStore();

  // SIAA-63: CDC Realtime Synchronization across all shop floor terminals
  useStaffRealtimeShifts();

  // Initial attendance timesheet history hydration
  useEffect(() => {
    // 1. Rehydrate active shift immediately from client storage cache if available
    rehydrateFromStorage();

    // 2. Authoritative query for DB active shift and timesheet history
    let isMounted = true;
    getStaffAttendanceHistoryAction(20, currentProfileId)
      .then((res) => {
        if (!isMounted) return;
        if (res.success) {
          rehydrateShift(res.activeShift, res.logs, undefined, currentProfileId);
        }
      })
      .catch((err) => {
        console.warn("Failed to refresh attendance history:", err);
      });

    return () => {
      isMounted = false;
    };
  }, [rehydrateShift, rehydrateFromStorage, currentProfileId]);

  return (
    <section
      id="view-staff-clock"
      aria-label="Staff Punch Clock & Time Logging Station"
      className="view-section space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200"
    >
      {/* 1. Interactive Terminal Digital Time Clock & Punch Actions */}
      <PunchClockPanel />

      {/* 2. Staff Shift Attendance Log History & Timesheet */}
      <AttendanceHistoryTable initialLogs={punchLogs} />
    </section>
  );
}
