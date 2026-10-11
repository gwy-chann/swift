import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cartStore } from '../../store/cart-store.ts';
import {
  DISCOUNT_TIERS,
  calculateCartTotals,
  getDiscountTierById,
  getDiscountTierByRate
} from '../discount-matrix.ts';
import type { CartItem } from '../../types/cart.ts';

describe('Customer Discount Matrix Engine (SIAA-20)', () => {
  beforeEach(() => {
    cartStore.clearCart();
  });

  describe('DISCOUNT_TIERS Constant & Configuration', () => {
    it('defines standardized tiers for None (0%), Fleet (5%), VIP (10%), and SC/PWD (20%)', () => {
      assert.strictEqual(DISCOUNT_TIERS.length, 4);

      const noneTier = getDiscountTierById('none');
      assert.strictEqual(noneTier.rate, 0.0);
      assert.strictEqual(noneTier.type, 'none');

      const fleetTier = getDiscountTierById('fleet');
      assert.strictEqual(fleetTier.rate, 0.05);
      assert.strictEqual(fleetTier.type, 'commercial');

      const vipTier = getDiscountTierById('vip');
      assert.strictEqual(vipTier.rate, 0.1);
      assert.strictEqual(vipTier.type, 'commercial');

      const scTier = getDiscountTierById('senior_pwd');
      assert.strictEqual(scTier.rate, 0.2);
      assert.strictEqual(scTier.type, 'statutory');
    });

    it('resolves tier by rate correctly', () => {
      assert.strictEqual(getDiscountTierByRate(0.2).id, 'senior_pwd');
      assert.strictEqual(getDiscountTierByRate(0.1).id, 'vip');
      assert.strictEqual(getDiscountTierByRate(0.05).id, 'fleet');
      assert.strictEqual(getDiscountTierByRate(0).id, 'none');
    });
  });

  describe('Pure calculateCartTotals Computation', () => {
    it('Scenario 1: computes 20% SC/PWD discount accurately', () => {
      const items: CartItem[] = [
        {
          id: 'ITEM-1',
          type: 'part',
          sku: 'SKU-1',
          name: 'Part 1',
          price: 500,
          qty: 2
        } // Subtotal: 1000
      ];

      const totals = calculateCartTotals(items, 0.2, 'senior_pwd');
      assert.strictEqual(totals.subtotal, 1000);
      assert.strictEqual(totals.discountRate, 0.2);
      assert.strictEqual(totals.discountAmount, 200);
      assert.strictEqual(totals.total, 800);
      assert.strictEqual(totals.discountType, 'senior_pwd');
    });

    it('Scenario 2: computes VIP 10% and Fleet 5% discounts accurately', () => {
      const items: CartItem[] = [
        {
          id: 'ITEM-1',
          type: 'part',
          sku: 'SKU-1',
          name: 'Part 1',
          price: 750,
          qty: 2
        } // Subtotal: 1500
      ];

      const vipTotals = calculateCartTotals(items, 0.1, 'vip');
      assert.strictEqual(vipTotals.subtotal, 1500);
      assert.strictEqual(vipTotals.discountAmount, 150);
      assert.strictEqual(vipTotals.total, 1350);

      const fleetTotals = calculateCartTotals(items, 0.05, 'fleet');
      assert.strictEqual(fleetTotals.subtotal, 1500);
      assert.strictEqual(fleetTotals.discountAmount, 75);
      assert.strictEqual(fleetTotals.total, 1425);
    });

    it('computes half-up decimal rounding with cent precision', () => {
      const items: CartItem[] = [
        {
          id: 'ITEM-1',
          type: 'part',
          sku: 'SKU-1',
          name: 'Odd Price Item',
          price: 33.33,
          qty: 1
        }
      ];

      // 33.33 * 0.20 = 6.666 -> rounds to 6.67
      const totals = calculateCartTotals(items, 0.2, 'senior_pwd');
      assert.strictEqual(totals.subtotal, 33.33);
      assert.strictEqual(totals.discountAmount, 6.67);
      assert.strictEqual(totals.total, 26.66);
    });
  });

  describe('Reactive CartStore Discount State Machine', () => {
    it('Scenario 1: applying senior_pwd 20% discount chip updates totals in cartStore', () => {
      // Seed cart with items
      cartStore.addPart({
        sku: 'TEST-SKU-1',
        name: 'Brake Disc',
        brand: 'Brembo',
        category: 'Brakes',
        stock: 10,
        retail: 1000,
        wholesale: 850
      });

      assert.strictEqual(cartStore.getState().totals.subtotal, 1000);

      // Select Senior Citizen / PWD 20%
      cartStore.setDiscountTier('senior_pwd');

      const state = cartStore.getState();
      assert.strictEqual(state.discountType, 'senior_pwd');
      assert.strictEqual(state.discountRate, 0.2);
      assert.strictEqual(state.totals.discountAmount, 200);
      assert.strictEqual(state.totals.total, 800);
    });

    it('Scenario 2: applying VIP 10% and Fleet 5% chips updates cartStore', () => {
      cartStore.addPart({
        sku: 'TEST-SKU-2',
        name: 'Chain & Sprocket',
        brand: 'DID',
        category: 'Drive',
        stock: 5,
        retail: 2000,
        wholesale: 1700
      });

      // VIP 10%
      cartStore.setDiscountTier('vip');
      assert.strictEqual(cartStore.getState().discountType, 'vip');
      assert.strictEqual(cartStore.getState().totals.discountAmount, 200);
      assert.strictEqual(cartStore.getState().totals.total, 1800);

      // Fleet 5%
      cartStore.setDiscountTier('fleet');
      assert.strictEqual(cartStore.getState().discountType, 'fleet');
      assert.strictEqual(cartStore.getState().totals.discountAmount, 100);
      assert.strictEqual(cartStore.getState().totals.total, 1900);
    });

    it('Scenario 3: enforces mutual exclusivity and prevents discount stacking', () => {
      cartStore.addPart({
        sku: 'TEST-SKU-3',
        name: 'LED Headlight',
        brand: 'Osram',
        category: 'Lighting',
        stock: 5,
        retail: 1000,
        wholesale: 800
      });

      // Select 20%
      cartStore.setDiscountTier('senior_pwd');
      assert.strictEqual(cartStore.getState().totals.discountAmount, 200);

      // Switch directly to 10% VIP
      cartStore.setDiscountTier('vip');
      // Must NOT stack to 300 or 280
      assert.strictEqual(cartStore.getState().totals.discountAmount, 100);
      assert.strictEqual(cartStore.getState().totals.total, 900);
      assert.strictEqual(cartStore.getState().discountType, 'vip');
    });

    it('Scenario 3: toggle-off and none resets discount to 0% Standard', () => {
      cartStore.addPart({
        sku: 'TEST-SKU-4',
        name: 'Synthetic Oil',
        brand: 'Motul',
        category: 'Oils',
        stock: 10,
        retail: 500,
        wholesale: 400
      });

      // Select 20%
      cartStore.setDiscountTier('senior_pwd');
      assert.strictEqual(cartStore.getState().discountType, 'senior_pwd');
      assert.strictEqual(cartStore.getState().totals.discountAmount, 100);

      // Re-clicking active tier toggles it off
      cartStore.setDiscountTier('senior_pwd');
      assert.strictEqual(cartStore.getState().discountType, 'none');
      assert.strictEqual(cartStore.getState().discountRate, 0);
      assert.strictEqual(cartStore.getState().totals.discountAmount, 0);
      assert.strictEqual(cartStore.getState().totals.total, 500);

      // Selecting 'none' also resets
      cartStore.setDiscountTier('vip');
      assert.strictEqual(cartStore.getState().discountType, 'vip');
      cartStore.setDiscountTier('none');
      assert.strictEqual(cartStore.getState().discountType, 'none');
      assert.strictEqual(cartStore.getState().totals.total, 500);
    });

    it('recalculates discount amount dynamically when items are added or quantities modified', () => {
      cartStore.addPart({
        sku: 'TEST-SKU-5',
        name: 'Air Filter',
        brand: 'Honda',
        category: 'Maintenance',
        stock: 10,
        retail: 300,
        wholesale: 250
      });

      cartStore.setDiscountTier('senior_pwd'); // 20%
      assert.strictEqual(cartStore.getState().totals.subtotal, 300);
      assert.strictEqual(cartStore.getState().totals.discountAmount, 60);
      assert.strictEqual(cartStore.getState().totals.total, 240);

      // Add labor service: ₱100
      cartStore.addService({
        code: 'SRV-01',
        name: 'Oil Change',
        rate: 100,
        category: 'Maintenance'
      });

      // New subtotal: ₱400 -> Discount 20% of 400 = ₱80 -> Total = ₱320
      assert.strictEqual(cartStore.getState().totals.subtotal, 400);
      assert.strictEqual(cartStore.getState().totals.discountAmount, 80);
      assert.strictEqual(cartStore.getState().totals.total, 320);
    });

    it('Scenario 4: stamps discount_type and discount_rate into checkout transaction payload', () => {
      cartStore.addPart({
        sku: 'TEST-SKU-6',
        name: 'Tire 90/80-14',
        brand: 'Pirelli',
        category: 'Tires',
        stock: 4,
        retail: 1500,
        wholesale: 1300
      });

      cartStore.setDiscountTier('senior_pwd');

      const tx = cartStore.checkout({
        cashier: 'Test Cashier',
        paymentMethod: 'Cash',
        cashTendered: 1500
      });

      assert.ok(tx);
      assert.strictEqual(tx.subtotal, 1500);
      assert.strictEqual(tx.discountType, 'senior_pwd');
      assert.strictEqual(tx.discountRate, 0.2);
      assert.strictEqual(tx.discountAmount, 300);
      assert.strictEqual(tx.total, 1200);
      assert.strictEqual(tx.cashTendered, 1500);
      assert.strictEqual(tx.change, 300);

      // Cart should be reset to empty with 0% discount
      assert.strictEqual(cartStore.getState().items.length, 0);
      assert.strictEqual(cartStore.getState().discountType, 'none');
      assert.strictEqual(cartStore.getState().discountRate, 0);
    });
  });
});
