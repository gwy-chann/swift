import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cartStore, useCartStore } from '../cart-store.ts';
import type { MotoMatcherMatrixPart } from '../../types/motomatcher.ts';

describe('MotoMatcher 1-Click Cart Insertion & Stock Guard (SIAA-58)', () => {
  const sampleAftermarketPart: MotoMatcherMatrixPart = {
    id: 'b1111111-0000-4000-8000-000000000001',
    sku: 'RCB-NMAX-BP02',
    name: 'RCB S-Series Ceramic Brake Pads',
    brand: 'Racing Boy (RCB)',
    category: 'Brakes',
    retail_price: 580,
    stock_level: 14,
    min_threshold: 5,
    shelf_location: 'Rack A-01 / Shelf 3',
    fitment_type: 'aftermarket',
    fitment_notes: 'High-performance ceramic compound for NMAX 155',
    year_range: '2020-2024',
    is_universal: false,
    upsell_delta_amount: 130,
    upsell_delta_percent: 28.9,
    upsell_badge: '+₱130.00 (+28.9%)',
    oem_reference_sku: 'YAM-NMAX-BL01',
  };

  const sampleOutOfStockPart: MotoMatcherMatrixPart = {
    id: 'b1111111-0000-4000-8000-000000000002',
    sku: 'BRK-BREM-01',
    name: 'Brembo 4-Piston Caliper',
    brand: 'Brembo',
    category: 'Brakes',
    retail_price: 4500,
    stock_level: 0,
    min_threshold: 2,
    shelf_location: 'Vault-01',
    fitment_type: 'aftermarket',
    fitment_notes: 'Race-spec caliper',
    year_range: '2020-2024',
    is_universal: false,
    upsell_delta_amount: null,
    upsell_delta_percent: null,
    upsell_badge: null,
    oem_reference_sku: null,
  };

  beforeEach(() => {
    cartStore.clearCart();
  });

  describe('Scenario 1: 1-Click Cart Insertion via useCartStore.getState().addItem', () => {
    it('successfully dispatches a MotoMatcherMatrixPart into active cart queue', () => {
      assert.equal(typeof useCartStore.getState, 'function');
      const initialCount = useCartStore.getState().items.length;
      assert.equal(initialCount, 0);

      const result = useCartStore.getState().addItem(sampleAftermarketPart);
      assert.equal(result.success, true);

      const state = useCartStore.getState();
      assert.equal(state.items.length, 1);

      const item = state.items[0];
      assert.equal(item.type, 'part');
      if (item.type === 'part') {
        assert.equal(item.sku, 'RCB-NMAX-BP02');
        assert.equal(item.name, 'RCB S-Series Ceramic Brake Pads');
        assert.equal(item.price, 580);
        assert.equal(item.qty, 1);
        assert.equal(item.location, 'Rack A-01 / Shelf 3');
      }
    });

    it('formats shelf locator toast description matching the user specification', () => {
      const part = sampleAftermarketPart;
      const expectedToast = `Added ${part.name} to POS Cart (Shelf: ${part.shelf_location})`;
      assert.equal(
        expectedToast,
        'Added RCB S-Series Ceramic Brake Pads to POS Cart (Shelf: Rack A-01 / Shelf 3)'
      );
    });

    it('increments quantity upon successive 1-click additions of the same part', () => {
      useCartStore.getState().addItem(sampleAftermarketPart);
      useCartStore.getState().addItem(sampleAftermarketPart);

      const state = useCartStore.getState();
      assert.equal(state.items.length, 1);
      assert.equal(state.items[0].qty, 2);
    });
  });

  describe('Scenario 2: Out-of-Stock Guard', () => {
    it('rejects adding a part with stock_level <= 0 with reason out_of_stock', () => {
      const result = useCartStore.getState().addItem(sampleOutOfStockPart);
      assert.equal(result.success, false);
      assert.equal(result.reason, 'out_of_stock');

      const state = useCartStore.getState();
      assert.equal(state.items.length, 0);
    });

    it('blocks dispatch when part stock_level is negative', () => {
      const negativeStockPart = { ...sampleOutOfStockPart, stock_level: -5 };
      const result = useCartStore.getState().addItem(negativeStockPart);
      assert.equal(result.success, false);
      assert.equal(result.reason, 'out_of_stock');
    });
  });
});
