import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTransactionByReceiptAction,
  getThermalReceiptByReceiptAction
} from '../transaction-actions.ts';
import { processCheckoutAction } from '../actions.ts';
import type { CheckoutPayload } from '../../types/transaction.ts';

describe('Thermal Receipt Lookup & Checkout Revalidation (SIAA-52)', () => {
  it('Scenario 2: resolves canonical transaction TX-1041 with itemized parts, labor services, bay, and shelf locations', async () => {
    const rawTx = await getTransactionByReceiptAction('TX-1041');
    assert.ok(rawTx, 'Expected TX-1041 to exist in transaction records');
    assert.equal(rawTx.receipt_number, 'TX-1041');
    assert.equal(rawTx.subtotal, 550.0);
    assert.equal(rawTx.total_due, 550.0);
    assert.equal(rawTx.cash_tendered, 600.0);
    assert.equal(rawTx.change_due, 50.0);
    assert.equal(rawTx.payment_method, 'Cash');

    const thermalReceipt = await getThermalReceiptByReceiptAction('TX-1041');
    assert.ok(thermalReceipt, 'Expected getThermalReceiptByReceiptAction to format receipt TX-1041');
    assert.equal(thermalReceipt.receiptNumber, 'TX-1041');
    assert.equal(thermalReceipt.items.length, 3);

    // Part item verification
    const partItem = thermalReceipt.items.find((i) => i.itemType === 'part');
    assert.ok(partItem);
    assert.equal(partItem.skuOrCode, 'MOT-3100-10W40');
    assert.equal(partItem.shelfLocation, 'Aisle 1 / Shelf 1');
    assert.equal(partItem.unitPrice, 390.0);

    // Workshop service items verification
    const serviceItems = thermalReceipt.items.filter((i) => i.itemType === 'service');
    assert.equal(serviceItems.length, 2);
    for (const service of serviceItems) {
      assert.equal(service.bay, 'Bay 1 / Quick Bay');
      assert.ok(service.duration, 'Expected service to have duration specification');
    }
  });

  it('correctly maps transaction with discount (TX-1042)', async () => {
    const thermalReceipt = await getThermalReceiptByReceiptAction('TX-1042');
    assert.ok(thermalReceipt);
    assert.equal(thermalReceipt.receiptNumber, 'TX-1042');
    assert.equal(thermalReceipt.subtotal, 1200.0);
    assert.equal(thermalReceipt.discountType, 'senior');
    assert.equal(thermalReceipt.discountRate, 0.2);
    assert.equal(thermalReceipt.discountAmount, 240.0);
    assert.equal(thermalReceipt.totalDue, 960.0);
    assert.equal(thermalReceipt.cashTendered, 1000.0);
    assert.equal(thermalReceipt.changeDue, 40.0);
  });

  it('triggers Next.js cache revalidation without throwing during processCheckoutAction', async () => {
    const payload: CheckoutPayload = {
      cashierName: 'Test Cashier',
      pricingMode: 'retail',
      subtotal: 390,
      discountRate: 0,
      discountAmount: 0,
      totalDue: 390,
      cashTendered: 500,
      changeDue: 110,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'part',
          itemSkuOrCode: 'MOT-3100-10W40',
          itemName: 'Motul 3100 Gold 4T 10W40 (1L)',
          unitPrice: 390,
          quantity: 1,
          subtotal: 390,
          shelfLocation: 'Aisle 1 / Shelf 1',
          bay: null
        }
      ]
    };

    const result = await processCheckoutAction(payload);
    assert.equal(result.success, true);
    assert.ok(result.receiptNumber);
  });
});
