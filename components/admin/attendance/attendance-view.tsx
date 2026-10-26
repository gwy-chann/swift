'use client';

import React, { useState, useTransition, useEffect, useMemo } from 'react';
import type {
  AdminStaffShift,
  AttendanceFilterState,
  AttendanceSummaryMetrics,
} from '@/lib/types/logs';
import { filterAdminShifts, computeElapsedShiftSeconds, formatSecondsToDuration } from '@/lib/admin/attendance-utils';
import { getAdminStaffAttendanceAction } from '@/lib/admin/attendance-actions';
import { useStaffRealtimeShifts } from '@/lib/hooks/use-staff-realtime-shifts';
import { AttendanceKpiCards } from './attendance-kpi-cards';
import { AttendanceFilterBar } from './attendance-filter-bar';
import { AttendanceLedgerTable } from './attendance-ledger-table';

interface AttendanceViewProps {
  initialShifts: AdminStaffShift[];
  initialMetrics: AttendanceSummaryMetrics;
}

const DEFAULT_FILTERS: AttendanceFilterState = {
  searchQuery: '',
  statusFilter: 'all',
  datePreset: 'all',
};

export function AttendanceView({
  initialShifts,
  initialMetrics,
}: Readonly<AttendanceViewProps>) {
  const [shifts, setShifts] = useState<AdminStaffShift[]>(initialShifts);
  const [metrics, setMetrics] = useState<AttendanceSummaryMetrics>(initialMetrics);
  const [filters, setFilters] = useState<AttendanceFilterState>(DEFAULT_FILTERS);
  const [isPending, startTransition] = useTransition();

  // 1. Refresh Action
  const handleRefresh = React.useCallback(() => {
    startTransition(async () => {
      try {
        const result = await getAdminStaffAttendanceAction();
        if (result.success) {
          setShifts(result.shifts);
          setMetrics(result.metrics);
        }
      } catch (err) {
        console.error('[AttendanceView] Error refreshing attendance records:', err);
      }
    });
  }, []);

  // 2. Live Elapsed Time Counter for Active Shifts (re-ticks every 1s for real-time driftless counter)
  useEffect(() => {
    const hasActiveShifts = shifts.some((s) => s.status === 'on_shift' || s.status === 'break');
    if (!hasActiveShifts) return;

    const timer = setInterval(() => {
      setShifts((prev) =>
        prev.map((shift) => {
          if (shift.status === 'on_shift' || shift.status === 'break') {
            const updatedSeconds = computeElapsedShiftSeconds(
              shift.clockInIso,
              null,
              0,
              Date.now()
            );
            return {
              ...shift,
              durationSeconds: updatedSeconds,
              duration: formatSecondsToDuration(updatedSeconds),
            };
          }
          return shift;
        })
      );
    }, 1000);

    return () => clearInterval(timer);
  }, [shifts]);

  // 3. Client-side Instant Filtered Shifts Subset
  const filteredShifts = useMemo(() => {
    return filterAdminShifts(shifts, filters);
  }, [shifts, filters]);

  // 4. Supabase Realtime CDC subscription for public.staff_shifts
  useStaffRealtimeShifts({
    enabled: true,
    channelName: 'admin_attendance_realtime',
    onInsert: () => {
      handleRefresh();
    },
    onUpdate: () => {
      handleRefresh();
    },
    onDelete: () => {
      handleRefresh();
    },
  });

  // 5. Periodic Heartbeat Polling & Window Focus Auto-Sync (Sub-5s live admin reflection)
  useEffect(() => {
    const pollInterval = setInterval(() => {
      handleRefresh();
    }, 4000);

    const onVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        handleRefresh();
      }
    };

    window.addEventListener('visibilitychange', onVisibilityOrFocus);
    window.addEventListener('focus', onVisibilityOrFocus);

    return () => {
      clearInterval(pollInterval);
      window.removeEventListener('visibilitychange', onVisibilityOrFocus);
      window.removeEventListener('focus', onVisibilityOrFocus);
    };
  }, [handleRefresh]);

  function handleResetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const hasActiveFilters =
    Boolean(filters.searchQuery.trim()) ||
    filters.statusFilter !== 'all' ||
    filters.datePreset !== 'all' ||
    Boolean(filters.selectedStaffId && filters.selectedStaffId !== 'all');

  return (
    <div id="view-attendance" className="space-y-4 animate-fadeIn">
      {/* Filter and Search Bar */}
      <section aria-label="Attendance Filters">
        <AttendanceFilterBar
          filters={filters}
          onFilterChange={setFilters}
          onReset={handleResetFilters}
          onRefresh={handleRefresh}
          isRefreshing={isPending}
        />
      </section>

      {/* Summary KPI Cards */}
      <section aria-label="Staff Attendance KPI Summary">
        <AttendanceKpiCards metrics={metrics} />
      </section>

      {/* Main Itemized Ledger Table */}
      <section aria-label="Itemized Shift Attendance Ledger">
        <AttendanceLedgerTable
          shifts={filteredShifts}
          onResetFilters={handleResetFilters}
          hasActiveFilters={hasActiveFilters}
        />
      </section>
    </div>
  );
}
