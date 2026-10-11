import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPricingRulesAction,
  updatePricingRulesAction,
  calculateProRatedLaborCharge
} from '../pricing-actions.ts';

describe('Admin Pricing Rules & Standard Hourly Labor Benchmark (SIAA-40 & SIAA-57)', () => {
  it('retrieves default pricing rules including benchmark hourly labor rate', async () => {
    const rules = await getPricingRulesAction();
    assert.ok(rules, 'Pricing rules must be defined');
    assert.equal(typeof rules.hourlyLaborRate, 'number', 'hourlyLaborRate must be a number');
    assert.equal(rules.hourlyLaborRate, 450, 'Default hourly labor rate benchmark should be ₱450.00');
    assert.equal(rules.retailMarkup, 35, 'Default retail markup should be 35%');
    assert.equal(rules.wholesaleMarkup, 18, 'Default wholesale markup should be 18%');
    assert.equal(rules.aftermarketMarkup, 40, 'Default aftermarket markup should be 40%');
  });

  it('calculates dynamic time-pro-rated labor charges accurately (Scenario 4)', () => {
    // Benchmark ₱450.00 / hour
    const rate450 = 450;
    assert.equal(calculateProRatedLaborCharge(15, rate450), 112.5);
    assert.equal(calculateProRatedLaborCharge(30, rate450), 225);
    assert.equal(calculateProRatedLaborCharge(45, rate450), 337.5);
    assert.equal(calculateProRatedLaborCharge(60, rate450), 450);
    assert.equal(calculateProRatedLaborCharge(90, rate450), 675);
    assert.equal(calculateProRatedLaborCharge(120, rate450), 900);

    // Custom benchmark ₱500.00 / hour
    const rate500 = 500;
    assert.equal(calculateProRatedLaborCharge(90, rate500), 750);
    assert.equal(calculateProRatedLaborCharge(60, rate500), 500);

    // Edge cases
    assert.equal(calculateProRatedLaborCharge(0, rate450), 0);
    assert.equal(calculateProRatedLaborCharge(-10, rate450), 0);
    assert.equal(calculateProRatedLaborCharge(60, 0), 0);
  });

  it('updates benchmark hourly labor rate successfully', async () => {
    const res = await updatePricingRulesAction({
      hourlyLaborRate: 500,
      userName: 'Service Desk Manager'
    });

    assert.equal(res.success, true);
    assert.equal(res.data?.hourlyLaborRate, 500);

    // Verify retrieval reflects new rate
    const rules = await getPricingRulesAction();
    assert.equal(rules.hourlyLaborRate, 500);

    // Reset back to 450 for other test isolation
    await updatePricingRulesAction({
      hourlyLaborRate: 450,
      userName: 'Service Desk Manager'
    });
  });

  it('rejects invalid hourly labor rates', async () => {
    const resNegative = await updatePricingRulesAction({
      hourlyLaborRate: -100
    });
    assert.equal(resNegative.success, false);
    assert.equal(resNegative.code, 'VALIDATION_ERROR');

    const resZero = await updatePricingRulesAction({
      hourlyLaborRate: 0
    });
    assert.equal(resZero.success, false);
    assert.equal(resZero.code, 'VALIDATION_ERROR');
  });

  it('updates global markup percentages successfully (SIAA-57 Scenario 3)', async () => {
    const res = await updatePricingRulesAction({
      retailMarkup: 38,
      wholesaleMarkup: 20,
      aftermarketMarkup: 45,
      userName: 'Store Owner',
      reason: 'Inflation adjustment Q4'
    });

    assert.equal(res.success, true);
    assert.equal(res.data?.retailMarkup, 38);
    assert.equal(res.data?.wholesaleMarkup, 20);
    assert.equal(res.data?.aftermarketMarkup, 45);

    const rules = await getPricingRulesAction();
    assert.equal(rules.retailMarkup, 38);
    assert.equal(rules.wholesaleMarkup, 20);
    assert.equal(rules.aftermarketMarkup, 45);

    // Reset back to defaults for clean test environment
    await updatePricingRulesAction({
      retailMarkup: 35,
      wholesaleMarkup: 18,
      aftermarketMarkup: 40
    });
  });

  it('rejects out-of-bounds retail markup percentages', async () => {
    // 0 or negative
    const resZero = await updatePricingRulesAction({ retailMarkup: 0 });
    assert.equal(resZero.success, false);
    assert.equal(resZero.code, 'VALIDATION_ERROR');

    const resNegative = await updatePricingRulesAction({ retailMarkup: -5 });
    assert.equal(resNegative.success, false);
    assert.equal(resNegative.code, 'VALIDATION_ERROR');

    // Greater than 200%
    const resOver = await updatePricingRulesAction({ retailMarkup: 205 });
    assert.equal(resOver.success, false);
    assert.equal(resOver.code, 'VALIDATION_ERROR');
  });

  it('rejects out-of-bounds wholesale markup percentages', async () => {
    const resZero = await updatePricingRulesAction({ wholesaleMarkup: 0 });
    assert.equal(resZero.success, false);
    assert.equal(resZero.code, 'VALIDATION_ERROR');

    const resOver = await updatePricingRulesAction({ wholesaleMarkup: 250 });
    assert.equal(resOver.success, false);
    assert.equal(resOver.code, 'VALIDATION_ERROR');
  });

  it('rejects out-of-bounds aftermarket markup percentages', async () => {
    const resZero = await updatePricingRulesAction({ aftermarketMarkup: 0 });
    assert.equal(resZero.success, false);
    assert.equal(resZero.code, 'VALIDATION_ERROR');

    const resOver = await updatePricingRulesAction({ aftermarketMarkup: 300 });
    assert.equal(resOver.success, false);
    assert.equal(resOver.code, 'VALIDATION_ERROR');
  });
});
