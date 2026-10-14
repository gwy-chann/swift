import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cartStore } from '../../store/cart-store.ts';
import {
  dispatchMotoMatcherCartInsertion,
  toProductFromPartInput,
} from '../cart-dispatch.ts';
import { fromProductToComparisonPart } from '../comparison-matrix-contracts.ts';
import type { Product } from '../../types/product.ts';

describe('MotoMatcher 1-Click POS Cart Dispatch Engine (SIAA-25)', () => {
  const mockOemPart: Product = {
    sku: 'YAM-B6H-E4451-00',
    name: 'Yamaha Genuine Air Filter Element',
    category: 'Engine',
    brand: 'Yamaha Genuine',
    model: 'Yamaha NMAX 155',
    retail: 450,
    wholesale: 380,
    cost: 300,
    stock: 12,
    minThreshold: 4,
    location: 'Rack A-01 / Shelf 2',
    oem: true,
  };

  const mockAftermarketPart: Product = {
    sku: 'KOS-NMAX-AIR-PERF',
    name: 'Koso High-Flow Washable Air Filter',
    category: 'Engine',
    brand: 'Koso Performance',
    model: 'Yamaha NMAX 155',
    retail: 850,
    wholesale: 720,
    cost: 550,
    stock: 5,
    minThreshold: 2,
    location: 'Rack D-02 / Shelf 1',
    oem: false,
  };

  const mockOutOfStockPart: Product = {
    sku: 'OOS-SPARK-PLUG-RACE',
    name: 'NGK Iridium Racing Spark Plug CR8EIX',
    category: 'Ignition',
    brand: 'NGK',
    model: 'Universal',
    retail: 550,
    wholesale: 480,
    cost: 350,
    stock: 0,
    minThreshold: 5,
    location: 'Rack E-01 / Shelf 4',
    oem: false,
  };

  beforeEach(() => {
    cartStore.clearCart();
    cartStore.setPricingMode('retail');
    cartStore.setDiscountRate(0);
  });

  describe('Scenario 1: 1-Click Add to Cart Action', () => {
    it('appends an in-stock OEM part to the active POS cart with quantity 1', () => {
      const compPart = fromProductToComparisonPart(mockOemPart);

      const result = dispatchMotoMatcherCartInsertion({ part: compPart });

      assert.equal(result.success, true);
      assert.equal(result.status, 'ADDED_NEW');
      assert.equal(result.currentCartQty, 1);
      assert.equal(result.sku, mockOemPart.sku);
      assert.match(result.message, /Added Yamaha Genuine Air Filter Element to POS Cart!/);

      const state = cartStore.getState();
      assert.equal(state.items.length, 1);
      assert.equal(state.items[0].type, 'part');
      if (state.items[0].type === 'part') {
        assert.equal(state.items[0].sku, mockOemPart.sku);
        assert.equal(state.items[0].qty, 1);
        assert.equal(state.items[0].price, 450);
      }
    });

    it('appends an in-stock Aftermarket part with wholesale pricing when wholesale mode active', () => {
      cartStore.setPricingMode('wholesale');
      const compPart = fromProductToComparisonPart(mockAftermarketPart);

      const result = dispatchMotoMatcherCartInsertion({ part: compPart });

      assert.equal(result.success, true);
      assert.equal(result.status, 'ADDED_NEW');

      const state = cartStore.getState();
      assert.equal(state.items.length, 1);
      if (state.items[0].type === 'part') {
        assert.equal(state.items[0].price, 720); // wholesale price
      }
    });
  });

  describe('Scenario 2: Cart Badge Counter Synchronization', () => {
    it('synchronously increments totalCartItemCount immediately upon addition', () => {
      assert.equal(cartStore.getState().totals.itemCount, 0);

      const compOem = fromProductToComparisonPart(mockOemPart);
      const res1 = dispatchMotoMatcherCartInsertion({ part: compOem });
      assert.equal(res1.totalCartItemCount, 1);
      assert.equal(cartStore.getState().totals.itemCount, 1);

      const compAftermarket = fromProductToComparisonPart(mockAftermarketPart);
      const res2 = dispatchMotoMatcherCartInsertion({ part: compAftermarket });
      assert.equal(res2.totalCartItemCount, 2);
      assert.equal(cartStore.getState().totals.itemCount, 2);
    });
  });

  describe('Scenario 3: Out-of-Stock Prevention Guard', () => {
    it('blocks adding a part with 0 stock and returns OUT_OF_STOCK without mutating cart', () => {
      const compOos = fromProductToComparisonPart(mockOutOfStockPart);

      const result = dispatchMotoMatcherCartInsertion({ part: compOos });

      assert.equal(result.success, false);
      assert.equal(result.status, 'OUT_OF_STOCK');
      assert.match(result.message, /out of stock/i);
      assert.equal(cartStore.getState().items.length, 0);
      assert.equal(cartStore.getState().totals.itemCount, 0);
    });

    it('allows manager override for out-of-stock part when overrideStockGuard is true', () => {
      const compOos = fromProductToComparisonPart(mockOutOfStockPart);

      const result = dispatchMotoMatcherCartInsertion({
        part: compOos,
        overrideStockGuard: true,
      });

      assert.equal(result.success, true);
      assert.equal(result.status, 'ADDED_NEW');
      assert.equal(cartStore.getState().items.length, 1);
    });
  });

  describe('Scenario 4: Subsequent Additions Increment Quantity', () => {
    it('increments quantity on existing line item rather than creating duplicate lines', () => {
      const compPart = fromProductToComparisonPart(mockOemPart);

      // First addition
      const res1 = dispatchMotoMatcherCartInsertion({ part: compPart });
      assert.equal(res1.success, true);
      assert.equal(res1.status, 'ADDED_NEW');
      assert.equal(res1.currentCartQty, 1);

      // Second addition
      const res2 = dispatchMotoMatcherCartInsertion({ part: compPart });
      assert.equal(res2.success, true);
      assert.equal(res2.status, 'INCREMENTED_EXISTING');
      assert.equal(res2.currentCartQty, 2);
      assert.match(res2.message, /\(Qty: 2\)/);

      const state = cartStore.getState();
      assert.equal(state.items.length, 1, 'Should not create duplicate rows in cart');
      assert.equal(state.items[0].qty, 2);
      assert.equal(state.totals.itemCount, 2);
      assert.equal(state.totals.subtotal, 900); // 2 * 450
    });
  });

  describe('Scenario 5: Stock Cap Limit Guard', () => {
    it('prevents adding quantity exceeding total physical inventory', () => {
      const lowStockPart: Product = {
        ...mockAftermarketPart,
        sku: 'LOW-STOCK-BELT',
        stock: 2,
      };

      const comp = fromProductToComparisonPart(lowStockPart);

      // Add 2 units (max)
      dispatchMotoMatcherCartInsertion({ part: comp });
      dispatchMotoMatcherCartInsertion({ part: comp });

      assert.equal(cartStore.getState().items[0].qty, 2);

      // Attempt 3rd unit
      const res3 = dispatchMotoMatcherCartInsertion({ part: comp });
      assert.equal(res3.success, false);
      assert.equal(res3.status, 'EXCEEDS_STOCK');
      assert.match(res3.message, /Available stock limit reached/i);

      // Quantity must remain 2
      assert.equal(cartStore.getState().items[0].qty, 2);
    });
  });

  describe('Data Normalization Helper', () => {
    it('normalizes Product, ComparisonPartItem, and MotoMatcherMatrixPart', () => {
      const p1 = toProductFromPartInput(mockOemPart);
      assert.equal(p1.sku, mockOemPart.sku);

      const comp = fromProductToComparisonPart(mockAftermarketPart);
      const p2 = toProductFromPartInput(comp);
      assert.equal(p2.sku, mockAftermarketPart.sku);
      assert.equal(p2.retail, 850);
    });
  });
});
