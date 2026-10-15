import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  computeGrossMarkupPercent,
  computeWholesaleMarkupPercent,
  computeGrossMarginPercent,
  computeScPwdPrice,
  simulateMarginOutput,
} from '../margin-math.ts';
import { lookupProductPriceAction } from '../actions.ts';

describe('Instant SKU / Barcode Price Checker & Margin Simulator (SIAA-31)', () => {
  describe('Margin & Markup Math Engine', () => {
    it('computeGrossMarkupPercent accurately calculates cost-based markup percentage', () => {
      // Cost ₱280, Retail ₱450 -> ((450 - 280) / 280) * 100 = 60.714...% -> 60.7%
      assert.equal(computeGrossMarkupPercent(450, 280), 60.7);

      // Cost ₱350, Retail ₱580 -> ((580 - 350) / 350) * 100 = 65.714...% -> 65.7%
      assert.equal(computeGrossMarkupPercent(580, 350), 65.7);

      // Cost ₱520, Retail ₱850 -> ((850 - 520) / 520) * 100 = 63.461...% -> 63.5%
      assert.equal(computeGrossMarkupPercent(850, 520), 63.5);

      // Handles zero cost gracefully
      assert.equal(computeGrossMarkupPercent(100, 0), 0);
    });

    it('computeWholesaleMarkupPercent accurately calculates wholesale markup', () => {
      // Cost ₱280, Wholesale ₱380 -> ((380 - 280) / 280) * 100 = 35.714...% -> 35.7%
      assert.equal(computeWholesaleMarkupPercent(380, 280), 35.7);
    });

    it('computeGrossMarginPercent accurately calculates revenue-based gross margin', () => {
      // Cost ₱280, Retail ₱450 -> ((450 - 280) / 450) * 100 = 37.777...% -> 37.8%
      assert.equal(computeGrossMarginPercent(450, 280), 37.8);
      assert.equal(computeGrossMarginPercent(0, 280), 0);
    });

    it('computeScPwdPrice calculates statutory 20% discount price', () => {
      // Retail ₱450 -> 450 * 0.8 = ₱360.00
      assert.equal(computeScPwdPrice(450), 360.0);
      assert.equal(computeScPwdPrice(850), 680.0);
    });

    it('simulateMarginOutput correctly evaluates profitable scenarios', () => {
      const output = simulateMarginOutput({
        baseCost: 280,
        simulatedRetailPrice: 500,
      });

      assert.equal(output.simulatedGrossProfit, 220);
      assert.equal(output.simulatedGrossMarkupPercent, 78.6);
      assert.equal(output.simulatedGrossMarginPercent, 44.0);
      assert.equal(output.isProfitable, true);
      assert.equal(output.isBelowCost, false);
      assert.equal(output.marginStatus, 'profitable');
    });

    it('simulateMarginOutput identifies low margin (<15%) and below cost scenarios', () => {
      // Low margin: Cost ₱100, Retail ₱110 -> Margin = 9.1%
      const lowMargin = simulateMarginOutput({
        baseCost: 100,
        simulatedRetailPrice: 110,
      });
      assert.equal(lowMargin.marginStatus, 'low_margin');
      assert.equal(lowMargin.isProfitable, true);

      // Below cost: Cost ₱280, Retail ₱250 -> Profit -₱30
      const belowCost = simulateMarginOutput({
        baseCost: 280,
        simulatedRetailPrice: 250,
      });
      assert.equal(belowCost.isBelowCost, true);
      assert.equal(belowCost.isProfitable, false);
      assert.equal(belowCost.marginStatus, 'below_cost');
      assert.equal(belowCost.simulatedGrossProfit, -30);
    });
  });

  describe('Server Action lookupProductPriceAction', () => {
    it('returns dual-tier prices, cost, gross markup %, and shelf location for YAM-NMAX-BL01', async () => {
      const res = await lookupProductPriceAction('YAM-NMAX-BL01');
      assert.equal(res.success, true);
      assert.ok(res.product);

      assert.equal(res.product.sku, 'YAM-NMAX-BL01');
      assert.equal(res.product.cost, 280);
      assert.equal(res.product.wholesalePrice, 380);
      assert.equal(res.product.retailPrice, 450);
      assert.equal(res.product.grossMarkupPercent, 60.7);
      assert.equal(res.product.wholesaleMarkupPercent, 35.7);
      assert.equal(res.product.location, 'Rack A-01 / Shelf 2');
      assert.equal(res.product.scPwdPrice, 360.0);
    });

    it('returns correct data for HON-CLK-CVTB drive belt', async () => {
      const res = await lookupProductPriceAction('HON-CLK-CVTB');
      assert.equal(res.success, true);
      assert.ok(res.product);

      assert.equal(res.product.sku, 'HON-CLK-CVTB');
      assert.equal(res.product.cost, 520);
      assert.equal(res.product.wholesalePrice, 720);
      assert.equal(res.product.retailPrice, 850);
      assert.equal(res.product.grossMarkupPercent, 63.5);
      assert.equal(res.product.location, 'Rack B-04 / Shelf 1');
    });

    it('returns exact error message when item is not found', async () => {
      const res = await lookupProductPriceAction('UNKNOWN-CODE-999');
      assert.equal(res.success, false);
      assert.equal(res.code, 'PRODUCT_NOT_FOUND');
      assert.equal(res.error, 'No item found for barcode / code: "UNKNOWN-CODE-999".');
    });

    it('rejects blank query', async () => {
      const res = await lookupProductPriceAction('   ');
      assert.equal(res.success, false);
      assert.equal(res.code, 'INVALID_QUERY');
    });
  });
});
