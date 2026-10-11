import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { cartStore } from '../cart-store.ts';
import type { Product, LaborService } from '../../types/index.ts';

describe('Cart Store Async Checkout & Receipt Persistence (SIAA-52)', () => {
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

  const mockService: LaborService = {
    code: 'SRV-OIL-01',
    name: 'Standard Oil & Gear Oil Change',
    bay: 'Bay 1 / Quick Bay',
    rate: 100,
    duration: '15 mins',
    description: 'Quick lube bay standard drain and fill'
  };

  beforeEach(() => {
    cartStore.clearCart();
    cartStore.closeReceiptModal();
    cartStore.setPricingMode('retail');
    cartStore.setDiscountRate(0);
  });

  it('Scenario 1: executes async checkout, clears active cart, and opens thermal receipt modal on success', async () => {
    cartStore.addPart(mockPart, 1);
    cartStore.addService(mockService, 1);

    const initial = cartStore.getState();
    assert.equal(initial.items.length, 2);
    assert.equal(initial.totals.total, 490);
    assert.equal(initial.isReceiptModalOpen, false);

    const result = await cartStore.checkout({
      cashier: 'Mike Morales',
      cashTendered: 500,
      paymentMethod: 'Cash'
    });

    assert.equal(result.success, true);
    assert.ok(result.receiptNumber);
    assert.ok(result.transactionId);
    assert.ok(result.receiptData);

    // Verify receipt metadata
    assert.equal(result.receiptData?.cashierName, 'Mike Morales');
    assert.equal(result.receiptData?.totalDue, 490);
    assert.equal(result.receiptData?.cashTendered, 500);
    assert.equal(result.receiptData?.changeDue, 10);
    assert.equal(result.receiptData?.items.length, 2);

    // Verify cart state mutation
    const updated = cartStore.getState();
    assert.equal(updated.items.length, 0); // Cart is cleared!
    assert.equal(updated.isReceiptModalOpen, true); // Modal is open!
    assert.equal(updated.activeReceiptData?.receiptNumber, result.receiptNumber);
    assert.equal(updated.isProcessingCheckout, false);
    assert.equal(updated.lastCheckoutError, null);
  });

  it('preserves cart items when checkout cannot proceed (e.g. empty cart)', async () => {
    assert.equal(cartStore.getState().items.length, 0);

    const result = await cartStore.checkout({
      cashier: 'Mike Morales'
    });

    assert.equal(result.success, false);
    assert.equal(result.error, 'Cart is empty');
    assert.equal(cartStore.getState().isReceiptModalOpen, false);
  });

  it('supports modal controls: closeReceiptModal and openReceiptModal', () => {
    cartStore.openReceiptModal();
    assert.equal(cartStore.getState().isReceiptModalOpen, true);

    cartStore.closeReceiptModal();
    assert.equal(cartStore.getState().isReceiptModalOpen, false);
  });
});
