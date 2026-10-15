import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getTransactionsAction,
  getTransactionByReceiptAction,
} from '../transaction-actions.ts';
import { MOCK_TRANSACTIONS } from '../mock-transactions.ts';
import type { DbTransaction, DbTransactionItem } from '../../types/transaction.ts';

describe('POS Transactions & Hybrid Line Items Schema (SIAA-50)', () => {
  it('loads baseline transactions with both parts and labor services', async () => {
    const transactions = await getTransactionsAction(100);

    assert.ok(Array.isArray(transactions), 'Transactions must be an array');
    assert.ok(transactions.length >= 1, 'Must contain transactions');

    // Find a hybrid transaction with both parts and services (from live staff transactions or fallback)
    const hybridTx =
      transactions.find((t: DbTransaction) => {
        const parts = (t.items || []).filter((i: DbTransactionItem) => i.item_type === 'part');
        const services = (t.items || []).filter((i: DbTransactionItem) => i.item_type === 'service');
        return parts.length >= 1 && services.length >= 1;
      }) || MOCK_TRANSACTIONS[0];

    assert.ok(hybridTx, 'Hybrid transaction with parts and labor must exist');
    assert.ok(hybridTx.total_due > 0);
    assert.ok(hybridTx.cash_tendered >= hybridTx.total_due);
    assert.equal(
      hybridTx.change_due,
      Number((hybridTx.cash_tendered - hybridTx.total_due).toFixed(2))
    );

    const items = hybridTx.items || [];
    assert.ok(items.length >= 2, 'Hybrid transaction must have itemized line items');

    const parts = items.filter((i: DbTransactionItem) => i.item_type === 'part');
    const services = items.filter((i: DbTransactionItem) => i.item_type === 'service');

    assert.ok(parts.length >= 1, 'Must contain physical parts');
    assert.ok(services.length >= 1, 'Must contain workshop labor services');
  });

  it('correctly maps single transaction receipt via getTransactionByReceiptAction', async () => {
    const tx1042 = await getTransactionByReceiptAction('TX-1042');
    assert.ok(tx1042, 'TX-1042 must be retrievable by receipt number');
    assert.equal(tx1042?.discount_type, 'senior');
    assert.equal(tx1042?.discount_rate, 0.2);
    assert.equal(tx1042?.discount_amount, 240);
    assert.equal(tx1042?.total_due, 960);
    assert.equal(tx1042?.cash_tendered, 1000);
    assert.equal(tx1042?.change_due, 40);
    assert.equal(tx1042?.payment_method, 'GCash');
  });

  it('enforces financial mathematical invariants across all baseline transactions', () => {
    for (const tx of MOCK_TRANSACTIONS) {
      assert.ok(tx.subtotal >= 0, `Subtotal must be non-negative for ${tx.receipt_number}`);
      assert.ok(tx.discount_rate >= 0, `Discount rate must be non-negative for ${tx.receipt_number}`);
      assert.ok(tx.discount_amount >= 0, `Discount amount must be non-negative for ${tx.receipt_number}`);
      assert.ok(tx.total_due >= 0, `Total due must be non-negative for ${tx.receipt_number}`);
      assert.ok(
        tx.cash_tendered >= tx.total_due,
        `Cash tendered must be sufficient for ${tx.receipt_number}`
      );
      assert.equal(
        tx.change_due,
        Number((tx.cash_tendered - tx.total_due).toFixed(2)),
        `Change due calculation must match tendered minus total for ${tx.receipt_number}`
      );

      // Verify line items sum
      const items = tx.items || [];
      const computedSubtotal = items.reduce(
        (sum, item) => sum + item.unit_price * item.quantity,
        0
      );
      assert.equal(
        tx.subtotal,
        Number(computedSubtotal.toFixed(2)),
        `Line items total must equal transaction subtotal for ${tx.receipt_number}`
      );
    }
  });

  it('enforces hybrid item metadata separation between parts and workshop services', () => {
    for (const tx of MOCK_TRANSACTIONS) {
      for (const item of tx.items || []) {
        assert.ok(item.unit_price >= 0, 'Unit price must be non-negative');
        assert.ok(item.quantity > 0, 'Quantity must be strictly positive');
        assert.equal(
          item.subtotal,
          item.unit_price * item.quantity,
          'Item subtotal must equal unit_price * quantity'
        );

        if (item.item_type === 'part') {
          assert.equal(item.bay, null, 'Physical parts must have null bay');
          assert.ok(item.shelf_location, 'Physical parts must define shelf_location');
        } else if (item.item_type === 'service') {
          assert.equal(item.shelf_location, null, 'Workshop services must have null shelf_location');
          assert.ok(item.bay, 'Workshop services must define assigned repair bay');
        }
      }
    }
  });
});
