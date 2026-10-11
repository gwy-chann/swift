import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { adjustProductStockAction } from '../../admin/product-actions.ts';
import { InventoryStore } from '../../store/inventory-store.ts';
import { MOCK_PRODUCTS } from '../../mock-data/products.ts';

describe('Atomic Stock Adjustment RPC & Store Rollback Engine', () => {
  describe('adjustProductStockAction', () => {
    it('executes a valid positive restock adjustment', async () => {
      const result = await adjustProductStockAction({
        sku: 'YAM-NMAX-BL01',
        type: 'Restock Inbound',
        delta: 10,
        reason: 'Received supplier delivery PO-1044',
        userName: 'Carlos Rodriguez (Admin)'
      });

      assert.equal(result.success, true);
      if (result.success) {
        assert.equal(result.sku, 'YAM-NMAX-BL01');
        assert.equal(result.quantityDelta, 10);
        assert.equal(result.newStock, result.previousStock + 10);
        assert.ok(result.logId);
      }
    });

    it('rejects an adjustment when delta is zero', async () => {
      const result = await adjustProductStockAction({
        sku: 'YAM-NMAX-BL01',
        type: 'Audit Adjustment',
        delta: 0,
        reason: 'No change'
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.code, 'ZERO_DELTA_NOT_ALLOWED');
        assert.ok(result.error.includes('zero'));
      }
    });

    it('rejects an over-deduction exceeding available on-hand stock (INSUFFICIENT_STOCK)', async () => {
      const result = await adjustProductStockAction({
        sku: 'YAM-NMAX-BL01',
        type: 'Damaged Goods',
        delta: -9999, // Exceeds any reasonable on-hand count
        reason: 'Severe inventory water damage'
      });

      assert.equal(result.success, false);
      if (!result.success) {
        assert.equal(result.code, 'INSUFFICIENT_STOCK');
        assert.ok(result.error.toLowerCase().includes('insufficient'));
      }
    });
  });

  describe('InventoryStore Optimistic Updates & Rollback', () => {
    let store: InventoryStore;

    beforeEach(() => {
      store = new InventoryStore();
      store.hydrateProducts(MOCK_PRODUCTS.map((p) => ({ ...p })));
    });

    it('optimistically updates stock and returns snapshot details', () => {
      const targetSku = 'YAM-NMAX-BL01';
      const initialProduct = store.getState().products.find((p) => p.sku === targetSku);
      assert.ok(initialProduct);
      const initialStock = initialProduct.stock;

      const snapshot = store.adjustStock({
        sku: targetSku,
        type: 'Restock Inbound',
        units: 5,
        reason: 'Optimistic Intake',
        user: 'Staff Member'
      });

      assert.equal(snapshot.previousStock, initialStock);
      assert.equal(snapshot.newStock, initialStock + 5);
      assert.ok(snapshot.logId);

      const updatedProduct = store.getState().products.find((p) => p.sku === targetSku);
      assert.equal(updatedProduct?.stock, initialStock + 5);

      const firstLog = store.getState().adjustmentLogs[0];
      assert.equal(firstLog.id, snapshot.logId);
    });

    it('rolls back optimistic stock and removes optimistic log on transaction failure', () => {
      const targetSku = 'YAM-NMAX-BL01';
      const initialProduct = store.getState().products.find((p) => p.sku === targetSku);
      assert.ok(initialProduct);
      const initialStock = initialProduct.stock;

      // 1. Optimistic modification
      const snapshot = store.adjustStock({
        sku: targetSku,
        type: 'Damaged Goods',
        units: -1,
        reason: 'Broken packaging',
        user: 'Staff Member'
      });

      assert.equal(store.getState().products.find((p) => p.sku === targetSku)?.stock, initialStock - 1);

      // 2. Simulated rollback on rejection
      store.rollbackStock({
        sku: targetSku,
        previousStock: snapshot.previousStock,
        logId: snapshot.logId
      });

      // 3. Verify stock restored and log removed
      const restoredProduct = store.getState().products.find((p) => p.sku === targetSku);
      assert.equal(restoredProduct?.stock, initialStock);

      const matchingLog = store.getState().adjustmentLogs.find((l) => l.id === snapshot.logId);
      assert.equal(matchingLog, undefined);
    });
  });
});
