'use server';

import type {
  StockAuditFilterOptions,
  StockAdjustmentLogEntry,
  StockAuditLogsResponse,
  StockAuditExportResult,
} from '../types/stock-audit.ts';
import { StockAuditFilterSchema } from '../types/stock-audit.ts';
import {
  calculateSummaryMetrics,
  generateAuditCsv,
  filterStockAdjustmentLogs,
} from './stock-audit-utils.ts';
import { MOCK_STOCK_ADJUSTMENT_LOGS } from './mock-data/stock-adjustments.ts';

let memoryStockAdjustmentLogs: StockAdjustmentLogEntry[] = [
  ...MOCK_STOCK_ADJUSTMENT_LOGS,
];
let forceMemoryStore = false;

/**
 * Toggles whether queries must use the in-memory store.
 * Primarily used during unit tests and offline benchmarking.
 */
export async function setForceMemoryStockLogs(force: boolean): Promise<void> {
  forceMemoryStore = force;
  await Promise.resolve();
}

/**
 * Resets in-memory fallback logs to initial mock data.
 * Used for testing and state isolation.
 */
export async function resetMemoryStockAdjustmentLogs(): Promise<void> {
  memoryStockAdjustmentLogs = MOCK_STOCK_ADJUSTMENT_LOGS.map((item) => ({
    ...item,
  }));
  await Promise.resolve();
}

/**
 * Appends a new stock adjustment record into memory store (used by RPC fallback/tests).
 */
export async function appendMemoryStockAdjustmentLog(
  log: StockAdjustmentLogEntry
): Promise<void> {
  memoryStockAdjustmentLogs.unshift(log);
  await Promise.resolve();
}

interface RawDbAdjustmentRow {
  id: string;
  sku: string;
  adjustment_type: string;
  quantity_delta: number;
  previous_stock: number;
  new_stock: number;
  reason: string;
  user_id: string | null;
  user_name: string;
  created_at: string;
}

function mapDbRowToEntry(row: RawDbAdjustmentRow): StockAdjustmentLogEntry {
  return {
    id: row.id,
    sku: row.sku,
    adjustmentType: row.adjustment_type,
    quantityDelta: row.quantity_delta,
    previousStock: row.previous_stock,
    newStock: row.new_stock,
    reason: row.reason || '',
    userId: row.user_id,
    userName: row.user_name || 'Staff Member',
    createdAt: row.created_at,
  };
}

/**
 * Server Action: Queries stock adjustment audit trail logs with multi-criteria filtering,
 * deterministic sort order, and real-time aggregate shrinkage metrics.
 */
export async function getStockAdjustmentLogsAction(
  rawFilters?: StockAuditFilterOptions
): Promise<StockAuditLogsResponse> {
  const parsed = StockAuditFilterSchema.safeParse(rawFilters || {});
  if (!parsed.success) {
    return {
      success: false,
      logs: [],
      metrics: {
        totalCount: 0,
        netDelta: 0,
        totalShrinkage: 0,
        totalIntake: 0,
      },
      total: 0,
      error: `Invalid filter parameters: ${parsed.error.message}`,
    };
  }

  const filters = parsed.data;

  // If in-memory store is explicitly forced or requested
  if (forceMemoryStore || filters.useMemoryStore) {
    const filtered = filterStockAdjustmentLogs(
      memoryStockAdjustmentLogs,
      filters
    );
    const metrics = calculateSummaryMetrics(filtered);
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const pagedLogs = filtered.slice(offset, offset + limit);

    return {
      success: true,
      logs: pagedLogs,
      metrics,
      total: filtered.length,
    };
  }

  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    let query = supabase
      .from('stock_adjustment_logs')
      .select('*')
      .order('created_at', { ascending: false });

    if (filters.sku && filters.sku.trim().length > 0) {
      query = query.ilike('sku', `%${filters.sku.trim()}%`);
    }

    if (
      filters.adjustmentType &&
      filters.adjustmentType.trim().length > 0 &&
      filters.adjustmentType !== 'All'
    ) {
      query = query.ilike('adjustment_type', filters.adjustmentType.trim());
    }

    if (filters.startDate) {
      query = query.gte('created_at', filters.startDate);
    }

    if (filters.endDate) {
      query = query.lte('created_at', filters.endDate);
    }

    const { data, error } = await query;

    if (error || !data) {
      throw error || new Error('No data returned from database query');
    }

    let allEntries = (data as RawDbAdjustmentRow[]).map(mapDbRowToEntry);

    // If text search was requested, apply across memory map
    if (filters.search && filters.search.trim().length > 0) {
      const q = filters.search.trim().toLowerCase();
      allEntries = allEntries.filter(
        (item) =>
          item.sku.toLowerCase().includes(q) ||
          item.reason.toLowerCase().includes(q) ||
          item.userName.toLowerCase().includes(q)
      );
    }

    const metrics = calculateSummaryMetrics(allEntries);
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const pagedLogs = allEntries.slice(offset, offset + limit);

    return {
      success: true,
      logs: pagedLogs,
      metrics,
      total: allEntries.length,
    };
  } catch (error) {
    // Diagnostic warning logged when falling back to memory store
    console.warn(
      'Notice: Falling back to in-memory stock adjustment ledger:',
      error instanceof Error ? error.message : error
    );
    const filtered = filterStockAdjustmentLogs(
      memoryStockAdjustmentLogs,
      filters
    );
    const metrics = calculateSummaryMetrics(filtered);
    const offset = filters.offset || 0;
    const limit = filters.limit || 50;
    const pagedLogs = filtered.slice(offset, offset + limit);

    return {
      success: true,
      logs: pagedLogs,
      metrics,
      total: filtered.length,
    };
  }
}

/**
 * Server Action: Exports matching stock adjustment audit logs into an RFC 4180-compliant CSV string.
 */
export async function exportStockAdjustmentLogsAction(
  rawFilters?: StockAuditFilterOptions
): Promise<StockAuditExportResult> {
  const parsed = StockAuditFilterSchema.safeParse(rawFilters || {});
  if (!parsed.success) {
    return {
      success: false,
      error: `Invalid export parameters: ${parsed.error.message}`,
    };
  }

  const exportFilters = {
    ...parsed.data,
    offset: 0,
    limit: 1000,
  };

  const response = await getStockAdjustmentLogsAction(exportFilters);
  if (!response.success) {
    return {
      success: false,
      error: response.error || 'Failed to retrieve stock adjustment records for export',
    };
  }

  const csvContent = generateAuditCsv(response.logs);
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-')
    .slice(0, 19);
  const filename = `stock-adjustment-audit-${timestamp}.csv`;

  return {
    success: true,
    csvContent,
    filename,
    recordCount: response.logs.length,
  };
}
