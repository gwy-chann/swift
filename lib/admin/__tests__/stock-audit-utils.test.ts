import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateSummaryMetrics,
  generateAuditCsv,
  formatAuditTimestamp,
} from '../stock-audit-utils.ts';
import type { StockAdjustmentLogEntry } from '../../types/stock-audit.ts';

describe('stock-audit-utils', () => {
  const sampleLogs: StockAdjustmentLogEntry[] = [
    {
      id: 'a0000000-0000-0000-0000-000000000001',
      sku: 'YAM-NMAX-BL01',
      adjustmentType: 'Physical Count',
      quantityDelta: -2,
      previousStock: 10,
      newStock: 8,
      reason: 'Missing item during count',
      userId: null,
      userName: 'Carlos Rodriguez',
      createdAt: '2026-09-28T14:22:00.000Z',
    },
    {
      id: 'a0000000-0000-0000-0000-000000000002',
      sku: 'MOT-3100-10W40',
      adjustmentType: 'Supplier Return',
      quantityDelta: 20,
      previousStock: 5,
      newStock: 25,
      reason: 'PO-1234 delivery',
      userId: null,
      userName: 'Rico Santos',
      createdAt: '2026-09-28T11:05:00.000Z',
    },
    {
      id: 'a0000000-0000-0000-0000-000000000003',
      sku: 'NGK-CPR8EA9',
      adjustmentType: 'Damaged Goods',
      quantityDelta: -5,
      previousStock: 15,
      newStock: 10,
      reason: 'Cracked "special" plugs, box dropped',
      userId: null,
      userName: 'Mike Morales',
      createdAt: '2026-09-27T16:45:00.000Z',
    },
  ];

  describe('calculateSummaryMetrics', () => {
    it('aggregates metrics correctly for mixed positive and negative deltas', () => {
      const metrics = calculateSummaryMetrics(sampleLogs);

      assert.equal(metrics.totalCount, 3);
      assert.equal(metrics.netDelta, 13); // -2 + 20 + -5 = 13
      assert.equal(metrics.totalShrinkage, 7); // |-2| + |-5| = 7
      assert.equal(metrics.totalIntake, 20); // 20
    });

    it('returns zeroes for an empty logs array', () => {
      const metrics = calculateSummaryMetrics([]);

      assert.equal(metrics.totalCount, 0);
      assert.equal(metrics.netDelta, 0);
      assert.equal(metrics.totalShrinkage, 0);
      assert.equal(metrics.totalIntake, 0);
    });

    it('correctly handles exclusively negative deltas (pure shrinkage)', () => {
      const pureShrinkage: StockAdjustmentLogEntry[] = [
        { ...sampleLogs[0], quantityDelta: -4 },
        { ...sampleLogs[2], quantityDelta: -6 },
      ];
      const metrics = calculateSummaryMetrics(pureShrinkage);

      assert.equal(metrics.totalCount, 2);
      assert.equal(metrics.netDelta, -10);
      assert.equal(metrics.totalShrinkage, 10);
      assert.equal(metrics.totalIntake, 0);
    });
  });

  describe('formatAuditTimestamp', () => {
    it('formats ISO date into standard UTC representation', () => {
      const formatted = formatAuditTimestamp('2026-09-28T14:22:00.000Z');
      assert.equal(formatted, '2026-09-28 14:22');
    });

    it('falls back gracefully if given an invalid date', () => {
      const invalid = 'not-a-valid-date';
      assert.equal(formatAuditTimestamp(invalid), invalid);
    });
  });

  describe('generateAuditCsv', () => {
    it('produces RFC 4180 CSV with headers and escaped fields', () => {
      const csv = generateAuditCsv(sampleLogs);

      // Verify header presence
      assert.ok(
        csv.includes(
          '"Timestamp (UTC)","SKU","Adjustment Type","Quantity Delta","Previous Stock","New Stock","Reason / Reference","Authorized User"'
        )
      );

      // Verify row output
      assert.ok(csv.includes('"YAM-NMAX-BL01"'));
      assert.ok(csv.includes('"-2"'));
      assert.ok(csv.includes('"+20"'));

      // Verify quote and comma escaping in reason
      assert.ok(csv.includes('"Cracked ""special"" plugs, box dropped"'));
    });
  });
});
