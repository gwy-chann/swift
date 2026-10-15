import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CategoryPnlItemSchema,
  CategoryPnlSummarySchema,
} from '../../../specs/036-categorized-profit-loss-breakdown-cogs-engine/contracts/pnl-cogs.ts';
import {
  MOCK_CATEGORY_PNL_DATA,
} from '../pnl-actions.ts';
import {
  calculateNetProfit,
  calculateMarginPct,
  isHighYieldMargin,
  formatCurrencyPhp,
  formatUnitCount,
} from '../pnl-cogs-utils.ts';

describe('Category P&L Contracts & Acceptance Criteria Verification (SIAA-36)', () => {
  describe('Scenario 1: Aggregate Financial Metric Cards Data Invariants', () => {
    it('validates summary payload against CategoryPnlSummarySchema', () => {
      const parsed = CategoryPnlSummarySchema.safeParse(MOCK_CATEGORY_PNL_DATA.summary);
      assert.equal(parsed.success, true);
      assert.ok(MOCK_CATEGORY_PNL_DATA.summary.total_gross_revenue > 0);
      assert.ok(MOCK_CATEGORY_PNL_DATA.summary.total_cogs > 0);
      assert.ok(MOCK_CATEGORY_PNL_DATA.summary.total_net_profit > 0);
      assert.ok(MOCK_CATEGORY_PNL_DATA.summary.overall_margin_pct > 30.0);
    });

    it('formats summary currency figures with Philippine Peso symbol', () => {
      const grossFormatted = formatCurrencyPhp(MOCK_CATEGORY_PNL_DATA.summary.total_gross_revenue);
      assert.ok(grossFormatted.startsWith('₱'));
      assert.ok(grossFormatted.includes(','));
    });
  });

  describe('Scenario 2: Category Breakdown Table Columns & Rows', () => {
    it('ensures all categories conform to CategoryPnlItemSchema', () => {
      for (const item of MOCK_CATEGORY_PNL_DATA.categories) {
        const parsed = CategoryPnlItemSchema.safeParse(item);
        assert.equal(parsed.success, true, `Item ${item.category} failed schema validation`);
      }
    });

    it('contains all canonical categories from mockup and specs', () => {
      const categoryNames = MOCK_CATEGORY_PNL_DATA.categories.map((c) => c.category);
      assert.ok(categoryNames.includes('Fluids & Engine Oils'));
      assert.ok(categoryNames.includes('Drivetrain & Belts'));
      assert.ok(categoryNames.includes('Labor / Service Bay'));
      assert.ok(categoryNames.includes('Tires & Tubeless'));
      assert.ok(categoryNames.includes('Brake Systems'));
      assert.ok(categoryNames.includes('Electrical & Batteries'));
    });

    it('formats units sold for labor as Jobs and parts as counts', () => {
      const labor = MOCK_CATEGORY_PNL_DATA.categories.find((c) => c.category.includes('Labor'));
      assert.ok(labor);
      assert.equal(formatUnitCount(labor.category, labor.units_sold), `${labor.units_sold} Jobs`);

      const fluids = MOCK_CATEGORY_PNL_DATA.categories.find((c) => c.category.includes('Fluids'));
      assert.ok(fluids);
      assert.equal(formatUnitCount(fluids.category, fluids.units_sold), `${fluids.units_sold}`);
    });
  });

  describe('Scenario 3: Net Profit & Margin Computation Formula Integrity', () => {
    it('verifies Net Profit = Gross Revenue - COGS across every category', () => {
      for (const item of MOCK_CATEGORY_PNL_DATA.categories) {
        const expectedProfit = calculateNetProfit(item.gross_revenue, item.cogs);
        assert.equal(item.net_profit, expectedProfit, `Net profit mismatch for ${item.category}`);
      }
    });

    it('verifies Margin % = (Net Profit / Gross Revenue) * 100 rounded to 1 decimal place', () => {
      for (const item of MOCK_CATEGORY_PNL_DATA.categories) {
        const expectedMargin = calculateMarginPct(item.gross_revenue, item.cogs);
        assert.equal(item.margin_pct, expectedMargin, `Margin % mismatch for ${item.category}`);
      }
    });
  });

  describe('Scenario 4: High-Yield Margin Highlighting & Flagging', () => {
    it('identifies categories meeting or exceeding 30% margin threshold as high-yield', () => {
      const labor = MOCK_CATEGORY_PNL_DATA.categories.find((c) => c.category.includes('Labor'));
      assert.ok(labor);
      assert.equal(isHighYieldMargin(labor.margin_pct, 30.0), true);
      assert.ok(labor.margin_pct >= 80.0, 'Labor should exhibit high service margin');

      const fluids = MOCK_CATEGORY_PNL_DATA.categories.find((c) => c.category.includes('Fluids'));
      assert.ok(fluids);
      assert.equal(isHighYieldMargin(fluids.margin_pct, 30.0), true);
    });

    it('identifies categories below 30% margin threshold for pricing review flagging', () => {
      const tires = MOCK_CATEGORY_PNL_DATA.categories.find((c) => c.category.includes('Tires'));
      assert.ok(tires);
      assert.equal(isHighYieldMargin(tires.margin_pct, 30.0), false);
    });
  });
});
