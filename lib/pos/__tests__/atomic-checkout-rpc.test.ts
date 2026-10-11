import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { processCheckoutAction } from '../actions.ts';
import { inventoryStore } from '../../store/inventory-store.ts';
import { MOCK_PRODUCTS } from '../../mock-data/products.ts';
import type { CheckoutPayload } from '../../types/transaction.ts';

describe('Supabase Atomic Checkout RPC with Stock Decrements & Audit Logging (SIAA-51)', () => {
  beforeEach(() => {
    // Reset inventory store to canonical mock products baseline
    inventoryStore.hydrateProducts(MOCK_PRODUCTS.map((p) => ({ ...p })));
  });

  it('executes successful multi-item hybrid checkout with physical parts and workshop labor', async () => {
    const targetSku = 'MOT-3100-10W40';
    const initialProduct = inventoryStore.getProductBySku(targetSku);
    assert.ok(initialProduct, 'Product must exist in catalog');
    const initialStock = initialProduct.stock;
    assert.ok(initialStock >= 2, 'Initial stock must be at least 2 units');

    const payload: CheckoutPayload = {
      receiptNumber: 'TX-TEST-0001',
      cashierId: 'c0000000-0000-0000-0000-000000000002',
      cashierName: 'Mike Morales',
      pricingMode: 'retail',
      subtotal: 880,
      discountType: 'none',
      discountRate: 0,
      discountAmount: 0,
      totalDue: 880,
      cashTendered: 1000,
      changeDue: 120,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'part',
          itemSkuOrCode: targetSku,
          itemName: 'Motul 3100 Gold 4T 10W40 (1L)',
          unitPrice: 390,
          quantity: 2,
          subtotal: 780,
          shelfLocation: 'Aisle 1 / Shelf 1',
          bay: null
        },
        {
          itemType: 'service',
          itemSkuOrCode: 'SRV-OIL-01',
          itemName: 'Standard Oil & Gear Oil Change',
          unitPrice: 100,
          quantity: 1,
          subtotal: 100,
          shelfLocation: null,
          bay: 'Bay 1 / Quick Bay'
        }
      ]
    };

    const result = await processCheckoutAction(payload);

    assert.equal(result.success, true, 'Checkout action must succeed');


    if (result.success) {
      assert.ok(result.transactionId, 'Must return transaction ID');
      assert.equal(result.receiptNumber, 'TX-TEST-0001');
      assert.equal(result.itemsCount, 2);
      assert.equal(result.partsDecremented, 1);
      assert.ok(result.createdAt);
    }

    // Verify physical inventory stock decremented by purchased quantity
    const updatedProduct = inventoryStore.getProductBySku(targetSku);
    assert.equal(updatedProduct?.stock, initialStock - 2, 'Physical stock must be decremented by 2 units');

    // Verify stock adjustment audit log exists
    const logs = inventoryStore.getState().adjustmentLogs;
    const latestLog = logs[0];
    assert.ok(latestLog, 'Stock adjustment log must be created');
    assert.equal(latestLog.sku, targetSku);
    assert.ok(latestLog.reason.includes('TX-TEST-0001'));
  });

  it('aborts and rolls back when requested part quantity exceeds on-hand stock (INSUFFICIENT_STOCK)', async () => {
    const targetSku = 'HON-CLK-CVTB';
    const initialProduct = inventoryStore.getProductBySku(targetSku);
    assert.ok(initialProduct, 'Product must exist');
    const availableStock = initialProduct.stock;

    const payload: CheckoutPayload = {
      receiptNumber: 'TX-TEST-OVERFLOW',
      cashierName: 'Cashier Terminal 1',
      pricingMode: 'retail',
      subtotal: 85000,
      discountRate: 0,
      discountAmount: 0,
      totalDue: 85000,
      cashTendered: 85000,
      changeDue: 0,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'part',
          itemSkuOrCode: targetSku,
          itemName: 'OEM Drive Belt (Gates Bando)',
          unitPrice: 850,
          quantity: availableStock + 10, // Exceeds on-hand quantity
          subtotal: 85000
        }
      ]
    };

    const result = await processCheckoutAction(payload);

    assert.equal(result.success, false, 'Checkout must fail on insufficient stock');
    if (!result.success) {
      assert.equal(result.code, 'INSUFFICIENT_STOCK');
      assert.equal(result.sku, targetSku);
      assert.ok(result.error.toLowerCase().includes('insufficient stock'));
    }

    // Stock must be completely unchanged (Rollback guarantee)
    const productAfter = inventoryStore.getProductBySku(targetSku);
    assert.equal(productAfter?.stock, availableStock, 'Stock must not change when checkout aborts');
  });

  it('executes pure workshop labor checkout with zero physical stock decrements', async () => {
    const payload: CheckoutPayload = {
      receiptNumber: 'TX-TEST-LABOR-ONLY',
      cashierName: 'Service Advisor',
      pricingMode: 'retail',
      subtotal: 350,
      discountRate: 0,
      discountAmount: 0,
      totalDue: 350,
      cashTendered: 500,
      changeDue: 150,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'service',
          itemSkuOrCode: 'SRV-CVT-01',
          itemName: 'CVT Cleaning & Regreasing',
          unitPrice: 350,
          quantity: 1,
          subtotal: 350,
          bay: 'Bay 2 / Scooter Bay'
        }
      ]
    };

    const initialLogsCount = inventoryStore.getState().adjustmentLogs.length;

    const result = await processCheckoutAction(payload);

    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.partsDecremented, 0, 'Zero parts should be decremented for pure labor services');
      assert.equal(result.itemsCount, 1);
    }

    // Zero stock adjustment logs created
    const finalLogsCount = inventoryStore.getState().adjustmentLogs.length;
    assert.equal(finalLogsCount, initialLogsCount, 'Pure service transactions must not write stock adjustment logs');
  });

  it('rejects malformed checkout payloads with VALIDATION_ERROR', async () => {
    // 1. Missing items array
    const emptyResult = await processCheckoutAction({
      pricingMode: 'retail',
      subtotal: 100,
      totalDue: 100,
      cashTendered: 100,
      items: []
    });

    assert.equal(emptyResult.success, false);
    if (!emptyResult.success) {
      assert.equal(emptyResult.code, 'VALIDATION_ERROR');
      assert.ok(emptyResult.error.includes('items'));
    }

    // 2. Negative unit price
    const negativePriceResult = await processCheckoutAction({
      pricingMode: 'retail',
      subtotal: -100,
      totalDue: -100,
      cashTendered: 100,
      items: [
        {
          itemType: 'part',
          itemSkuOrCode: 'MOT-3100-10W40',
          itemName: 'Oil',
          unitPrice: -50,
          quantity: 1,
          subtotal: -50
        }
      ]
    });

    assert.equal(negativePriceResult.success, false);
    if (!negativePriceResult.success) {
      assert.equal(negativePriceResult.code, 'VALIDATION_ERROR');
    }
  });

  it('handles non-existent SKU with PRODUCT_NOT_FOUND error code', async () => {
    const payload: CheckoutPayload = {
      receiptNumber: 'TX-TEST-INVALID-SKU',
      cashierName: 'Cashier',
      pricingMode: 'retail',
      subtotal: 500,
      discountRate: 0,
      discountAmount: 0,
      totalDue: 500,
      cashTendered: 500,
      changeDue: 0,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'part',
          itemSkuOrCode: 'NON-EXISTENT-SKU-999',
          itemName: 'Ghost Part',
          unitPrice: 500,
          quantity: 1,
          subtotal: 500
        }
      ]
    };

    const result = await processCheckoutAction(payload);

    assert.equal(result.success, false);
    if (!result.success) {
      assert.equal(result.code, 'PRODUCT_NOT_FOUND');
      assert.equal(result.sku, 'NON-EXISTENT-SKU-999');
    }
  });
});
