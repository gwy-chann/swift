import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { processCheckoutAction } from '../actions.ts';
import { autoProvisionWorkOrdersFromCheckout } from '../work-order-bridge.ts';
import {
  getInMemoryWorkOrders,
  resetInMemoryWorkOrders,
  claimWorkOrderAction,
} from '../../workshop/workshop-actions.ts';
import type { CheckoutPayload } from '../../types/transaction.ts';

describe('Automatic POS Labor Checkout to Service Bay Work Order Queue Bridge (SIAA-100)', () => {
  beforeEach(() => {
    resetInMemoryWorkOrders();
  });

  it('Scenario 1: Auto-provisions work order when checkout contains labor service item', async () => {
    const payload: CheckoutPayload = {
      receiptNumber: `TX-TEST-${Date.now()}`,
      cashierName: 'Mike Morales',
      customerName: 'Juan Dela Cruz',
      vehicleModel: 'Yamaha NMAX 155',
      plateNumber: 'ND-1234',
      notes: 'Customer reports engine overheating, requested oil change',
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
          itemSkuOrCode: 'SRV-OIL-01',
          itemName: 'Standard Oil & Gear Oil Change',
          unitPrice: 350,
          quantity: 1,
          subtotal: 350,
          bay: 'Bay 1 (Quick Bay)',
        },
      ],
    };

    const result = await processCheckoutAction(payload);
    assert.strictEqual(result.success, true);

    if (result.success) {
      assert.strictEqual(result.workOrdersCreated, 1);
      assert.ok(result.workOrderNumbers && result.workOrderNumbers.length === 1);
      assert.match(result.workOrderNumbers[0], /^WO-\d{4}-\d+$/);

      // Verify work order is queued in in-memory store
      const orders = getInMemoryWorkOrders();
      const queuedOrder = orders.find((o) => o.orderNumber === result.workOrderNumbers![0]);
      assert.ok(queuedOrder, 'Provisioned work order must exist in workshop queue');
      assert.strictEqual(queuedOrder.status, 'QUEUED');
      assert.strictEqual(queuedOrder.customerName, 'Juan Dela Cruz');
      assert.strictEqual(queuedOrder.vehicleModel, 'Yamaha NMAX 155');
      assert.strictEqual(queuedOrder.plateNumber, 'ND-1234');
      assert.strictEqual(queuedOrder.serviceCode, 'SRV-OIL-01');
      assert.strictEqual(queuedOrder.serviceName, 'Standard Oil & Gear Oil Change');
      assert.strictEqual(queuedOrder.mechanicId, null, 'Work order must be unassigned initially');
    }
  });

  it('Scenario 3: Unassigned work order can be claimed by active mechanic', async () => {
    const payload: CheckoutPayload = {
      receiptNumber: `TX-CLAIM-${Date.now()}`,
      cashierName: 'Staff Cashier',
      customerName: 'Pedro Santos',
      vehicleModel: 'Honda Click 125i',
      plateNumber: 'ABC-5678',
      pricingMode: 'retail',
      subtotal: 200,
      discountRate: 0,
      discountAmount: 0,
      totalDue: 200,
      cashTendered: 200,
      changeDue: 0,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'service',
          itemSkuOrCode: 'SRV-BRK-01',
          itemName: 'Front Brake Pad Replacement & Bleeding',
          unitPrice: 200,
          quantity: 1,
          subtotal: 200,
          bay: 'Bay 2',
        },
      ],
    };

    const result = await processCheckoutAction(payload);
    assert.strictEqual(result.success, true);

    if (result.success && result.workOrderNumbers) {
      const orderNumber = result.workOrderNumbers[0];
      const orders = getInMemoryWorkOrders();
      const created = orders.find((o) => o.orderNumber === orderNumber);
      assert.ok(created, 'Work order must exist');
      assert.strictEqual(created.mechanicId, null);

      // Mechanic claims the unassigned job
      const claimResult = await claimWorkOrderAction(
        created.id,
        'd0000000-0000-0000-0000-000000000001',
        'Dante Reyes',
        true
      );
      assert.strictEqual(claimResult.success, true);
      assert.strictEqual(claimResult.data?.mechanicId, 'd0000000-0000-0000-0000-000000000001');
      assert.strictEqual(claimResult.data?.mechanicName, 'Dante Reyes');
      assert.strictEqual(claimResult.data?.status, 'IN PROGRESS');
    }
  });

  it('Scenario 4: Pure parts transactions skip work order creation', async () => {
    const initialOrdersCount = getInMemoryWorkOrders().length;

    const payload: CheckoutPayload = {
      receiptNumber: `TX-PARTS-${Date.now()}`,
      cashierName: 'Mike Morales',
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
        },
      ],
    };

    const result = await processCheckoutAction(payload);
    assert.strictEqual(result.success, true);

    if (result.success) {
      assert.strictEqual(result.workOrdersCreated, 0, 'No work orders should be created for parts');
      assert.deepStrictEqual(result.workOrderNumbers, []);
    }

    const finalOrdersCount = getInMemoryWorkOrders().length;
    assert.strictEqual(finalOrdersCount, initialOrdersCount, 'Workshop queue count must be unchanged');
  });

  it('Scenario 5: Applies sensible defaults when customer intake details are omitted', async () => {
    const payload: CheckoutPayload = {
      receiptNumber: `TX-DEFAULTS-${Date.now()}`,
      cashierName: 'Fast-lane Cashier',
      pricingMode: 'retail',
      subtotal: 150,
      discountRate: 0,
      discountAmount: 0,
      totalDue: 150,
      cashTendered: 200,
      changeDue: 50,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'service',
          itemSkuOrCode: 'SRV-CHN-01',
          itemName: 'Drive Chain Cleaning & Lube',
          unitPrice: 150,
          quantity: 1,
          subtotal: 150,
        },
      ],
    };

    const result = await autoProvisionWorkOrdersFromCheckout(payload, payload.receiptNumber!);
    assert.strictEqual(result.created, 1);
    const order = result.workOrders[0];

    assert.strictEqual(order.customerName, 'Walk-in Customer');
    assert.strictEqual(order.vehicleModel, 'Motorcycle (General)');
    assert.strictEqual(order.plateNumber, 'FOR-REG');
    assert.strictEqual(order.status, 'QUEUED');
    assert.strictEqual(order.mechanicId, null);
    assert.ok(order.notes && order.notes.includes('POS Fast-lane Checkout'));
  });

  it('Scenario 6: Provisions distinct work orders for multiple labor services in a single cart', async () => {
    const payload: CheckoutPayload = {
      receiptNumber: `TX-MULTI-${Date.now()}`,
      cashierName: 'Mike Morales',
      customerName: 'Elena Rostova',
      vehicleModel: 'Kawasaki Ninja 400',
      plateNumber: 'NINJA-400',
      pricingMode: 'retail',
      subtotal: 800,
      discountRate: 0,
      discountAmount: 0,
      totalDue: 800,
      cashTendered: 1000,
      changeDue: 200,
      paymentMethod: 'Cash',
      items: [
        {
          itemType: 'service',
          itemSkuOrCode: 'SRV-OIL-02',
          itemName: 'Full Synthetic Oil Service',
          unitPrice: 500,
          quantity: 1,
          subtotal: 500,
        },
        {
          itemType: 'service',
          itemSkuOrCode: 'SRV-TUNE-01',
          itemName: 'Throttle Body & FI Cleaning',
          unitPrice: 300,
          quantity: 1,
          subtotal: 300,
        },
      ],
    };

    const result = await autoProvisionWorkOrdersFromCheckout(payload, payload.receiptNumber!);
    assert.strictEqual(result.created, 2);
    assert.strictEqual(result.workOrderNumbers.length, 2);
    assert.notStrictEqual(result.workOrderNumbers[0], result.workOrderNumbers[1]);

    const order1 = result.workOrders[0];
    const order2 = result.workOrders[1];

    assert.strictEqual(order1.serviceCode, 'SRV-OIL-02');
    assert.strictEqual(order2.serviceCode, 'SRV-TUNE-01');
    assert.strictEqual(order1.customerName, 'Elena Rostova');
    assert.strictEqual(order2.customerName, 'Elena Rostova');
  });
});
