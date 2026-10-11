import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPricingRulesAction,
  updatePricingRulesAction,
  calculateProRatedLaborCharge
} from '../pricing-actions.ts';

describe('Admin Pricing Rules & Standard Hourly Labor Benchmark (SIAA-40)', () => {
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
});
