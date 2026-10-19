import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { calculateWarrantyStatus, STORE_WARRANTY_DAYS } from '../warranty.ts';
import { mapDbTransactionToThermalReceipt } from '../../pos/contracts.ts';
import { MOCK_TRANSACTIONS } from '../../pos/mock-transactions.ts';
import type { DbTransaction } from '../../types/transaction.ts';

describe('Dedicated Staff Purchase History & Warranty Verification (SIAA-73)', () => {
  const referenceNow = new Date('2026-10-19T12:00:00.000Z');

  const testTransactions: DbTransaction[] = [
    {
      id: 'tx-001',
      receipt_number: 'TX-20261019-9427',
      cashier_id: 'c-01',
      cashier_name: 'Mike Morales',
      pricing_mode: 'retail',
      subtotal: 850.0,
      discount_type: 'none',
      discount_rate: 0,
      discount_amount: 0,
      total_due: 850.0,
      cash_tendered: 1000.0,
      change_due: 150.0,
      payment_method: 'Cash',
      created_at: '2026-10-19T11:00:00.000Z',
      items: [
        {
          id: 'i-1',
          item_type: 'part',
          item_sku_or_code: 'HON-CLK-CVTB',
          item_name: 'OEM Drive Belt (Gates Bando)',
          unit_price: 850.0,
          quantity: 1,
          subtotal: 850.0,
          bay: null,
          shelf_location: 'Rack B-04 / Shelf 1'
        }
      ]
    },
    {
      id: 'tx-002',
      receipt_number: 'TX-20261015-1102',
      cashier_id: 'c-01',
      cashier_name: 'Mike Morales',
      pricing_mode: 'retail',
      subtotal: 1200.0,
      discount_type: 'senior',
      discount_rate: 0.2,
      discount_amount: 240.0,
      total_due: 960.0,
      cash_tendered: 1000.0,
      change_due: 40.0,
      payment_method: 'GCash',
      created_at: '2026-10-15T09:00:00.000Z', // 4 days ago
      items: [
        {
          id: 'i-2',
          item_type: 'part',
          item_sku_or_code: 'MOT-3100-10W40',
          item_name: 'Motul 3100 Gold 4T 10W40 (1L)',
          unit_price: 390.0,
          quantity: 2,
          subtotal: 780.0,
          shelf_location: 'Aisle 1 / Shelf 1'
        },
        {
          id: 'i-3',
          item_type: 'service',
          item_sku_or_code: 'SRV-OIL-01',
          item_name: 'Standard Oil & Gear Oil Change',
          unit_price: 420.0,
          quantity: 1,
          subtotal: 420.0,
          bay: 'Bay 1 / Quick Bay'
        }
      ]
    },
    {
      id: 'tx-003',
      receipt_number: 'TX-20261001-0084',
      cashier_id: 'c-02',
      cashier_name: 'Alex Santos',
      pricing_mode: 'wholesale',
      subtotal: 3500.0,
      discount_type: 'none',
      discount_rate: 0,
      discount_amount: 0,
      total_due: 3500.0,
      cash_tendered: 3500.0,
      change_due: 0,
      payment_method: 'Card',
      created_at: '2026-10-01T14:00:00.000Z', // 18 days ago (expired)
      items: [
        {
          id: 'i-4',
          item_type: 'part',
          item_sku_or_code: 'DEN-IU24-IR',
          item_name: 'Denso Iridium Power Spark Plug (IU24)',
          unit_price: 520.0,
          quantity: 5,
          subtotal: 2600.0,
          shelf_location: 'Rack C-02 / Shelf 2'
        }
      ]
    }
  ];

  describe('Scenario 1: Receipt Number & Item Filtering', () => {
    it('filters accurately by exact or partial receipt number', () => {
      const query = 'TX-20261019-9427'.toLowerCase();
      const matched = testTransactions.filter((tx) =>
        tx.receipt_number.toLowerCase().includes(query)
      );

      assert.equal(matched.length, 1);
      assert.equal(matched[0].receipt_number, 'TX-20261019-9427');
      assert.equal(matched[0].total_due, 850.0);
    });

    it('filters by item SKU contained within line items', () => {
      const query = 'MOT-3100'.toLowerCase();
      const matched = testTransactions.filter((tx) =>
        (tx.items || []).some((item) =>
          item.item_sku_or_code.toLowerCase().includes(query) ||
          item.item_name.toLowerCase().includes(query)
        )
      );

      assert.equal(matched.length, 1);
      assert.equal(matched[0].receipt_number, 'TX-20261015-1102');
    });

    it('filters by payment method', () => {
      const gcashTransactions = testTransactions.filter(
        (tx) => tx.payment_method.toLowerCase() === 'gcash'
      );
      assert.equal(gcashTransactions.length, 1);
      assert.equal(gcashTransactions[0].receipt_number, 'TX-20261015-1102');

      const cashTransactions = testTransactions.filter(
        (tx) => tx.payment_method.toLowerCase() === 'cash'
      );
      assert.equal(cashTransactions.length, 1);
      assert.equal(cashTransactions[0].receipt_number, 'TX-20261019-9427');
    });
  });

  describe('Scenario 2: Warranty Status Evaluation', () => {
    it('classifies transaction within 7 days as warranty eligible', () => {
      const todayTx = testTransactions[0];
      const statusToday = calculateWarrantyStatus(todayTx.created_at!, referenceNow);
      assert.equal(statusToday.isValid, true);
      assert.equal(statusToday.daysRemaining, 7);

      const fourDaysAgoTx = testTransactions[1];
      const status4Days = calculateWarrantyStatus(fourDaysAgoTx.created_at!, referenceNow);
      assert.equal(status4Days.isValid, true);
      assert.equal(status4Days.daysElapsed, 4);
      assert.equal(status4Days.daysRemaining, 3);
      assert.equal(status4Days.label, 'Warranty Valid (3 days left)');
    });

    it('classifies transaction beyond 7 days as warranty expired', () => {
      const expiredTx = testTransactions[2];
      const statusExpired = calculateWarrantyStatus(expiredTx.created_at!, referenceNow);
      assert.equal(statusExpired.isValid, false);
      assert.equal(statusExpired.daysRemaining, 0);
      assert.equal(statusExpired.label, 'Warranty Expired');
    });

    it('filters list strictly to warranty-eligible transactions', () => {
      const sevenDaysMs = STORE_WARRANTY_DAYS * 86_400_000;
      const eligible = testTransactions.filter((tx) => {
        const time = new Date(tx.created_at!).getTime();
        return referenceNow.getTime() - time <= sevenDaysMs;
      });

      assert.equal(eligible.length, 2);
      assert.ok(eligible.every((t) => t.receipt_number !== 'TX-20261001-0084'));
    });
  });

  describe('Scenario 3: Normalization for Thermal Receipt Preview & Reprint', () => {
    it('maps transaction to ThermalReceiptData ready for 80mm modal preview', () => {
      const tx = testTransactions[1];
      const receipt = mapDbTransactionToThermalReceipt(tx);

      assert.equal(receipt.receiptNumber, 'TX-20261015-1102');
      assert.equal(receipt.cashierName, 'Mike Morales');
      assert.equal(receipt.totalDue, 960.0);
      assert.equal(receipt.cashTendered, 1000.0);
      assert.equal(receipt.changeDue, 40.0);
      assert.equal(receipt.discountAmount, 240.0);
      assert.equal(receipt.discountType, 'senior');
      assert.equal(receipt.items.length, 2);

      // Verify line items
      const part = receipt.items.find((i) => i.itemType === 'part');
      assert.ok(part);
      assert.equal(part.skuOrCode, 'MOT-3100-10W40');
      assert.equal(part.shelfLocation, 'Aisle 1 / Shelf 1');

      const service = receipt.items.find((i) => i.itemType === 'service');
      assert.ok(service);
      assert.equal(service.skuOrCode, 'SRV-OIL-01');
      assert.equal(service.bay, 'Bay 1 / Quick Bay');
    });

    it('successfully processes all existing mock transactions', () => {
      for (const mockTx of MOCK_TRANSACTIONS) {
        const receipt = mapDbTransactionToThermalReceipt(mockTx);
        assert.ok(receipt.receiptNumber);
        assert.ok(receipt.items.length > 0);
        assert.ok(receipt.totalDue > 0);
      }
    });
  });
});
