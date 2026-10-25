'use client';

import React from 'react';
import type { AttendanceFilterState, DatePreset, ShiftStatus } from '@/lib/types/logs';
import { Search, RotateCcw, RefreshCw, Filter } from 'lucide-react';

interface AttendanceFilterBarProps {
  filters: AttendanceFilterState;
  onFilterChange: (newFilters: AttendanceFilterState) => void;
  onReset: () => void;
  onRefresh: () => void;
  isRefreshing?: boolean;
}

export function AttendanceFilterBar({
  filters,
  onFilterChange,
  onReset,
  onRefresh,
  isRefreshing = false,
}: Readonly<AttendanceFilterBarProps>) {
  const hasActiveFilters =
    Boolean(filters.searchQuery.trim()) ||
    filters.statusFilter !== 'all' ||
    filters.datePreset !== 'all' ||
    Boolean(filters.selectedStaffId && filters.selectedStaffId !== 'all');

  return (
    <div className="bg-bg-card border border-border-subtle rounded-xl p-3 shadow-xs space-y-3">
      <div className="flex flex-col md:flex-row gap-2.5 items-stretch md:items-center justify-between">
        {/* Search Bar */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                searchQuery: e.target.value,
              })
            }
            placeholder="Search by staff name, role, or terminal ID..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-bg-subtle border border-border-subtle rounded-lg text-text-primary placeholder:text-text-muted/60 focus:outline-hidden focus:border-primary/50 focus:ring-1 focus:ring-primary/50 transition-colors"
          />
          {filters.searchQuery && (
            <button
              type="button"
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary text-xs"
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filters Group */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Dropdown */}
          <div className="flex items-center gap-1.5 bg-bg-subtle border border-border-subtle rounded-lg px-2.5 py-1">
            <Filter className="w-3.5 h-3.5 text-text-muted shrink-0" />
            <select
              value={filters.statusFilter}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  statusFilter: e.target.value as 'all' | ShiftStatus,
                })
              }
              aria-label="Filter by shift status"
              className="text-xs bg-transparent text-text-primary border-none focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Statuses</option>
              <option value="on_shift">On Shift</option>
              <option value="break">On Break</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          {/* Date Preset Dropdown */}
          <div className="flex items-center gap-1.5 bg-bg-subtle border border-border-subtle rounded-lg px-2.5 py-1">
            <select
              value={filters.datePreset}
              onChange={(e) =>
                onFilterChange({
                  ...filters,
                  datePreset: e.target.value as DatePreset,
                })
              }
              aria-label="Filter by date range"
              className="text-xs bg-transparent text-text-primary border-none focus:outline-hidden cursor-pointer"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last_7_days">Last 7 Days</option>
              <option value="last_30_days">Last 30 Days</option>
            </select>
          </div>

          {/* Reset Filters */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs text-text-muted hover:text-danger hover:bg-danger/10 border border-transparent hover:border-danger/20 rounded-lg transition-colors cursor-pointer"
              title="Reset all search and dropdown filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* Refresh Button */}
          <button
            type="button"
            disabled={isRefreshing}
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-bg-subtle text-text-primary hover:bg-bg-subtle/80 border border-border-subtle transition-colors cursor-pointer disabled:opacity-50"
            title="Refresh attendance records from database"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
