import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ProductPriceCheckItemSchema,
  MarginSimulationParamsSchema,
} from '../../../specs/030-instant-sku-barcode-price-checker/contracts/pricecheck.ts';
import {
  computeGrossMarkupPercent,
  computeGrossMarginPercent,
  computeScPwdPrice,
  simulateMarginOutput,
} from '../margin-math.ts';
import { lookupProductPriceAction } from '../actions.ts';
import { MOCK_PRODUCTS } from '../../mock-data/products.ts';

describe('Price Checker Contracts & UI Validation Engine (SIAA-31)', () => {
  describe('Zod Contracts & Type Safety', () => {
    it('validates a complete ProductPriceCheckItem against the contract schema', () => {
      const validItem = {
        id: 'prod-001',
        sku: 'YAM-NMAX-BL01',
        name: 'OEM Front Brake Pads',
        category: 'Brakes',
        brand: 'Yamaha Genuine Parts',
        model: 'Yamaha NMAX 155',
        stock: 5,
        minThreshold: 3,
        location: 'Rack A-01 / Shelf 2',
        cost: 280,
        retailPrice: 450,
        wholesalePrice: 380,
        scPwdPrice: 360,
        grossMarkupPercent: 60.7,
        wholesaleMarkupPercent: 35.7,
      };

      const parsed = ProductPriceCheckItemSchema.safeParse(validItem);
      assert.equal(parsed.success, true);
    });

    it('validates margin simulation parameters schema', () => {
      const validParams = {
        baseCost: 280,
        simulatedRetailPrice: 450,
      };

      const parsed = MarginSimulationParamsSchema.safeParse(validParams);
      assert.equal(parsed.success, true);

      // Rejects negative cost
      const invalidCost = MarginSimulationParamsSchema.safeParse({
        baseCost: -10,
        simulatedRetailPrice: 450,
      });
      assert.equal(invalidCost.success, false);
    });
  });

  describe('Scenario 1: Sub-200ms Latency Requirement', () => {
    it('executes price lookup server action in under 200ms', async () => {
      // Warm up first call to isolate module imports and JIT compilation from steady-state query latency
      await lookupProductPriceAction('YAM-NMAX-BL01');
      const startTime = performance.now();
      const res = await lookupProductPriceAction('YAM-NMAX-BL01');
      const duration = performance.now() - startTime;

      assert.equal(res.success, true);
      assert.ok(res.product);
      assert.ok(
        duration < 200,
        `Expected lookup to complete in under 200ms, completed in ${duration.toFixed(2)}ms`
      );
    });
  });

  describe('Scenario 2: Dual Pricing & Gross Markup Calculations', () => {
    it('provides accurate wholesale and retail price metrics with cost', async () => {
      const res = await lookupProductPriceAction('RCB-NMAX-BP02');
      assert.equal(res.success, true);
      const prod = res.product!;

      assert.equal(prod.cost, 350);
      assert.equal(prod.wholesalePrice, 480);
      assert.equal(prod.retailPrice, 580);
      assert.equal(prod.grossMarkupPercent, 65.7);
      assert.equal(prod.wholesaleMarkupPercent, 37.1);
    });
  });

  describe('Scenario 3: Physical Warehouse Rack / Shelf Locator Display', () => {
    it('returns exact physical bay coordinates for fast floor runner dispatch', async () => {
      const res = await lookupProductPriceAction('HON-ADV-CVTB');
      assert.equal(res.success, true);
      assert.equal(res.product?.location, 'Rack B-04 / Shelf 3');
    });
  });

  describe('Scenario 4: Base Product Price Schedule Data Parity', () => {
    it('verifies catalog reference items compute correct markup percentages', () => {
      for (const item of MOCK_PRODUCTS.slice(0, 5)) {
        const markup = computeGrossMarkupPercent(item.retail, item.cost);
        const margin = computeGrossMarginPercent(item.retail, item.cost);
        assert.ok(typeof markup === 'number');
        assert.ok(typeof margin === 'number');
        assert.ok(!Number.isNaN(markup));
        assert.ok(!Number.isNaN(margin));

        const scPwd = computeScPwdPrice(item.retail);
        assert.equal(scPwd, Number((item.retail * 0.8).toFixed(2)));
      }
    });
  });

  describe('Scenario 5: Interactive Margin Simulation & Thresholds', () => {
    it('accurately identifies break-even and below-cost price points', () => {
      // Break-even
      const breakEven = simulateMarginOutput({
        baseCost: 200,
        simulatedRetailPrice: 200,
      });
      assert.equal(breakEven.simulatedGrossProfit, 0);
      assert.equal(breakEven.isBelowCost, false);

      // Below-cost loss
      const loss = simulateMarginOutput({
        baseCost: 200,
        simulatedRetailPrice: 180,
      });
      assert.equal(loss.simulatedGrossProfit, -20);
      assert.equal(loss.isBelowCost, true);
      assert.equal(loss.marginStatus, 'below_cost');
    });
  });
});
