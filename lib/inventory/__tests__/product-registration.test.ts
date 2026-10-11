import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateMarkupPrices,
  normalizeSku,
  validateProductRegistration
} from '../product-registration.ts';
import type { ProductRegistrationInput } from '../product-registration.ts';

describe('product-registration domain engine', () => {
  describe('calculateMarkupPrices', () => {
    it('computes wholesale (+18%) and retail (+35%) for OEM parts (Scenario 2)', () => {
      const result = calculateMarkupPrices(500, true);
      assert.equal(result.wholesale, 590); // 500 * 1.18 = 590
      assert.equal(result.retail, 675);    // 500 * 1.35 = 675
    });

    it('computes wholesale (+18%) and retail (+40%) for Aftermarket parts (Scenario 2)', () => {
      const result = calculateMarkupPrices(500, false);
      assert.equal(result.wholesale, 590); // 500 * 1.18 = 590
      assert.equal(result.retail, 700);    // 500 * 1.40 = 700
    });

    it('handles decimal rounding accurately to two decimal places', () => {
      const result = calculateMarkupPrices(333.33, false);
      // wholesale: 333.33 * 1.18 = 393.3294 -> 393.33
      // retail: 333.33 * 1.40 = 466.662 -> 466.66
      assert.equal(result.wholesale, 393.33);
      assert.equal(result.retail, 466.66);
    });

    it('respects custom store pricing rules if provided', () => {
      const customRules = {
        wholesaleMarkup: 20,
        retailMarkup: 50,
        aftermarketMarkup: 60,
        hourlyLaborRate: 500
      };
      const result = calculateMarkupPrices(100, false, customRules);
      assert.equal(result.wholesale, 120);
      assert.equal(result.retail, 160);
    });

    it('returns zero prices for zero or negative unit cost', () => {
      assert.deepEqual(calculateMarkupPrices(0, true), { wholesale: 0, retail: 0 });
      assert.deepEqual(calculateMarkupPrices(-50, false), { wholesale: 0, retail: 0 });
    });
  });

  describe('normalizeSku', () => {
    it('trims leading/trailing whitespace and converts to uppercase', () => {
      assert.equal(normalizeSku('  yam-nmax-bl01  '), 'YAM-NMAX-BL01');
      assert.equal(normalizeSku('rcb-aer-bp01'), 'RCB-AER-BP01');
      assert.equal(normalizeSku('HON-CLK-01'), 'HON-CLK-01');
    });

    it('returns empty string for null, undefined, or empty values', () => {
      assert.equal(normalizeSku(''), '');
      assert.equal(normalizeSku('   '), '');
    });
  });

  describe('validateProductRegistration', () => {
    const validPayload: ProductRegistrationInput = {
      sku: 'RCB-AER-BP01',
      name: 'RCB Ceramic Brake Pads Front',
      category: 'Brakes',
      brand: 'Racing Boy',
      model: 'Yamaha Aerox 155',
      location: 'Rack A-02 / Shelf 1',
      specType: 'aftermarket',
      stock: 10,
      minThreshold: 5,
      cost: 300,
      wholesale: 354,
      retail: 420
    };

    it('passes validation for complete, valid product details', () => {
      const result = validateProductRegistration(validPayload, ['YAM-NMAX-BL01']);
      assert.equal(result.isValid, true);
      assert.deepEqual(result.errors, {});
    });

    it('detects case-insensitive SKU duplicate collisions (Scenario 3)', () => {
      const catalog = ['YAM-NMAX-BL01', 'HON-CLK-DR02'];

      // Exact match
      const r1 = validateProductRegistration({ ...validPayload, sku: 'YAM-NMAX-BL01' }, catalog);
      assert.equal(r1.isValid, false);
      assert.match(r1.errors.sku, /already exists/i);

      // Lowercase match
      const r2 = validateProductRegistration({ ...validPayload, sku: 'yam-nmax-bl01' }, catalog);
      assert.equal(r2.isValid, false);
      assert.match(r2.errors.sku, /already exists/i);

      // Match with surrounding whitespace
      const r3 = validateProductRegistration({ ...validPayload, sku: '  hon-clk-dr02  ' }, catalog);
      assert.equal(r3.isValid, false);
      assert.match(r3.errors.sku, /already exists/i);
    });

    it('rejects missing required text fields', () => {
      const incomplete = {
        ...validPayload,
        sku: '',
        name: '  ',
        category: '',
        brand: '',
        model: '',
        location: ''
      };
      const result = validateProductRegistration(incomplete, []);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.sku);
      assert.ok(result.errors.name);
      assert.ok(result.errors.category);
      assert.ok(result.errors.brand);
      assert.ok(result.errors.model);
      assert.ok(result.errors.location);
    });

    it('enforces cost > 0 and stock >= 0 and minThreshold >= 1', () => {
      const invalidNumeric = {
        ...validPayload,
        cost: 0,
        stock: -1,
        minThreshold: 0
      };
      const result = validateProductRegistration(invalidNumeric, []);
      assert.equal(result.isValid, false);
      assert.ok(result.errors.cost);
      assert.ok(result.errors.stock);
      assert.ok(result.errors.minThreshold);
    });

    it('permits initial stock to be 0 (pre-registered out of stock item)', () => {
      const zeroStockPayload = {
        ...validPayload,
        stock: 0
      };
      const result = validateProductRegistration(zeroStockPayload, []);
      assert.equal(result.isValid, true);
      assert.equal(result.errors.stock, undefined);
    });
  });
});
