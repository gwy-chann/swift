'use client';

import React from 'react';
import { Search, LayoutGrid, List, Filter, X, RefreshCw } from 'lucide-react';
import type { RepairsFilterState } from '@/lib/repairs/repairs-contracts';
import type { WorkOrderStatus } from '@/lib/types/service';

interface RepairsFilterBarProps {
  filters: RepairsFilterState;
  onFilterChange: (updated: Partial<RepairsFilterState>) => void;
  mechanicsList: string[];
  baysList: { id: string; name: string }[];
  totalResults: number;
  onRefresh?: () => void;
  isRefreshing?: boolean;
}

const STATUS_TABS: { label: string; value: 'ALL' | WorkOrderStatus }[] = [
  { label: 'All Repairs', value: 'ALL' },
  { label: 'In Progress', value: 'IN PROGRESS' },
  { label: 'Waiting for Parts', value: 'PENDING_PARTS' },
  { label: 'Pending Queue', value: 'QUEUED' },
  { label: 'Ready for Release', value: 'COMPLETED' },
];

export function RepairsFilterBar({
  filters,
  onFilterChange,
  mechanicsList,
  baysList,
  totalResults,
  onRefresh,
  isRefreshing,
}: Readonly<RepairsFilterBarProps>) {
  const isFiltered =
    filters.searchQuery !== '' ||
    filters.statusFilter !== 'ALL' ||
    filters.mechanicFilter !== 'ALL' ||
    filters.bayFilter !== 'ALL';

  function handleReset() {
    onFilterChange({
      searchQuery: '',
      statusFilter: 'ALL',
      mechanicFilter: 'ALL',
      bayFilter: 'ALL',
    });
  }

  return (
    <div className="bg-bg-surface border border-border-subtle rounded-xl p-4 shadow-xs space-y-4">
      {/* Top Row: Search & View Switcher */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Instant Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            type="text"
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ searchQuery: e.target.value })}
            placeholder="Search by license plate, model, customer, chassis #..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-bg-base border border-border-subtle text-sm text-text-primary placeholder:text-text-muted focus:outline-hidden focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ searchQuery: '' })}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary cursor-pointer"
              title="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* View Switcher, Result Count & Refresh */}
        <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
          <span className="text-xs font-medium text-text-muted whitespace-nowrap">
            Showing <strong className="text-text-primary">{totalResults}</strong> motors
          </span>

          <div className="flex items-center p-0.5 rounded-lg border border-border-subtle bg-bg-base">
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: 'grid' })}
              className={`p-1.5 px-2 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                filters.viewMode === 'grid'
                  ? 'bg-bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Grid Cards View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Cards</span>
            </button>
            <button
              type="button"
              onClick={() => onFilterChange({ viewMode: 'table' })}
              className={`p-1.5 px-2 rounded-md text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                filters.viewMode === 'table'
                  ? 'bg-bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-text-primary'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Table</span>
            </button>
          </div>

          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-1.5 px-2.5 rounded-lg border border-border-subtle bg-bg-base hover:bg-bg-surface text-xs font-semibold text-text-secondary hover:text-text-primary flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh Feed"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-primary' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Bottom Row: Status Pills & Dropdown Selectors */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-2 border-t border-border-subtle/60">
        {/* Status Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {STATUS_TABS.map((tab) => {
            const isActive = filters.statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => onFilterChange({ statusFilter: tab.value })}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
                  isActive
                    ? 'bg-primary text-white shadow-xs'
                    : 'bg-bg-base text-text-secondary hover:text-text-primary border border-border-subtle'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Dropdown Filters: Mechanic & Service Bay */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mechanic Selector */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-text-muted hidden sm:inline" />
            <select
              value={filters.mechanicFilter}
              onChange={(e) => onFilterChange({ mechanicFilter: e.target.value })}
              className="px-2.5 py-1.5 rounded-lg bg-bg-base border border-border-subtle text-xs text-text-primary focus:outline-hidden focus:border-primary"
            >
              <option value="ALL">All Mechanics</option>
              {mechanicsList.map((mech) => (
                <option key={mech} value={mech}>
                  {mech}
                </option>
              ))}
            </select>
          </div>

          {/* Service Bay Selector */}
          <select
            value={filters.bayFilter}
            onChange={(e) => onFilterChange({ bayFilter: e.target.value })}
            className="px-2.5 py-1.5 rounded-lg bg-bg-base border border-border-subtle text-xs text-text-primary focus:outline-hidden focus:border-primary"
          >
            <option value="ALL">All Workshop Bays</option>
            {baysList.map((bay) => (
              <option key={bay.id} value={bay.name}>
                {bay.name}
              </option>
            ))}
          </select>

          {/* Reset Filters */}
          {isFiltered && (
            <button
              onClick={handleReset}
              className="px-2 py-1.5 rounded-lg text-xs font-medium text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
