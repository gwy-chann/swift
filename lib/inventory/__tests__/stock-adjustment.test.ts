import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateStockAdjustmentDelta,
  formatAdjustmentChange,
  validateAdjustmentPayload
} from '../stock-adjustment.ts';

describe('stock-adjustment domain engine', () => {
  describe('calculateStockAdjustmentDelta', () => {
    it('computes positive delta for Restock Inbound (Scenario 2)', () => {
      const result = calculateStockAdjustmentDelta({
        currentStock: 2,
        type: 'Restock Inbound',
        quantity: 10,
        mode: 'add'
      });

      assert.equal(result.delta, 10);
      assert.equal(result.resultingStock, 12);
      assert.equal(result.formattedChange, '+10 Units');
    });

    it('computes negative delta for Damaged Goods (Scenario 3)', () => {
      const result = calculateStockAdjustmentDelta({
        currentStock: 14,
        type: 'Damaged Goods',
        quantity: 2,
        mode: 'deduct'
      });

      assert.equal(result.delta, -2);
      assert.equal(result.resultingStock, 12);
      assert.equal(result.formattedChange, '-2 Units');
    });

    it('floors resulting stock at 0 when deducting more than on-hand stock', () => {
      const result = calculateStockAdjustmentDelta({
        currentStock: 3,
        type: 'Damaged Goods',
        quantity: 10,
        mode: 'deduct'
      });

      assert.equal(result.delta, -10);
      assert.equal(result.resultingStock, 0); // Floored at 0
    });

    it('computes singular Unit label for 1 unit delta', () => {
      const resultAdd = calculateStockAdjustmentDelta({
        currentStock: 5,
        type: 'Restock Inbound',
        quantity: 1,
        mode: 'add'
      });
      assert.equal(resultAdd.formattedChange, '+1 Unit');

      const resultDeduct = calculateStockAdjustmentDelta({
        currentStock: 5,
        type: 'Shrinkage',
        quantity: 1,
        mode: 'deduct'
      });
      assert.equal(resultDeduct.formattedChange, '-1 Unit');
    });
  });

  describe('validateAdjustmentPayload', () => {
    it('returns valid for well-formed payload', () => {
      const validation = validateAdjustmentPayload({
        sku: 'YAM-NMAX-BL01',
        type: 'Restock Inbound',
        quantity: 10,
        mode: 'add',
        user: 'Admin'
      });
      assert.equal(validation.isValid, true);
      assert.equal(validation.errorMessage, undefined);
    });

    it('rejects zero or negative quantity', () => {
      const zeroQty = validateAdjustmentPayload({
        sku: 'YAM-NMAX-BL01',
        type: 'Restock Inbound',
        quantity: 0,
        mode: 'add',
        user: 'Admin'
      });
      assert.equal(zeroQty.isValid, false);

      const negQty = validateAdjustmentPayload({
        sku: 'YAM-NMAX-BL01',
        type: 'Restock Inbound',
        quantity: -5,
        mode: 'add',
        user: 'Admin'
      });
      assert.equal(negQty.isValid, false);
    });

    it('rejects missing SKU', () => {
      const noSku = validateAdjustmentPayload({
        sku: '',
        type: 'Restock Inbound',
        quantity: 5,
        mode: 'add',
        user: 'Admin'
      });
      assert.equal(noSku.isValid, false);
    });
  });

  describe('formatAdjustmentChange', () => {
    it('formats positive and negative numbers accurately', () => {
      assert.equal(formatAdjustmentChange(10), '+10 Units');
      assert.equal(formatAdjustmentChange(-2), '-2 Units');
      assert.equal(formatAdjustmentChange(1), '+1 Unit');
      assert.equal(formatAdjustmentChange(-1), '-1 Unit');
      assert.equal(formatAdjustmentChange(0), '0 Units');
    });
  });
});
