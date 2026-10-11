import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getPricingRulesAction,
  updatePricingRulesAction
} from '../pricing-actions.ts';
import { calculateMarkupPrices } from '../../inventory/product-registration.ts';
import { SWIFT_DB } from '../../mock-data/index.ts';

describe('STORY-7.2: Global Markup Rules Configuration (SIAA-39)', () => {
  beforeEach(async () => {
    // Reset back to baseline defaults before each test
    await updatePricingRulesAction({
      retailMarkup: 35,
      wholesaleMarkup: 18,
      aftermarketMarkup: 40,
      hourlyLaborRate: 450,
      userName: 'Admin System'
    });
  });

  it('Scenario 1: Global Markup Rule Control Panel Initialization (Retail 35%, Wholesale 18%, Aftermarket 40%)', async () => {
    const rules = await getPricingRulesAction();

    assert.ok(rules, 'Active pricing rules must be returned');
    assert.equal(rules.retailMarkup, 35, 'Standard Retail Markup % default must be 35%');
    assert.equal(rules.wholesaleMarkup, 18, 'Wholesale/Reseller Markup % default must be 18%');
    assert.equal(rules.aftermarketMarkup, 40, 'Performance Aftermarket Markup % default must be 40%');

    // Verify benchmark simulation for ₱1,000.00 motorcycle part
    const sampleCost = 1000;
    const retailSim = sampleCost * (1 + rules.retailMarkup / 100);
    const wholesaleSim = sampleCost * (1 + rules.wholesaleMarkup / 100);
    const aftermarketSim = sampleCost * (1 + rules.aftermarketMarkup / 100);

    assert.equal(retailSim, 1350, 'Retail simulation on ₱1,000 part must be ₱1,350.00 (+₱350 margin)');
    assert.equal(wholesaleSim, 1180, 'Wholesale simulation on ₱1,000 part must be ₱1,180.00 (+₱180 margin)');
    assert.equal(aftermarketSim, 1400, 'Aftermarket simulation on ₱1,000 part must be ₱1,400.00 (+₱400 margin)');
  });

  it('Scenario 2: Modification & Validation of Markup Percentages (0 < markup <= 200%)', async () => {
    // 1. Valid modification of Standard Retail Markup to 38%
    const updateResult = await updatePricingRulesAction({
      retailMarkup: 38,
      userName: 'Admin Manager',
      reason: 'Q4 margin update'
    });

    assert.equal(updateResult.success, true, 'Updating retail markup to 38% must succeed');
    assert.equal(updateResult.data?.retailMarkup, 38, 'Updated retail markup must be 38%');

    // Verify database / mock engine reflects the update
    const activeRules = await getPricingRulesAction();
    assert.equal(activeRules.retailMarkup, 38, 'Subsequent retrieval must reflect 38%');
    assert.equal(SWIFT_DB.pricingRules.retailMarkup, 38, 'SWIFT_DB.pricingRules must be synchronized');

    // 2. Reject zero percentage
    const resZero = await updatePricingRulesAction({ retailMarkup: 0 });
    assert.equal(resZero.success, false);
    assert.equal(resZero.code, 'VALIDATION_ERROR');

    // 3. Reject negative percentage
    const resNegative = await updatePricingRulesAction({ retailMarkup: -15 });
    assert.equal(resNegative.success, false);
    assert.equal(resNegative.code, 'VALIDATION_ERROR');

    // 4. Reject percentage exceeding 200%
    const resExceed = await updatePricingRulesAction({ retailMarkup: 201 });
    assert.equal(resExceed.success, false);
    assert.equal(resExceed.code, 'VALIDATION_ERROR');

    // 5. Test wholesale boundaries
    const resWholesaleInvalid = await updatePricingRulesAction({ wholesaleMarkup: 250 });
    assert.equal(resWholesaleInvalid.success, false);
    assert.equal(resWholesaleInvalid.code, 'VALIDATION_ERROR');

    // 6. Test aftermarket boundaries
    const resAftermarketInvalid = await updatePricingRulesAction({ aftermarketMarkup: -5 });
    assert.equal(resAftermarketInvalid.success, false);
    assert.equal(resAftermarketInvalid.code, 'VALIDATION_ERROR');
  });

  it('Scenario 3: Propagation to New Product Registration Calculation (₱500 cost -> ₱600 wholesale, ₱690 retail)', async () => {
    // Configure Retail to 38% and Wholesale to 20%
    const updateResult = await updatePricingRulesAction({
      retailMarkup: 38,
      wholesaleMarkup: 20,
      aftermarketMarkup: 45,
      userName: 'Admin Manager'
    });
    assert.equal(updateResult.success, true);

    const rules = updateResult.data!;
    const baseCost = 500;

    // Calculate with OEM specification
    const oemPrices = calculateMarkupPrices(baseCost, true, rules);
    assert.equal(
      oemPrices.wholesale,
      600,
      'Auto-calculated wholesale price for ₱500 cost at +20% markup must be exactly ₱600.00'
    );
    assert.equal(
      oemPrices.retail,
      690,
      'Auto-calculated OEM retail price for ₱500 cost at +38% markup must be exactly ₱690.00'
    );

    // Calculate with Aftermarket specification
    const aftermarketPrices = calculateMarkupPrices(baseCost, false, rules);
    assert.equal(
      aftermarketPrices.wholesale,
      600,
      'Auto-calculated wholesale price for ₱500 cost at +20% markup must remain ₱600.00'
    );
    assert.equal(
      aftermarketPrices.retail,
      725,
      'Auto-calculated Aftermarket retail price for ₱500 cost at +45% markup must be exactly ₱725.00'
    );
  });

  it('Scenario 4: Security Audit Trail Logging on Markup Adjustment', async () => {
    const priorLogCount = SWIFT_DB.auditLogs.length;

    await updatePricingRulesAction({
      retailMarkup: 38,
      wholesaleMarkup: 20,
      userName: 'Store Owner',
      reason: 'Strategic price increase'
    });

    assert.ok(
      SWIFT_DB.auditLogs.length > priorLogCount,
      'An audit log entry must be appended to SWIFT_DB.auditLogs'
    );

    const latestLog = SWIFT_DB.auditLogs[0];
    assert.ok(latestLog, 'Latest audit log entry must exist');
    assert.equal(latestLog.user, 'Store Owner', 'Audit log must record the modifier user name');
    assert.match(
      latestLog.action,
      /Retail from 35% to 38%/,
      'Audit log action must detail the previous vs updated Retail markup'
    );
    assert.match(
      latestLog.action,
      /Wholesale from 18% to 20%/,
      'Audit log action must detail the previous vs updated Wholesale markup'
    );
    assert.ok(latestLog.timestamp, 'Audit log must contain a valid timestamp');

    // Reset back to defaults for clean test environment
    await updatePricingRulesAction({
      retailMarkup: 35,
      wholesaleMarkup: 18,
      aftermarketMarkup: 40,
      hourlyLaborRate: 450
    });
  });
});
