import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  thermalReceiptItemSchema,
  thermalReceiptDataSchema,
  validateThermalReceiptData
} from '../contracts.ts';
import type { ThermalReceiptData } from '../../types/transaction.ts';

describe('Thermal Receipt Contracts & Schema Validation (SIAA-52)', () => {
  const validReceipt: ThermalReceiptData = {
    id: 'tx-test-01',
    receiptNumber: 'TX-1041',
    timestamp: new Date().toISOString(),
    cashierName: 'Mike Morales',
    pricingMode: 'retail',
    items: [
      {
        id: 'i-1',
        itemType: 'part',
        skuOrCode: 'MOT-3100-10W40',
        name: 'Motul 3100 Gold 4T 10W40 (1L)',
        unitPrice: 390.0,
        quantity: 1,
        subtotal: 390.0,
        shelfLocation: 'Aisle 1 / Shelf 1'
      },
      {
        id: 'i-2',
        itemType: 'service',
        skuOrCode: 'SRV-OIL-01',
        name: 'Standard Oil & Gear Oil Change',
        unitPrice: 100.0,
        quantity: 1,
        subtotal: 100.0,
        bay: 'Bay 1 / Quick Bay',
        duration: '15 mins'
      }
    ],
    subtotal: 490.0,
    discountRate: 0,
    discountAmount: 0,
    totalDue: 490.0,
    cashTendered: 500.0,
    changeDue: 10.0,
    paymentMethod: 'Cash'
  };

  it('validates compliant 58mm/80mm thermal receipt data structures', () => {
    const validation = validateThermalReceiptData(validReceipt);
    assert.equal(validation.success, true);
    assert.equal(validation.error, undefined);
  });

  it('rejects receipt data missing required items', () => {
    const invalidReceipt = {
      ...validReceipt,
      items: []
    };
    const validation = validateThermalReceiptData(invalidReceipt);
    assert.equal(validation.success, false);
    assert.ok(validation.error?.includes('items'));
  });

  it('rejects receipt data with negative numerical totals', () => {
    const invalidTotals = {
      ...validReceipt,
      totalDue: -50
    };
    const validation = validateThermalReceiptData(invalidTotals);
    assert.equal(validation.success, false);
    assert.ok(validation.error?.includes('totalDue'));
  });
});
