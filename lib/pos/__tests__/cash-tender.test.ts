import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCashTender,
  generateQuickDenominations,
  formatPeso,
  roundMoney
} from '../cash-tender.ts';

describe('Cash Tender & Real-Time Change Calculation Engine (SIAA-21)', () => {
  describe('Scenario 1: Quick Denomination Tender Selection', () => {
    it('generates standard Philippine Peso denominations for ₱880.00 Total Due', () => {
      const totalDue = 880.0;
      const denominations = generateQuickDenominations(totalDue);

      assert.strictEqual(denominations.length, 4);

      // 1. Exact ₱880.00
      assert.strictEqual(denominations[0].amount, 880.0);
      assert.strictEqual(denominations[0].isExact, true);
      assert.ok(denominations[0].label.includes('880.00'));

      // 2. ₱1,000.00
      assert.strictEqual(denominations[1].amount, 1000.0);
      assert.strictEqual(denominations[1].isExact, false);

      // 3. ₱1,500.00
      assert.strictEqual(denominations[2].amount, 1500.0);
      assert.strictEqual(denominations[2].isExact, false);

      // 4. ₱2,000.00
      assert.strictEqual(denominations[3].amount, 2000.0);
      assert.strictEqual(denominations[3].isExact, false);
    });

    it('generates smaller bill denominations for lower basket totals (e.g. ₱230.00)', () => {
      const denominations = generateQuickDenominations(230.0);
      assert.strictEqual(denominations[0].amount, 230.0);
      assert.strictEqual(denominations[0].isExact, true);

      // Next natural boundaries
      assert.ok(denominations.length >= 2);
      for (let i = 1; i < denominations.length; i++) {
        assert.ok(denominations[i].amount > 230.0);
      }
    });

    it('handles zero or negative total due gracefully', () => {
      const denominations = generateQuickDenominations(0);
      assert.strictEqual(denominations[0].amount, 0);
      assert.strictEqual(denominations[0].isExact, true);
    });
  });

  describe('Scenario 2: Real-time Change Due Math', () => {
    it('calculates ₱120.00 change due when ₱1,000.00 is tendered for ₱880.00 total', () => {
      const totalDue = 880.0;
      const cashTendered = 1000.0;

      const result = calculateCashTender(totalDue, cashTendered);

      assert.strictEqual(result.totalDue, 880.0);
      assert.strictEqual(result.cashTendered, 1000.0);
      assert.strictEqual(result.changeDue, 120.0);
      assert.strictEqual(result.shortage, 0.0);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.isExact, false);
    });

    it('handles floating point precision cents accurately (e.g. ₱880.25 total with ₱1,000 tendered)', () => {
      const result = calculateCashTender(880.25, 1000.0);

      assert.strictEqual(result.changeDue, 119.75);
      assert.strictEqual(result.shortage, 0.0);
      assert.strictEqual(result.isValid, true);
    });
  });

  describe('Scenario 3: Under-Tender Validation Guard', () => {
    it('calculates shortage of ₱380.00 when only ₱500.00 is tendered for ₱880.00 total', () => {
      const totalDue = 880.0;
      const cashTendered = 500.0;

      const result = calculateCashTender(totalDue, cashTendered);

      assert.strictEqual(result.totalDue, 880.0);
      assert.strictEqual(result.cashTendered, 500.0);
      assert.strictEqual(result.changeDue, 0.0);
      assert.strictEqual(result.shortage, 380.0);
      assert.strictEqual(result.isValid, false);
      assert.strictEqual(result.isExact, false);
    });

    it('identifies shortage when zero cash is tendered', () => {
      const result = calculateCashTender(880.0, 0);

      assert.strictEqual(result.changeDue, 0.0);
      assert.strictEqual(result.shortage, 880.0);
      assert.strictEqual(result.isValid, false);
    });
  });

  describe('Scenario 4: Exact Tender Matching', () => {
    it('sets isExact to true with zero change and zero shortage when tendered matches total', () => {
      const totalDue = 880.0;
      const cashTendered = 880.0;

      const result = calculateCashTender(totalDue, cashTendered);

      assert.strictEqual(result.changeDue, 0.0);
      assert.strictEqual(result.shortage, 0.0);
      assert.strictEqual(result.isValid, true);
      assert.strictEqual(result.isExact, true);
    });
  });

  describe('Currency Formatting & Math Precision Utilities', () => {
    it('formats monetary values with Philippine Peso symbol and two decimal places', () => {
      assert.strictEqual(formatPeso(880), '₱880.00');
      assert.strictEqual(formatPeso(1000), '₱1,000.00');
      assert.strictEqual(formatPeso(120.5), '₱120.50');
    });

    it('rounds money half-up safely avoiding JavaScript floating point drift', () => {
      assert.ok(Math.abs(roundMoney(1.005) - 1.01) < 0.0001);
      assert.ok(Math.abs(roundMoney(120.00000000000001) - 120.0) < 0.0001);
    });
  });
});
