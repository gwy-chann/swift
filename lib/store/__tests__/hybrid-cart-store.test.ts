import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cartStore } from '../cart-store.ts';
import type { Product, LaborService } from '../../types/index.ts';

describe('Hybrid POS Cart & Line-Item Engine (SIAA-18)', () => {
  const mockPart: Product = {
    sku: 'MOT-3100-10W40',
    name: 'Motul 3100 Gold 4T 10W40 (1L)',
    category: 'Fluids',
    stock: 28,
    minThreshold: 15,
    location: 'Aisle 1 / Shelf 1',
    cost: 260,
    wholesale: 330,
    retail: 390,
    oem: false,
    model: 'Universal',
    brand: 'Motul'
  };

  const mockOutOfStockPart: Product = {
    sku: 'OOS-CHAIN-LUBE',
    name: 'Out of Stock Chain Lube',
    category: 'Fluids',
    stock: 0,
    minThreshold: 5,
    location: 'Aisle 1 / Shelf 3',
    cost: 150,
    wholesale: 200,
    retail: 250,
    oem: false,
    model: 'Universal',
    brand: 'Motul'
  };

  const mockService: LaborService = {
    code: 'SRV-CVT-01',
    name: 'CVT Cleaning & Regreasing',
    bay: 'Bay 2 / Scooter Bay',
    rate: 350,
    duration: '45 mins',
    description: 'Variator, clutch bell, pulley degrease & regrease'
  };

  beforeEach(() => {
    cartStore.clearCart();
    cartStore.setPricingMode('retail');
    cartStore.setDiscountRate(0);
  });

  describe('Scenario 1: Adding Physical Motorcycle Part to Cart', () => {
    it('adds physical part with SKU, name, unit price, and initial quantity 1', () => {
      cartStore.addPart(mockPart);

      const state = cartStore.getState();
      assert.equal(state.items.length, 1);

      const item = state.items[0];
      assert.equal(item.type, 'part');
      if (item.type === 'part') {
        assert.equal(item.sku, 'MOT-3100-10W40');
        assert.equal(item.name, 'Motul 3100 Gold 4T 10W40 (1L)');
        assert.equal(item.price, 390);
        assert.equal(item.qty, 1);
        assert.equal(item.location, 'Aisle 1 / Shelf 1');
      }
      assert.equal(state.totals.subtotal, 390);
      assert.equal(state.totals.total, 390);
      assert.equal(state.totals.itemCount, 1);
    });

    it('increments quantity upon repeated addition without duplicating rows', () => {
      cartStore.addPart(mockPart);
      cartStore.addPart(mockPart);

      const state = cartStore.getState();
      assert.equal(state.items.length, 1);
      assert.equal(state.items[0].qty, 2);
      assert.equal(state.totals.subtotal, 780);
      assert.equal(state.totals.total, 780);
      assert.equal(state.totals.itemCount, 2);
    });
  });

  describe('Scenario 2: Adding Repair Bay Labor Service to Cart', () => {
    it('adds workshop labor service with code, name, flat rate, bay, and duration', () => {
      cartStore.addService(mockService);

      const state = cartStore.getState();
      assert.equal(state.items.length, 1);

      const item = state.items[0];
      assert.equal(item.type, 'service');
      if (item.type === 'service') {
        assert.equal(item.code, 'SRV-CVT-01');
        assert.equal(item.name, 'Labor: CVT Cleaning & Regreasing');
        assert.equal(item.price, 350);
        assert.equal(item.bay, 'Bay 2 / Scooter Bay');
        assert.equal(item.duration, '45 mins');
        assert.equal(item.qty, 1);
      }
      assert.equal(state.totals.subtotal, 350);
      assert.equal(state.totals.total, 350);
    });

    it('supports combining physical parts and labor services in a single unified cart', () => {
      cartStore.addPart(mockPart, 2); // 2 * 390 = 780
      cartStore.addService(mockService, 1); // 1 * 350 = 350

      const state = cartStore.getState();
      assert.equal(state.items.length, 2);
      assert.equal(state.totals.subtotal, 1130);
      assert.equal(state.totals.total, 1130);
      assert.equal(state.totals.itemCount, 3);

      const partItem = state.items.find((i) => i.type === 'part');
      const serviceItem = state.items.find((i) => i.type === 'service');
      assert.ok(partItem);
      assert.ok(serviceItem);
    });
  });

  describe('Scenario 3: Cart Quantity Increment, Decrement, and Item Removal', () => {
    it('updates quantity dynamically and recalculates subtotal synchronously in <50ms', () => {
      cartStore.addPart(mockPart, 1);

      const startTime = performance.now();
      cartStore.updateQuantity(mockPart.sku, 5);
      const elapsed = performance.now() - startTime;

      assert.ok(elapsed < 50, `Subtotal recalculation took ${elapsed}ms, expected < 50ms`);
      const state = cartStore.getState();
      assert.equal(state.items[0].qty, 5);
      assert.equal(state.totals.subtotal, 1950);
      assert.equal(state.totals.total, 1950);
    });

    it('decrements item quantity by 1 when requested', () => {
      cartStore.addPart(mockPart, 3);
      cartStore.updateQuantity(mockPart.sku, 2);

      const state = cartStore.getState();
      assert.equal(state.items[0].qty, 2);
      assert.equal(state.totals.subtotal, 780);
    });

    it('removes item automatically when quantity reaches 0', () => {
      cartStore.addPart(mockPart, 1);
      cartStore.updateQuantity(mockPart.sku, 0);

      const state = cartStore.getState();
      assert.equal(state.items.length, 0);
      assert.equal(state.totals.subtotal, 0);
      assert.equal(state.totals.total, 0);
    });

    it('removes item immediately when removeItem is invoked', () => {
      cartStore.addPart(mockPart, 2);
      cartStore.addService(mockService, 1);
      assert.equal(cartStore.getState().items.length, 2);

      cartStore.removeItem(mockPart.sku);
      const state = cartStore.getState();
      assert.equal(state.items.length, 1);
      assert.equal(state.items[0].id, mockService.code);
      assert.equal(state.totals.subtotal, 350);
    });
  });

  describe('Scenario 4: Out-of-Stock Guard & Manager Override', () => {
    it('guards against adding a physical part with 0 stock without manager override', () => {
      const result = cartStore.addPart(mockOutOfStockPart);
      assert.deepEqual(result, { success: false, reason: 'out_of_stock' });

      const state = cartStore.getState();
      assert.equal(state.items.length, 0);
    });

    it('allows adding a 0-stock physical part when manager override is provided', () => {
      const result = cartStore.addPart(mockOutOfStockPart, 1, true);
      assert.deepEqual(result, { success: true });

      const state = cartStore.getState();
      assert.equal(state.items.length, 1);
      const item = state.items[0];
      assert.equal(item.type, 'part');
      if (item.type === 'part') {
        assert.equal(item.isOverridden, true);
      }
    });

    it('guards against updating quantity beyond physical stock without manager override', () => {
      const lowStockPart: Product = { ...mockPart, sku: 'LOW-STOCK', stock: 2 };
      cartStore.addPart(lowStockPart, 2);

      const updateResult = cartStore.updateQuantity('LOW-STOCK', 3);
      assert.deepEqual(updateResult, { success: false, reason: 'exceeds_stock' });

      // Quantity remains at 2
      assert.equal(cartStore.getState().items[0].qty, 2);

      // With manager override, update succeeds
      const overrideResult = cartStore.updateQuantity('LOW-STOCK', 3, true);
      assert.deepEqual(overrideResult, { success: true });
      assert.equal(cartStore.getState().items[0].qty, 3);
    });

    it('never restricts workshop labor services by stock limits', () => {
      const serviceResult = cartStore.addService(mockService, 10);
      assert.deepEqual(serviceResult, { success: true });
      assert.equal(cartStore.getState().items[0].qty, 10);
    });
  });

  describe('Dual-Tier Pricing Mode Switching', () => {
    it('recalculates physical parts to wholesale without modifying labor service flat rate', () => {
      cartStore.addPart(mockPart, 2); // retail 390, wholesale 330
      cartStore.addService(mockService, 1); // flat rate 350

      assert.equal(cartStore.getState().totals.subtotal, 2 * 390 + 350); // 780 + 350 = 1130

      cartStore.setPricingMode('wholesale');

      const state = cartStore.getState();
      assert.equal(state.pricingMode, 'wholesale');
      // Parts recalculated to wholesale 330: 2 * 330 = 660. Service remains 350.
      assert.equal(state.totals.subtotal, 2 * 330 + 350); // 660 + 350 = 1010
      assert.equal(state.totals.total, 1010);
    });
  });
});
