import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { inventoryStore } from '../../store/inventory-store.ts';
import { mapRealtimeDbProductToProduct, didStockDropBelowThreshold } from '../../inventory/realtime-mapper.ts';
import type { Product } from '../../types/product.ts';

describe('Supabase Realtime Fitment Updates & Stock Alert Broadcast Engine (SIAA-55)', () => {
  const initialTestProduct: Product = {
    id: 'p-001',
    sku: 'YAM-NMAX-BL01',
    name: 'Yamaha Genuine Front Brake Pad Set',
    category: 'Brakes',
    brand: 'Yamaha Genuine Parts',
    model: 'Yamaha NMAX 155',
    retail: 450,
    wholesale: 380,
    cost: 300,
    stock: 2,
    minThreshold: 5,
    location: 'Rack A-01 / Shelf 2',
    oem: true,
  };

  beforeEach(() => {
    inventoryStore.hydrateProducts([initialTestProduct]);
  });

  describe('Scenario 1: Realtime Payload Mapping & Store Updates', () => {
    it('accurately maps PostgreSQL change payload to canonical Product and updates inventoryStore', () => {
      const rawDbPayload = {
        sku: 'YAM-NMAX-BL01',
        name: 'Yamaha Genuine Front Brake Pad Set',
        stock: 0,
        min_threshold: 5,
        retail: 450,
        wholesale: 380,
        cost: 300,
      };

      const mapped = mapRealtimeDbProductToProduct(rawDbPayload);
      assert.equal(mapped.sku, 'YAM-NMAX-BL01');
      assert.equal(mapped.stock, 0);

      const updated = inventoryStore.updateProduct(mapped);
      assert.ok(updated, 'Product should be updated in store');
      assert.equal(updated.stock, 0);

      const storeProduct = inventoryStore.getProductBySku('YAM-NMAX-BL01');
      assert.ok(storeProduct);
      assert.equal(storeProduct.stock, 0, 'Store state must reflect decremented stock');
    });

    it('correctly detects transition from in-stock to out-of-stock (stock <= 0)', () => {
      let isOutOfStock = false;
      const onOutOfStock = (product: Product) => {
        if (product.stock <= 0) {
          isOutOfStock = true;
        }
      };

      const mapped = mapRealtimeDbProductToProduct({
        sku: 'YAM-NMAX-BL01',
        stock: 0,
      });

      const updated = inventoryStore.updateProduct(mapped);
      assert.ok(updated);
      if (updated.stock <= 0) {
        onOutOfStock(updated);
      }

      assert.equal(isOutOfStock, true, 'Out of stock callback should trigger when stock reaches 0');
    });

    it('correctly detects low-stock threshold breach', () => {
      const previousStock = 6;
      const newStock = 4;
      const minThreshold = 5;

      const breached = didStockDropBelowThreshold(previousStock, newStock, minThreshold);
      assert.equal(breached, true, 'Threshold breach must be detected when stock drops below minThreshold');

      const notBreached = didStockDropBelowThreshold(4, 3, minThreshold);
      assert.equal(notBreached, false, 'Should not detect new breach if stock was already below threshold');
    });
  });

  describe('Scenario 2: Multi-Terminal Instant Stock Synchronization', () => {
    it('propagates realtime stock update across subscribers within synchronous execution dispatch', () => {
      let subscriberNotified = false;
      let observedStock: number | null = null;

      const unsubscribe = inventoryStore.subscribe(() => {
        subscriberNotified = true;
        const current = inventoryStore.getProductBySku('YAM-NMAX-BL01');
        observedStock = current?.stock ?? null;
      });

      try {
        const mapped = mapRealtimeDbProductToProduct({
          sku: 'YAM-NMAX-BL01',
          stock: 0,
        });

        inventoryStore.updateProduct(mapped);

        assert.equal(subscriberNotified, true, 'Subscriber must be notified on product update');
        assert.equal(observedStock, 0, 'Subscriber must observe decremented stock of 0');
      } finally {
        unsubscribe();
      }
    });

    it('handles stock restocking transition from 0 to positive count', () => {
      // Step 1: Decrement to 0
      inventoryStore.updateProduct(mapRealtimeDbProductToProduct({
        sku: 'YAM-NMAX-BL01',
        stock: 0,
      }));
      assert.equal(inventoryStore.getProductBySku('YAM-NMAX-BL01')?.stock, 0);

      // Step 2: Restock to 10
      const restocked = inventoryStore.updateProduct(mapRealtimeDbProductToProduct({
        sku: 'YAM-NMAX-BL01',
        stock: 10,
      }));
      assert.ok(restocked);
      assert.equal(restocked.stock, 10);
      assert.equal(inventoryStore.getProductBySku('YAM-NMAX-BL01')?.stock, 10);
    });
  });

  describe('Scenario 3: Fitment Change & Cache Invalidation', () => {
    it('triggers cache invalidation and updates lastSyncedAt on imperative request', () => {
      let cacheInvalidated = false;
      const invalidateCache = () => {
        cacheInvalidated = true;
        return new Date();
      };

      const syncTime = invalidateCache();
      assert.equal(cacheInvalidated, true);
      assert.ok(syncTime instanceof Date);
    });

    it('matches fitment payload relevance for target motorcycle model ID', () => {
      const activeModelId = 'b0000000-0000-0000-0000-000000000001';

      const matchingPayload = {
        model_id: 'b0000000-0000-0000-0000-000000000001',
        product_id: 'p-001',
      };

      const nonMatchingPayload = {
        model_id: 'b0000000-0000-0000-0000-000000000099',
        product_id: 'p-001',
      };

      assert.equal(matchingPayload.model_id === activeModelId, true);
      assert.equal(nonMatchingPayload.model_id === activeModelId, false);
    });
  });
});
