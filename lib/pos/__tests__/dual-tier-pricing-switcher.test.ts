import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cartStore } from '../../store/cart-store.ts';
import { recalculateCartForPricingTier } from '../../../specs/020-dual-tier-pricing-switcher/contracts/pricing-switcher-contracts.ts';
import type { Product, LaborService, CartItem } from '../../types/index.ts';

const MOCK_PART_MOTUL: Product = {
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

const MOCK_PART_BELT: Product = {
  sku: 'HON-CLK-CVTB',
  name: 'OEM Drive Belt (Gates Bando)',
  category: 'Drivetrain',
  stock: 4,
  minThreshold: 8,
  location: 'Rack B-04 / Shelf 1',
  cost: 520,
  wholesale: 720,
  retail: 850,
  oem: true,
  model: 'Honda Click 125i/150i',
  brand: 'Honda OEM'
};

const MOCK_SERVICE_OIL: LaborService = {
  code: 'SRV-OIL-01',
  name: 'Standard Oil Change',
  bay: 'Bay 1 / Quick Bay',
  rate: 100,
  duration: '15 mins',
  description: 'Drain old engine oil and refill with fresh oil.'
};

describe('Dual-Tier Pricing Switcher (SIAA-19)', () => {
  beforeEach(() => {
    cartStore.clearCart();
    cartStore.setPricingMode('retail');
  });

  describe('Scenario 1: Switching to Wholesale Pricing Tier', () => {
    test('recalculates all physical parts to their wholesale prices immediately', () => {
      cartStore.addPart(MOCK_PART_MOTUL, 2); // 2 * 390 = 780
      cartStore.addPart(MOCK_PART_BELT, 1);  // 1 * 850 = 850

      const initialRetailState = cartStore.getState();
      assert.strictEqual(initialRetailState.pricingMode, 'retail');
      assert.strictEqual(initialRetailState.totals.subtotal, 1630);

      // Act: Toggle to wholesale
      cartStore.setPricingMode('wholesale');

      const wholesaleState = cartStore.getState();
      assert.strictEqual(wholesaleState.pricingMode, 'wholesale');

      // Motul should now be 330 each (2 * 330 = 660)
      const motul = wholesaleState.items.find((i) => i.id === MOCK_PART_MOTUL.sku);
      assert.ok(motul);
      assert.strictEqual(motul.price, 330);
      assert.strictEqual(motul.qty, 2);

      // Belt should now be 720 each (1 * 720 = 720)
      const belt = wholesaleState.items.find((i) => i.id === MOCK_PART_BELT.sku);
      assert.ok(belt);
      assert.strictEqual(belt.price, 720);
      assert.strictEqual(belt.qty, 1);

      // Wholesale subtotal: 660 + 720 = 1380
      assert.strictEqual(wholesaleState.totals.subtotal, 1380);
      assert.strictEqual(wholesaleState.totals.total, 1380);
    });
  });

  describe('Scenario 2: Preserving Fixed Workshop Labor Rates During Tier Toggle', () => {
    test('preserves repair bay flat labor rate when switching between Retail and Wholesale', () => {
      cartStore.addPart(MOCK_PART_MOTUL, 1); // 390 retail
      cartStore.addService(MOCK_SERVICE_OIL, 1); // 100 labor flat rate

      const retailState = cartStore.getState();
      assert.strictEqual(retailState.totals.subtotal, 490);

      // Switch to wholesale
      cartStore.setPricingMode('wholesale');

      const wholesaleState = cartStore.getState();
      assert.strictEqual(wholesaleState.pricingMode, 'wholesale');

      // Part adjusts to 330
      const partItem = wholesaleState.items.find((i) => i.type === 'part');
      assert.ok(partItem);
      assert.strictEqual(partItem.price, 330);

      // Labor service remains strictly invariant at 100
      const serviceItem = wholesaleState.items.find((i) => i.type === 'service');
      assert.ok(serviceItem);
      assert.strictEqual(serviceItem.price, 100);
      if (serviceItem.type === 'service') {
        assert.strictEqual(serviceItem.bay, 'Bay 1 / Quick Bay');
        assert.strictEqual(serviceItem.duration, '15 mins');
      }

      // New subtotal: 330 + 100 = 430
      assert.strictEqual(wholesaleState.totals.subtotal, 430);
      assert.strictEqual(wholesaleState.totals.total, 430);
    });
  });

  describe('Scenario 3: Cart Quantity and State Preservation', () => {
    test('preserves custom quantities, item selections, and line order without reset', () => {
      cartStore.addPart(MOCK_PART_MOTUL, 4);
      cartStore.addPart(MOCK_PART_BELT, 2);
      cartStore.addService(MOCK_SERVICE_OIL, 1);

      const before = cartStore.getState();
      assert.strictEqual(before.items.length, 3);
      assert.strictEqual(before.items[0].qty, 4);
      assert.strictEqual(before.items[1].qty, 2);
      assert.strictEqual(before.items[2].qty, 1);

      // Toggle to wholesale
      cartStore.setPricingMode('wholesale');
      const afterWholesale = cartStore.getState();

      assert.strictEqual(afterWholesale.items.length, 3);
      assert.strictEqual(afterWholesale.items[0].qty, 4);
      assert.strictEqual(afterWholesale.items[1].qty, 2);
      assert.strictEqual(afterWholesale.items[2].qty, 1);
      assert.strictEqual(afterWholesale.items[0].id, before.items[0].id);
      assert.strictEqual(afterWholesale.items[1].id, before.items[1].id);

      // Toggle back to retail
      cartStore.setPricingMode('retail');
      const afterRetail = cartStore.getState();

      assert.strictEqual(afterRetail.items.length, 3);
      assert.strictEqual(afterRetail.items[0].qty, 4);
      assert.strictEqual(afterRetail.items[1].qty, 2);
      assert.strictEqual(afterRetail.items[2].qty, 1);
      assert.strictEqual(afterRetail.items[0].price, 390);
      assert.strictEqual(afterRetail.items[1].price, 850);
      assert.strictEqual(afterRetail.items[2].price, 100);
    });
  });

  describe('Scenario 4: Pure Recalculation Contract Utility', () => {
    test('correctly maps items and computes totals without side-effects', () => {
      const items: CartItem[] = [
        {
          id: 'MOT-3100-10W40',
          type: 'part',
          sku: 'MOT-3100-10W40',
          name: 'Motul 3100',
          price: 390,
          qty: 3,
          retailPrice: 390,
          wholesalePrice: 330
        },
        {
          id: 'SRV-OIL-01',
          type: 'service',
          code: 'SRV-OIL-01',
          name: 'Labor: Oil Change',
          price: 100,
          qty: 1,
          bay: 'Bay 1'
        }
      ];

      const wholesaleResult = recalculateCartForPricingTier(items, 'wholesale');
      assert.strictEqual(wholesaleResult.pricingMode, 'wholesale');
      assert.strictEqual(wholesaleResult.items[0].price, 330);
      assert.strictEqual(wholesaleResult.items[1].price, 100);
      assert.strictEqual(wholesaleResult.subtotal, 3 * 330 + 1 * 100); // 990 + 100 = 1090

      const retailResult = recalculateCartForPricingTier(wholesaleResult.items, 'retail');
      assert.strictEqual(retailResult.pricingMode, 'retail');
      assert.strictEqual(retailResult.items[0].price, 390);
      assert.strictEqual(retailResult.items[1].price, 100);
      assert.strictEqual(retailResult.subtotal, 3 * 390 + 1 * 100); // 1170 + 100 = 1270
    });
  });
});
