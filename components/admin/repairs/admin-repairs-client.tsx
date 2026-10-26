'use client';

import React, { useState, useTransition, useMemo } from 'react';
import { AlertCircle } from 'lucide-react';
import type {
  AdminMotorRepairItem,
  RepairsDashboardKpiSummary,
  RepairsFilterState,
} from '@/lib/repairs/repairs-contracts';
import { filterAdminRepairs } from '@/lib/repairs/repairs-utils';
import { RepairsKpiSummary } from './repairs-kpi-summary';
import { RepairsFilterBar } from './repairs-filter-bar';
import { RepairMotorCard } from './repair-motor-card';
import { RepairsTable } from './repairs-table';
import { RepairInspectionDrawer } from './repair-inspection-drawer';

interface AdminRepairsClientProps {
  initialItems: AdminMotorRepairItem[];
  initialSummary: RepairsDashboardKpiSummary;
  availableMechanics: { id: string; name: string; status: string }[];
  baysList: { id: string; name: string }[];
  onRefresh: () => Promise<{
    items: AdminMotorRepairItem[];
    summary: RepairsDashboardKpiSummary;
    mechanics?: { id: string; name: string; status: string }[];
  } | null>;
  onFetchOnShiftMechanics?: () => Promise<{ id: string; name: string; status: string }[]>;
  onReassignMechanic: (
    workOrderId: string,
    orderNumber: string,
    mechanicId: string,
    mechanicName: string,
    bayId?: string | null,
    reason?: string
  ) => Promise<boolean>;
}

export function AdminRepairsClient({
  initialItems,
  initialSummary,
  availableMechanics,
  baysList,
  onRefresh,
  onFetchOnShiftMechanics,
  onReassignMechanic,
}: Readonly<AdminRepairsClientProps>) {
  const [items, setItems] = useState<AdminMotorRepairItem[]>(initialItems);
  const [summary, setSummary] = useState<RepairsDashboardKpiSummary>(initialSummary);
  const [liveMechanics, setLiveMechanics] = useState<{ id: string; name: string; status: string }[]>(availableMechanics);
  const [selectedItem, setSelectedItem] = useState<AdminMotorRepairItem | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const [filters, setFilters] = useState<RepairsFilterState>({
    searchQuery: '',
    statusFilter: 'ALL',
    mechanicFilter: 'ALL',
    bayFilter: 'ALL',
    viewMode: 'grid',
  });

  const mechanicsList = useMemo(() => {
    const names = new Set<string>();
    items.forEach((item) => {
      if (item.mechanicName) names.add(item.mechanicName);
    });
    liveMechanics.forEach((m) => names.add(m.name));
    return Array.from(names);
  }, [items, liveMechanics]);

  const filteredItems = useMemo(() => {
    return filterAdminRepairs(items, filters);
  }, [items, filters]);

  function handleFilterChange(updated: Partial<RepairsFilterState>) {
    setFilters((prev) => ({ ...prev, ...updated }));
  }

  function handleOpenDrawer(item: AdminMotorRepairItem) {
    setSelectedItem(item);
    setIsDrawerOpen(true);
    if (onFetchOnShiftMechanics) {
      void onFetchOnShiftMechanics().then((mechs) => {
        if (mechs) setLiveMechanics(mechs);
      });
    }
  }

  function handleCloseDrawer() {
    setIsDrawerOpen(false);
  }

  function handleManualRefresh() {
    startTransition(async () => {
      const refreshed = await onRefresh();
      if (refreshed) {
        setItems(refreshed.items);
        setSummary(refreshed.summary);
        if (refreshed.mechanics) {
          setLiveMechanics(refreshed.mechanics);
        }
        if (selectedItem) {
          const updatedSelected = refreshed.items.find((i) => i.id === selectedItem.id);
          if (updatedSelected) {
            setSelectedItem(updatedSelected);
          }
        }
      }
    });
  }

  async function handleReassign(
    workOrderId: string,
    orderNumber: string,
    mechanicId: string,
    mechanicName: string,
    bayId?: string | null,
    reason?: string
  ): Promise<boolean> {
    const success = await onReassignMechanic(
      workOrderId,
      orderNumber,
      mechanicId,
      mechanicName,
      bayId,
      reason
    );

    if (success) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === workOrderId || item.orderNumber === orderNumber
            ? { ...item, mechanicId, mechanicName }
            : item
        )
      );

      if (selectedItem && (selectedItem.id === workOrderId || selectedItem.orderNumber === orderNumber)) {
        setSelectedItem((prev) => (prev ? { ...prev, mechanicId, mechanicName } : null));
      }
    }

    return success;
  }

  function renderMainContent() {
    if (filters.viewMode === 'table') {
      return <RepairsTable items={filteredItems} onSelect={handleOpenDrawer} />;
    }

    if (filteredItems.length === 0) {
      return (
        <div className="bg-bg-surface border border-border-subtle rounded-xl p-12 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-border-subtle/50 text-text-muted flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-text-primary">No Matching Workshop Repairs</div>
          <p className="text-xs text-text-muted max-w-sm mx-auto">
            There are currently no active customer motorcycles matching your selected filter criteria.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filteredItems.map((item) => (
          <RepairMotorCard key={item.id} item={item} onSelect={handleOpenDrawer} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Multi-Axis Filter Bar */}
      <RepairsFilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        mechanicsList={mechanicsList}
        baysList={baysList}
        totalResults={filteredItems.length}
        onRefresh={handleManualRefresh}
        isRefreshing={isPending}
      />

      {/* KPI Cards Summary */}
      <RepairsKpiSummary summary={summary} />

      {/* Main View: Grid vs Table */}
      {renderMainContent()}

      {/* Slide-over Inspection Drawer */}
      <RepairInspectionDrawer
        item={selectedItem}
        isOpen={isDrawerOpen}
        onClose={handleCloseDrawer}
        availableMechanics={liveMechanics}
        onReassignMechanic={handleReassign}
      />
    </div>
  );
}
