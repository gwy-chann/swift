"use client";

import React, { useMemo } from "react";
import { Calendar } from "lucide-react";
import { usePunchStore } from "@/lib/store/punch-store";
import type { PunchLog } from "@/lib/types/logs";
import { normalizeProfileId } from "@/lib/staff/constants";
import { MOCK_STAFF_PROFILES } from "@/lib/mock-data/users";
import { TablePagination, usePagination } from "@/components/common/table-pagination";

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

function formatDisplayTime(timeStr?: string, dateStr?: string): string {
  if (!timeStr || timeStr === "—" || timeStr.includes("-- Active Shift --")) {
    return timeStr || "—";
  }
  // If already in 12-hour AM/PM format (e.g., "09:35:51 PM" or "8:00 AM"), return as-is
  if (/\b(AM|PM)\b/i.test(timeStr)) {
    return timeStr;
  }
  // If it's a 24-hour UTC slice like "13:30" or "13:30:00" from a database timestamp:
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (match24) {
    try {
      const baseDate = dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ? dateStr : new Date().toISOString().split("T")[0];
      const hh = match24[1].padStart(2, "0");
      const mm = match24[2];
      const ss = match24[3] || "00";
      const d = new Date(`${baseDate}T${hh}:${mm}:${ss}Z`);
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleTimeString("en-US", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        });
      }
    } catch {
      // Fallback below
    }
  }

  // If it's an ISO timestamp
  const parsedDate = new Date(timeStr);
  if (!Number.isNaN(parsedDate.getTime())) {
    return parsedDate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    });
  }

  return timeStr;
}

export function AttendanceHistoryTable({
  initialLogs,
  title = "My Attendance & Shift Log History",
  terminalLabel = "Terminal #01",
}: AttendanceHistoryTableProps) {
  const {
    punchLogs: storeLogs,
    isShiftActive,
    activeShiftId,
    formattedTimer,
    currentStaff,
    currentProfileId,
  } = usePunchStore();

  const logs = useMemo(() => {
    const raw = storeLogs.length > 0 ? storeLogs : (initialLogs ?? []);

    // Enforce account isolation: only the active staff member's own attendance records are visible
    const canonicalCurrent = normalizeProfileId(currentProfileId);
    const matchedProfile = MOCK_STAFF_PROFILES.find(
      (p) => p.id === currentProfileId || (canonicalCurrent && p.id === canonicalCurrent)
    );
    const profileName = matchedProfile?.name?.trim().toLowerCase();
    const currentName = currentStaff?.trim().toLowerCase();

    const myLogs = raw.filter((log) => {
      // If neither staff name nor profile ID is set, fallback to raw
      if (!currentStaff && !currentProfileId) return true;

      const logStaff = log.staff?.trim().toLowerCase();
      const isCashierLegacy = logStaff === "swift fast-lane cashier";
      const matchesStaffName = Boolean(
        logStaff && (
          (currentName && (logStaff === currentName || (isCashierLegacy && currentName === "mike morales"))) ||
          (profileName && (logStaff === profileName || (isCashierLegacy && profileName === "mike morales")))
        )
      );

      const matchesProfileId = Boolean(
        currentProfileId &&
          log.profileId &&
          (log.profileId === currentProfileId ||
            (canonicalCurrent && log.profileId === canonicalCurrent))
      );

      return matchesStaffName || matchesProfileId;
    });

    // Sort in reverse chronological order (newest date and time on top)
    return [...myLogs].sort((a, b) => {
      if (a.date !== b.date) {
        return b.date.localeCompare(a.date);
      }
      return (b.timeIn || "").localeCompare(a.timeIn || "");
    });
  }, [storeLogs, initialLogs, currentStaff, currentProfileId]);

  const pagination = usePagination(logs, 10);

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
          <tbody className="divide-y border-border">
            {logs.length > 0 ? (
              pagination.paginatedItems.map((log, index) => {
                const isActive =
                  isShiftActive &&
                  (log.status === "On Shift" || log.status === "on_shift" || log.status === "Break" || log.status === "break") &&
                  (activeShiftId ? log.id === activeShiftId : (index === 0 && log.timeOut === "-- Active Shift --"));

                const isCashierLog =
                  log.staff === "SWIFT Fast-Lane Cashier" ||
                  ((log.profileId === "c0000000-0000-0000-0000-000000000002" ||
                    log.profileId === "00000000-0000-0000-0000-000000000002") &&
                    (!log.staff || log.staff === "Staff Member" || log.staff === "SWIFT Fast-Lane Cashier"));
                const displayStaffName = isCashierLog ? (currentStaff || "Mike Morales") : log.staff;

                return (
                  <tr
                    key={log.id || `shift-log-${index}`}
                    className="hover:bg-bg-hover transition-colors font-medium"
                  >
                    <td className="py-3 px-4 text-text-primary font-bold">
                      {formatDisplayDate(log.date)}
                    </td>
                    <td className="py-3 px-4 text-text-secondary">{displayStaffName}</td>
                    <td className="py-3 px-4 text-text-secondary font-mono">{formatDisplayTime(log.timeIn, log.date)}</td>
                    <td className="py-3 px-4 font-mono">
                      {isActive ? (
                        <span className="text-accent font-semibold">-- Active Shift --</span>
                      ) : (
                        <span className="text-text-secondary">{formatDisplayTime(log.timeOut, log.date)}</span>
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

      <TablePagination
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages}
        totalItems={pagination.totalItems}
        pageSize={pagination.pageSize}
        onPageChange={pagination.onPageChange}
        onPageSizeChange={pagination.onPageSizeChange}
        itemName="shifts"
      />
    </div>
  );
}
