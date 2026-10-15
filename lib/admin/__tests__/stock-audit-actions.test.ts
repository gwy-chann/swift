import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getStockAdjustmentLogsAction,
  exportStockAdjustmentLogsAction,
  resetMemoryStockAdjustmentLogs,
  setForceMemoryStockLogs,
} from '../stock-audit-actions.ts';

describe('Supabase Stock Adjustment Audit Trail Ledger & Shrinkage Analytics (SIAA-65)', () => {
  beforeEach(() => {
    resetMemoryStockAdjustmentLogs();
    setForceMemoryStockLogs(true);
  });

  describe('Scenario 1: Stock Adjustment Log Querying & Filtering', () => {
    it('retrieves adjustment logs sorted descending by createdAt', async () => {
      const response = await getStockAdjustmentLogsAction();

      assert.equal(response.success, true);
      assert.ok(response.logs.length > 0, 'Logs array should not be empty');

      // Verify descending timestamp order
      for (let i = 0; i < response.logs.length - 1; i++) {
        const curr = new Date(response.logs[i].createdAt).getTime();
        const next = new Date(response.logs[i + 1].createdAt).getTime();
        assert.ok(curr >= next, `Log at index ${i} must be newer than or equal to ${i + 1}`);
      }
    });

    it('filters records by exact SKU', async () => {
      const response = await getStockAdjustmentLogsAction({ sku: 'YAM-NMAX-BL01' });

      assert.equal(response.success, true);
      assert.ok(response.logs.length >= 2, 'Should find YAM-NMAX-BL01 adjustment records');
      for (const log of response.logs) {
        assert.equal(log.sku, 'YAM-NMAX-BL01');
      }
    });

    it('filters records by adjustment type', async () => {
      const response = await getStockAdjustmentLogsAction({ adjustmentType: 'Damaged Goods' });

      assert.equal(response.success, true);
      assert.ok(response.logs.length >= 2, 'Should find Damaged Goods adjustments');
      for (const log of response.logs) {
        assert.equal(log.adjustmentType, 'Damaged Goods');
      }
    });

    it('filters records using search string across reason and user', async () => {
      const response = await getStockAdjustmentLogsAction({ search: 'porcelain' });

      assert.equal(response.success, true);
      assert.equal(response.logs.length, 1);
      assert.equal(response.logs[0].sku, 'NGK-CPR8EA9');
    });

    it('handles pagination with limit and offset', async () => {
      const page1 = await getStockAdjustmentLogsAction({ limit: 2, offset: 0 });
      assert.equal(page1.success, true);
      assert.equal(page1.logs.length, 2);

      const page2 = await getStockAdjustmentLogsAction({ limit: 2, offset: 2 });
      assert.equal(page2.success, true);
      assert.equal(page2.logs.length, 2);

      assert.notEqual(page1.logs[0].id, page2.logs[0].id);
    });
  });

  describe('Scenario 2: Shrinkage Analytics & Aggregation Summary', () => {
    it('accurately computes summary metrics over filtered logs', async () => {
      const response = await getStockAdjustmentLogsAction({ sku: 'YAM-NMAX-BL01' });

      assert.equal(response.success, true);
      assert.ok(response.metrics.totalCount >= 2);
      // Both entries for YAM-NMAX-BL01 in mock store are negative (-2 and -1)
      assert.equal(response.metrics.totalShrinkage, 3);
      assert.equal(response.metrics.netDelta, -3);
      assert.equal(response.metrics.totalIntake, 0);
    });

    it('accurately computes shrinkage for Damaged Goods filter', async () => {
      const response = await getStockAdjustmentLogsAction({ adjustmentType: 'Damaged Goods' });

      assert.equal(response.success, true);
      assert.ok(response.metrics.totalShrinkage > 0);
      assert.equal(response.metrics.totalIntake, 0);
      assert.equal(response.metrics.netDelta, -response.metrics.totalShrinkage);
    });
  });

  describe('Scenario 3: Audit Trail CSV Export', () => {
    it('generates formatted CSV payload with RFC 4180 headers and timestamped filename', async () => {
      const result = await exportStockAdjustmentLogsAction({ sku: 'YAM-NMAX-BL01' });

      assert.equal(result.success, true);
      assert.ok(result.csvContent, 'CSV content must be returned');
      assert.ok(result.filename?.startsWith('stock-adjustment-audit-'));
      assert.ok(result.filename?.endsWith('.csv'));
      assert.ok(result.recordCount! >= 2);

      assert.ok(result.csvContent.includes('"Timestamp (UTC)","SKU","Adjustment Type"'));
      assert.ok(result.csvContent.includes('"YAM-NMAX-BL01"'));
    });
  });

  describe('Scenario 4: Error Handling & Validation', () => {
    it('returns error result when limit is non-positive', async () => {
      const response = await getStockAdjustmentLogsAction({ limit: -5 });
      assert.equal(response.success, false);
      assert.ok(response.error?.includes('Invalid filter parameters'));
    });
  });

  describe('Scenario 5: Database Connection & Fallback Path', () => {
    it('executes database query when forceMemoryStore is disabled', async () => {
      setForceMemoryStockLogs(false);
      const response = await getStockAdjustmentLogsAction({ limit: 5 });
      assert.equal(response.success, true);
      assert.ok(response.logs.length > 0);
      assert.ok(response.metrics.totalCount > 0);
    });
  });
});
