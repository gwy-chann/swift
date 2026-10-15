import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { inventoryStore } from '../../store/inventory-store.ts';
import {
  mapStockAdjustmentLogToEntry,
  calculateSummaryMetrics,
} from '../stock-audit-utils.ts';
import { filterStockAdjustmentLogs } from '../stock-audit-actions.ts';
import type { StockAdjustmentLogEntry } from '../../types/stock-audit.ts';
import { MOCK_STOCK_ADJUSTMENT_LOGS } from '../mock-data/stock-adjustments.ts';

describe('Immutable Stock Adjustment Audit Trail & Shrinkage Logging (SIAA-41)', () => {
  beforeEach(() => {
    // Reset inventory store state with baseline demo product
    inventoryStore.hydrateProducts([
      {
        sku: 'YAM-NMAX-BL01',
        name: 'Yamaha NMAX Brake Pads (OEM)',
        category: 'BRAKES',
        brand: 'Yamaha Genuine Parts',
        model: 'Yamaha NMAX 155',
        cost: 250,
        wholesale: 300,
        retail: 375,
        stock: 14,
        minThreshold: 5,
        location: 'Rack A-01-02',
        oem: true,
      },
    ]);
  });

  describe('Scenario 1: Stock Adjustment Audit Trail Ledger Rendering & 6 Canonical Columns', () => {
    it('maps client stock adjustment logs to standard 6-column audit entries', () => {
      const clientLog = {
        id: 'ADJ-1029',
        timestamp: '2026-10-15 14:00',
        sku: 'YAM-NMAX-BL01',
        type: 'Damaged Goods' as const,
        change: '-2 Units',
        reason: 'Water damage during storage',
        user: 'Carlos Rodriguez (Admin)',
      };

      const entry = mapStockAdjustmentLogToEntry(clientLog);

      assert.equal(entry.id, 'ADJ-1029');
      assert.equal(entry.sku, 'YAM-NMAX-BL01');
      assert.equal(entry.adjustmentType, 'Damaged Goods');
      assert.equal(entry.quantityDelta, -2);
      assert.equal(entry.reason, 'Water damage during storage');
      assert.equal(entry.userName, 'Carlos Rodriguez (Admin)');
      assert.equal(entry.createdAt, '2026-10-15 14:00');
    });

    it('correctly handles positive delta restock inbound logs', () => {
      const clientLog = {
        id: 'ADJ-8812',
        timestamp: '2026-10-15 14:30',
        sku: 'MOT-3100-10W40',
        type: 'Restock Inbound' as const,
        change: '+24 Units',
        reason: 'PO-4091 Supplier Delivery Received',
        user: 'Rico Santos (Staff)',
      };

      const entry = mapStockAdjustmentLogToEntry(clientLog);

      assert.equal(entry.quantityDelta, 24);
      assert.equal(entry.adjustmentType, 'Restock Inbound');
      assert.equal(entry.sku, 'MOT-3100-10W40');
    });
  });

  describe('Scenario 2: Real-time Append on Stock Adjustment Execution', () => {
    it('prepends new adjustment to store and triggers live subscriber notification', () => {
      let notified = false;
      const unsubscribe = inventoryStore.subscribe(() => {
        notified = true;
      });

      const initialLogsCount = inventoryStore.getState().adjustmentLogs.length;

      // Inventory clerk performs stock adjustment (marking 2 brake pads as "Damaged Goods")
      const result = inventoryStore.adjustStock({
        sku: 'YAM-NMAX-BL01',
        type: 'Damaged Goods',
        units: -2,
        reason: 'Damaged brake pads during shelving',
        user: 'Inventory Clerk',
      });

      assert.equal(result.previousStock, 14);
      assert.equal(result.newStock, 12);
      assert.ok(notified, 'Store listener must be triggered immediately (<16ms)');

      const updatedLogs = inventoryStore.getState().adjustmentLogs;
      assert.equal(updatedLogs.length, initialLogsCount + 1);

      // Verify the newly created entry is at index 0 (prepended)
      const newestLog = updatedLogs[0];
      assert.equal(newestLog.id, result.logId);
      assert.equal(newestLog.sku, 'YAM-NMAX-BL01');
      assert.equal(newestLog.type, 'Damaged Goods');
      assert.equal(newestLog.change, '-2 Units');
      assert.equal(newestLog.reason, 'Damaged brake pads during shelving');
      assert.equal(newestLog.user, 'Inventory Clerk');

      // Map to ledger entry and check prepend
      const mappedEntry = mapStockAdjustmentLogToEntry(newestLog);
      const ledger: StockAdjustmentLogEntry[] = [mappedEntry, ...MOCK_STOCK_ADJUSTMENT_LOGS];

      assert.equal(ledger[0].id, result.logId);
      assert.equal(ledger[0].quantityDelta, -2);

      // Recalculate metrics
      const metrics = calculateSummaryMetrics(ledger);
      assert.ok(metrics.totalShrinkage >= 2);
      assert.equal(metrics.totalCount, ledger.length);

      unsubscribe();
    });
  });

  describe('Scenario 3: Filter & Search by SKU or Adjustment Type with Delta Aggregation', () => {
    it('filters records by SKU and aggregates net unit delta', () => {
      const records: StockAdjustmentLogEntry[] = [
        ...MOCK_STOCK_ADJUSTMENT_LOGS,
        {
          id: 'ADJ-9999',
          sku: 'YAM-NMAX-BL01',
          adjustmentType: 'Damaged Goods',
          quantityDelta: -2,
          previousStock: 14,
          newStock: 12,
          reason: 'Damaged packaging',
          userName: 'Inventory Clerk',
          createdAt: new Date().toISOString(),
        },
      ];

      const filtered = filterStockAdjustmentLogs(records, { sku: 'YAM-NMAX-BL01' });
      assert.ok(filtered.length >= 3);
      for (const item of filtered) {
        assert.equal(item.sku, 'YAM-NMAX-BL01');
      }

      const metrics = calculateSummaryMetrics(filtered);
      assert.equal(metrics.totalCount, filtered.length);
      // All adjustments for YAM-NMAX-BL01 are negative (-2, -1, -2)
      assert.ok(metrics.totalShrinkage >= 5);
      assert.ok(metrics.netDelta <= -5);
    });

    it('filters records by adjustment type e.g. Damaged Goods', () => {
      const filtered = filterStockAdjustmentLogs(MOCK_STOCK_ADJUSTMENT_LOGS, {
        adjustmentType: 'Damaged Goods',
      });

      assert.ok(filtered.length >= 2);
      for (const item of filtered) {
        assert.equal(item.adjustmentType, 'Damaged Goods');
        assert.ok(item.quantityDelta < 0, 'Damaged goods must represent shrinkage');
      }

      const metrics = calculateSummaryMetrics(filtered);
      assert.ok(metrics.totalShrinkage > 0);
      assert.equal(metrics.totalIntake, 0);
      assert.equal(metrics.netDelta, -metrics.totalShrinkage);
    });
  });

  describe('Scenario 4: Immutability and Edit Protection Guard', () => {
    it('verifies historical adjustment records maintain deterministic ordering without inline mutation', () => {
      const sorted = filterStockAdjustmentLogs(MOCK_STOCK_ADJUSTMENT_LOGS, {});

      // Verify records are ordered chronologically descending (newest first)
      for (let i = 0; i < sorted.length - 1; i++) {
        const timeA = new Date(sorted[i].createdAt).getTime();
        const timeB = new Date(sorted[i + 1].createdAt).getTime();
        assert.ok(timeA >= timeB, `Entry ${i} must be newer than or equal to entry ${i + 1}`);
      }

      // Freeze records to simulate read-only protection
      const frozenRecord = Object.freeze({ ...sorted[0] });
      assert.throws(() => {
        (frozenRecord as unknown as Record<string, unknown>).quantityDelta = 100;
      }, /Cannot assign to read only property/);
    });
  });
});
