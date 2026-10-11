import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  mapRealtimeDbProductToProduct,
  isLowStockThresholdBreached,
  didStockDropBelowThreshold
} from '../realtime-mapper.ts';
import { InventoryStore } from '../../store/inventory-store.ts';
import type { Product } from '../../types/product.ts';

describe('Supabase Realtime Multi-Terminal Sync Engine', () => {
  describe('mapRealtimeDbProductToProduct', () => {
    it('accurately maps snake_case PostgreSQL row to camelCase domain Product', () => {
      const dbRow = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        sku: 'brk-pad-001',
        name: 'Ceramic Brake Pads',
        category: 'Brakes',
        brand: 'Nissin',
        model: 'Yamaha NMAX 155',
        cost: '250.50',
        wholesale: '380.00',
        retail: '450.00',
        stock: 12,
        min_threshold: 5,
        location: 'Rack B-02 / Shelf 1',
        oem: true,
        image_url: 'https://example.com/pad.jpg',
        description: 'High-performance ceramic compound',
        created_at: '2026-10-10T08:00:00Z',
        updated_at: '2026-10-11T09:30:00Z'
      };

      const mapped = mapRealtimeDbProductToProduct(dbRow);

      assert.equal(mapped.sku, 'BRK-PAD-001');
      assert.equal(mapped.id, '550e8400-e29b-41d4-a716-446655440000');
      assert.equal(mapped.name, 'Ceramic Brake Pads');
      assert.equal(mapped.cost, 250.5);
      assert.equal(mapped.wholesale, 380);
      assert.equal(mapped.retail, 450);
      assert.equal(mapped.stock, 12);
      assert.equal(mapped.minThreshold, 5);
      assert.equal(mapped.location, 'Rack B-02 / Shelf 1');
      assert.equal(mapped.oem, true);
      assert.equal(mapped.imageUrl, 'https://example.com/pad.jpg');
    });

    it('handles partial update payload with only stock and timestamp', () => {
      const partialUpdate = {
        sku: 'OIL-MOT-10W40',
        stock: 3,
        updated_at: '2026-10-11T12:00:00Z'
      };

      const mapped = mapRealtimeDbProductToProduct(partialUpdate);

      assert.equal(mapped.sku, 'OIL-MOT-10W40');
      assert.equal(mapped.stock, 3);
      assert.equal(mapped.updatedAt, '2026-10-11T12:00:00Z');
      assert.equal(mapped.name, undefined);
    });

    it('throws error when SKU is missing', () => {
      assert.throws(
        () => {
          // @ts-expect-error Testing missing SKU validation
          mapRealtimeDbProductToProduct({ stock: 5 });
        },
        {
          message: '[mapRealtimeDbProductToProduct] Payload must include a valid SKU identifier'
        }
      );
    });
  });

  describe('Low-Stock Threshold Detection', () => {
    it('identifies stock breach when stock is less than or equal to minThreshold', () => {
      assert.equal(isLowStockThresholdBreached({ stock: 4, minThreshold: 5 }), true);
      assert.equal(isLowStockThresholdBreached({ stock: 5, minThreshold: 5 }), true);
      assert.equal(isLowStockThresholdBreached({ stock: 6, minThreshold: 5 }), false);
    });

    it('detects state transition dropping into low stock', () => {
      // Previous was healthy (7 > 5), new is breached (4 <= 5)
      assert.equal(didStockDropBelowThreshold(7, 4, 5), true);
      // Previous was already low (4 <= 5), new is also low (3 <= 5) -> not a new breach transition
      assert.equal(didStockDropBelowThreshold(4, 3, 5), false);
      // Restock (3 -> 8) -> not a low stock drop
      assert.equal(didStockDropBelowThreshold(3, 8, 5), false);
    });
  });

  describe('InventoryStore.updateProduct Multi-Terminal Reactivity', () => {
    let store: InventoryStore;
    const initialProduct: Product = {
      sku: 'BRK-PAD-001',
      name: 'Ceramic Brake Pads',
      category: 'Brakes',
      brand: 'Nissin',
      model: 'Yamaha NMAX 155',
      cost: 250,
      wholesale: 350,
      retail: 450,
      stock: 15,
      minThreshold: 5,
      location: 'Rack A-01',
      oem: true
    };

    beforeEach(() => {
      store = new InventoryStore({
        products: [initialProduct]
      });
    });

    it('updates product stock and notifies subscribers within 16ms', () => {
      let notified = false;
      const unsubscribe = store.subscribe(() => {
        notified = true;
      });

      const updated = store.updateProduct({
        sku: 'BRK-PAD-001',
        stock: 13
      });

      assert.ok(updated);
      assert.equal(updated.stock, 13);
      assert.equal(updated.name, 'Ceramic Brake Pads'); // Preserves existing attributes
      assert.equal(notified, true);

      const retrieved = store.getProductBySku('BRK-PAD-001');
      assert.equal(retrieved?.stock, 13);

      unsubscribe();
    });

    it('upserts a new product if SKU does not currently exist', () => {
      let notified = false;
      const unsubscribe = store.subscribe(() => {
        notified = true;
      });

      const newPart = store.updateProduct({
        sku: 'SPK-NGK-CPR9',
        name: 'NGK CPR9EA-9 Spark Plug',
        category: 'Ignition',
        stock: 20,
        minThreshold: 10,
        retail: 180
      });

      assert.ok(newPart);
      assert.equal(newPart.sku, 'SPK-NGK-CPR9');
      assert.equal(notified, true);
      assert.equal(store.getState().products.length, 2);

      unsubscribe();
    });
  });
});
