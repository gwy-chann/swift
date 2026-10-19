'use client';

import React, { useState, useEffect, useTransition } from 'react';
import {
  Download,
  Search,
  Filter,
  RefreshCw,
  Boxes,
} from 'lucide-react';
import type {
  StockAdjustmentLogEntry,
  StockAuditSummaryMetrics,
} from '@/lib/types/stock-audit';
import {
  getStockAdjustmentLogsAction,
  exportStockAdjustmentLogsAction,
} from '@/lib/admin/stock-audit-actions';
import {
  mapStockAdjustmentLogToEntry,
  calculateSummaryMetrics,
} from '@/lib/admin/stock-audit-utils';
import { inventoryStore } from '@/lib/store/inventory-store';
import { StockAuditSummaryKpis } from './stock-audit-summary-kpis';
import { StockAuditTable } from './stock-audit-table';

interface StockAuditPanelProps {
  initialLogs: StockAdjustmentLogEntry[];
  initialMetrics: StockAuditSummaryMetrics;
  initialTotal: number;
}

export function StockAuditPanel({
  initialLogs,
  initialMetrics,
  initialTotal,
}: StockAuditPanelProps) {
  const [logs, setLogs] = useState<StockAdjustmentLogEntry[]>(initialLogs);
  const [metrics, setMetrics] =
    useState<StockAuditSummaryMetrics>(initialMetrics);
  const [totalCount, setTotalCount] = useState<number>(initialTotal);
  const [selectedType, setSelectedType] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Scenario 2: Real-time Append on Stock Adjustment Execution
  useEffect(() => {
    let lastSeenCount = inventoryStore.getState().adjustmentLogs.length;

    const unsubscribe = inventoryStore.subscribe(() => {
      const currentLogs = inventoryStore.getState().adjustmentLogs;
      if (currentLogs.length > lastSeenCount) {
        const newlyAdded = currentLogs.slice(0, currentLogs.length - lastSeenCount);
        lastSeenCount = currentLogs.length;

        const mappedEntries: StockAdjustmentLogEntry[] = newlyAdded.map(
          mapStockAdjustmentLogToEntry
        );

        setLogs((prevLogs) => {
          const existingIds = new Set(prevLogs.map((l) => l.id));
          const uniqueNew = mappedEntries.filter((e) => !existingIds.has(e.id));
          if (uniqueNew.length === 0) return prevLogs;

          const updated = [...uniqueNew, ...prevLogs];
          const updatedMetrics = calculateSummaryMetrics(updated);
          setMetrics(updatedMetrics);
          setTotalCount(updated.length);
          return updated;
        });
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const fetchFilteredLogs = (type: string, search: string) => {
    startTransition(async () => {
      const res = await getStockAdjustmentLogsAction({
        adjustmentType: type,
        search,
      });

      if (res.success) {
        setLogs(res.logs);
        setMetrics(res.metrics);
        setTotalCount(res.total);
      }
    });
  };

  const handleRefresh = () => {
    fetchFilteredLogs(selectedType, searchQuery);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const res = await exportStockAdjustmentLogsAction({
        adjustmentType: selectedType,
        search: searchQuery,
      });

      if (res.success && res.csvContent) {
        const blob = new Blob([res.csvContent], {
          type: 'text/csv;charset=utf-8;',
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute(
          'download',
          res.filename || `stock-adjustment-audit-${new Date().toISOString().slice(0, 10)}.csv`
        );
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    } catch {
      // Graceful error suppression on export failure
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Aggregated Shrinkage & Inventory KPIs */}
      <StockAuditSummaryKpis metrics={metrics} isLoading={isPending} />

      {/* 2. Ledger Panel Container */}
      <div className="rounded-xl bg-bg-card border border-border shadow-xs overflow-hidden">
        {/* Panel Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Boxes className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-text-primary">
                Stock Adjustment Audit Trail
              </h3>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-bg-muted text-text-secondary border border-border">
                Immutable Records
              </span>
              <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-light text-primary border border-primary-border">
                {totalCount} Total Logs
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1">
              Append-only statutory audit trail of physical counts, write-offs, shrinkage anomalies, and supplier returns.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* SKU / Fulltext Search */}
            <div className="relative min-w-50 flex-1 sm:flex-initial">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <input
                id="stockAuditFilterSku"
                type="text"
                placeholder="Search SKU, reason, user..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  fetchFilteredLogs(selectedType, e.target.value);
                }}
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-bg-input border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
              />
            </div>

            {/* Adjustment Type Dropdown Filter */}
            <div className="relative flex items-center">
              <Filter className="w-3.5 h-3.5 absolute left-2.5 text-text-muted pointer-events-none" />
              <select
                id="stockAuditFilterType"
                value={selectedType}
                onChange={(e) => {
                  const val = e.target.value;
                  setSelectedType(val);
                  fetchFilteredLogs(val, searchQuery);
                }}
                className="pl-8 pr-7 py-1.5 text-xs rounded-lg bg-bg-input border border-border text-text-primary focus:outline-none focus:border-border-focus cursor-pointer appearance-none"
              >
                <option value="All">All Adjustment Types</option>
                <option value="Physical Count">Physical Count</option>
                <option value="Damaged Goods">Damaged Goods</option>
                <option value="Supplier Return">Supplier Return</option>
                <option value="Internal Use">Internal Use</option>
                <option value="Restock Inbound">Restock Inbound</option>
                <option value="POS Sale">POS Sale</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={handleRefresh}
              disabled={isPending}
              title="Refresh stock audit trail"
              className="p-1.5 rounded-lg border border-border bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw
                className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`}
              />
            </button>

            {/* CSV Export Button */}
            <button
              id="exportStockAuditBtn"
              type="button"
              onClick={handleExportCsv}
              disabled={isExporting}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : 'Export Stock Audit Trail'}
            </button>
          </div>
        </div>

        {/* 3. Table of Records */}
        <StockAuditTable logs={logs} isLoading={isPending} />
      </div>
    </div>
  );
}
