import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORE_RECEIPT_CONFIG,
  getThermalRollDimensions,
  formatReceiptCurrency,
  generateReceiptBarcodePattern
} from '../thermal-receipt.ts';
import { validateThermalReceiptData } from '../contracts.ts';
import type { ThermalReceiptData } from '../../types/transaction.ts';

describe('Thermal Receipt Generation & Printable Modal (SIAA-22)', () => {
  const sampleHybridReceipt: ThermalReceiptData = {
    id: 'tx-22-sample',
    receiptNumber: 'TX-1041',
    timestamp: '2026-10-12T01:30:00.000Z',
    cashierName: 'Admin Cashier',
    pricingMode: 'retail',
    technicianNotes: 'Front brake pads inspected and chain lubed.',
    items: [
      {
        id: 'item-1',
        itemType: 'part',
        skuOrCode: 'PART-OIL-10W40',
        name: 'Motul 7100 10W-40 Synthetic Oil (1L)',
        unitPrice: 550.0,
        quantity: 2,
        subtotal: 1100.0,
        shelfLocation: 'Aisle 2 - Shelf B'
      },
      {
        id: 'item-2',
        itemType: 'service',
        skuOrCode: 'SRV-OIL-CHANGE',
        name: 'Oil & Filter Change Service',
        unitPrice: 150.0,
        quantity: 1,
        subtotal: 150.0,
        bay: 'Bay 1 - Quick Service',
        duration: '20 mins'
      }
    ],
    subtotal: 1250.0,
    discountType: 'Senior Citizen',
    discountRate: 0.20,
    discountAmount: 250.0,
    totalDue: 1000.0,
    cashTendered: 1000.0,
    changeDue: 0.0,
    paymentMethod: 'Cash'
  };

  describe('Scenario 1: Thermal Receipt Layout Formatting', () => {
    it('defines standard store branding and legal tax header information', () => {
      assert.strictEqual(STORE_RECEIPT_CONFIG.storeName, 'SWIFT MOTO SERVICE');
      assert.strictEqual(STORE_RECEIPT_CONFIG.address, '104 Rizal Ave, Motor City');
      assert.strictEqual(STORE_RECEIPT_CONFIG.tin, 'TIN: 409-281-992-000');
      assert.strictEqual(STORE_RECEIPT_CONFIG.phone, 'Tel: (02) 8921-4450');
    });

    it('validates receipt number format and core metadata', () => {
      const validation = validateThermalReceiptData(sampleHybridReceipt);
      assert.strictEqual(validation.success, true);
      assert.strictEqual(sampleHybridReceipt.receiptNumber, 'TX-1041');
      assert.strictEqual(sampleHybridReceipt.cashierName, 'Admin Cashier');
      assert.strictEqual(sampleHybridReceipt.pricingMode, 'retail');
    });
  });

  describe('Scenario 2: Itemized Breakdown of Physical Parts vs. Bay Labor', () => {
    it('itemizes physical parts with SKU, product name, quantity, shelf location, and line total', () => {
      const partItem = sampleHybridReceipt.items.find((i) => i.itemType === 'part');
      assert.ok(partItem);
      assert.strictEqual(partItem.skuOrCode, 'PART-OIL-10W40');
      assert.strictEqual(partItem.name, 'Motul 7100 10W-40 Synthetic Oil (1L)');
      assert.strictEqual(partItem.quantity, 2);
      assert.strictEqual(partItem.unitPrice, 550.0);
      assert.strictEqual(partItem.subtotal, 1100.0);
      assert.strictEqual(partItem.shelfLocation, 'Aisle 2 - Shelf B');
    });

    it('itemizes workshop labor services with service code, bay name, duration, and labor rate', () => {
      const serviceItem = sampleHybridReceipt.items.find((i) => i.itemType === 'service');
      assert.ok(serviceItem);
      assert.strictEqual(serviceItem.skuOrCode, 'SRV-OIL-CHANGE');
      assert.strictEqual(serviceItem.name, 'Oil & Filter Change Service');
      assert.strictEqual(serviceItem.bay, 'Bay 1 - Quick Service');
      assert.strictEqual(serviceItem.duration, '20 mins');
      assert.strictEqual(serviceItem.unitPrice, 150.0);
      assert.strictEqual(serviceItem.subtotal, 150.0);
    });

    it('supports technician notes on workshop service transactions', () => {
      assert.strictEqual(
        sampleHybridReceipt.technicianNotes,
        'Front brake pads inspected and chain lubed.'
      );
    });
  });

  describe('Scenario 3: Payment Math & Warranty Policy Summary', () => {
    it('verifies subtotal, discount, total due, cash tendered, and change due calculations', () => {
      assert.strictEqual(sampleHybridReceipt.subtotal, 1250.0);
      assert.strictEqual(sampleHybridReceipt.discountAmount, 250.0);
      assert.strictEqual(sampleHybridReceipt.totalDue, 1000.0);
      assert.strictEqual(sampleHybridReceipt.cashTendered, 1000.0);
      assert.strictEqual(sampleHybridReceipt.changeDue, 0.0);
      assert.strictEqual(sampleHybridReceipt.paymentMethod, 'Cash');
    });

    it('enforces mandatory 7-day parts warranty disclaimer', () => {
      assert.strictEqual(
        STORE_RECEIPT_CONFIG.warrantyNotice,
        'Parts warranty valid for 7 days with receipt.'
      );
    });

    it('generates simulated barcode pattern for receipt printing', () => {
      const barcode = generateReceiptBarcodePattern('TX-1041');
      assert.strictEqual(barcode.length, 32);
      assert.ok(barcode.every((b) => typeof b.widthClass === 'string' && b.widthClass.startsWith('w-')));
    });

    it('formats monetary values with standard Philippine Peso currency symbol', () => {
      assert.strictEqual(formatReceiptCurrency(1250.0), '₱1250.00');
      assert.strictEqual(formatReceiptCurrency(0.5), '₱0.50');
    });
  });

  describe('Scenario 4: Roll Width Switcher (58mm vs 80mm)', () => {
    it('computes 58mm roll width dimensions correctly', () => {
      const dim58 = getThermalRollDimensions('58mm');
      assert.strictEqual(dim58.rollWidth, '58mm');
      assert.ok(dim58.containerClass.includes('67.5') || dim58.containerClass.includes('270px'));
      assert.ok(dim58.fontSizeClass.includes('text-[11px]'));
      assert.strictEqual(dim58.maxNameLength, 22);
    });

    it('computes 80mm roll width dimensions correctly', () => {
      const dim80 = getThermalRollDimensions('80mm');
      assert.strictEqual(dim80.rollWidth, '80mm');
      assert.ok(dim80.containerClass.includes('87.5') || dim80.containerClass.includes('350px'));
      assert.ok(dim80.fontSizeClass.includes('text-xs'));
      assert.strictEqual(dim80.maxNameLength, 32);
    });
  });
});
