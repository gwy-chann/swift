import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  formatPhilippinePeso,
  calculateGrowthVariance,
  formatWorkOrdersQueue,
  formatNetProfitMargin,
  deriveCriticalLowStockState,
} from '../kpi-calculator.ts';

describe('Executive KPI Dashboard & Operational Health Metric Cards (SIAA-33)', () => {
  describe('Scenario 1: Daily Gross Revenue KPI Calculation', () => {
    it('formats gross revenue correctly into Philippine Pesos (₱)', () => {
      assert.equal(formatPhilippinePeso(45230), '₱45,230.00');
      assert.equal(formatPhilippinePeso(1250.5), '₱1,250.50');
      assert.equal(formatPhilippinePeso(0), '₱0.00');
      assert.equal(formatPhilippinePeso(1000000), '₱1,000,000.00');
      assert.equal(formatPhilippinePeso(-500), '-₱500.00');
    });

    it('calculates comparative growth percentage variance versus previous business day', () => {
      // 45,230 vs 39,600 is ~ +14.2%
      const resultPositive = calculateGrowthVariance(45230, 39605.95);
      assert.equal(resultPositive.formattedText, '+14.2% vs yesterday');
      assert.equal(resultPositive.isPositive, true);

      // Negative growth
      const resultNegative = calculateGrowthVariance(30000, 40000);
      assert.equal(resultNegative.formattedText, '-25.0% vs yesterday');
      assert.equal(resultNegative.isPositive, false);

      // Explicit percentage override
      const resultExplicit = calculateGrowthVariance(45230, undefined, 14.2);
      assert.equal(resultExplicit.formattedText, '+14.2% vs yesterday');
      assert.equal(resultExplicit.isPositive, true);

      // Yesterday was 0
      const resultZeroYesterday = calculateGrowthVariance(5000, 0);
      assert.equal(resultZeroYesterday.formattedText, '+100.0% vs yesterday');

      // Fallback benchmark
      const resultFallback = calculateGrowthVariance(45230);
      assert.equal(resultFallback.formattedText, '+14.2% vs yesterday');
    });
  });

  describe('Scenario 2: Active Service Bay Work Orders Monitoring', () => {
    it('displays exact count of active in-progress jobs', () => {
      const q1 = formatWorkOrdersQueue(8, 3);
      assert.equal(q1.value, '8 Active');
    });

    it('highlights jobs pending parts retrieval from the warehouse in subtext', () => {
      const q1 = formatWorkOrdersQueue(8, 3);
      assert.equal(q1.subtext, '3 Pending Parts Assembly');

      const q2 = formatWorkOrdersQueue(0, 0);
      assert.equal(q2.value, '0 Active');
      assert.equal(q2.subtext, '0 Pending Parts Assembly');
    });
  });

  describe('Scenario 3: Net Profit Margin Synthesis', () => {
    it('displays synthesized net percentage alongside total gross profit in currency', () => {
      const pnl = formatNetProfitMargin(34.8, 182400.0);
      assert.equal(pnl.value, '34.8%');
      assert.equal(pnl.subtext, '₱182,400.00 Gross Profit');
    });

    it('handles custom margin percentages and decimal profit values', () => {
      const pnl = formatNetProfitMargin(28.45, 95120.75);
      assert.equal(pnl.value, '28.5%');
      assert.equal(pnl.subtext, '₱95,120.75 Gross Profit');
    });
  });

  describe('Scenario 4: Critical Low-Stock Action Alert & Redirection', () => {
    it('displays exact SKU count and high-visibility danger styling when items are low stock', () => {
      const lowStockState = deriveCriticalLowStockState(3);
      assert.equal(lowStockState.value, '3 SKUs');
      assert.equal(lowStockState.badge, 'ALERT');
      assert.equal(lowStockState.badgeVariant, 'danger');
      assert.equal(lowStockState.isDanger, true);
      assert.equal(lowStockState.subtext, 'Restock immediately');
      assert.equal(lowStockState.subtextColor, 'text-danger');
    });

    it('provides correct redirection route to low-stock filtered view in inventory module', () => {
      const lowStockState = deriveCriticalLowStockState(3);
      assert.equal(lowStockState.href, '/admin/inventory?status=low_stock');

      const customLinkState = deriveCriticalLowStockState(5, false, '/admin/inventory?filter=low_stock');
      assert.equal(customLinkState.href, '/admin/inventory?filter=low_stock');
    });

    it('renders normal status when low stock count is 0 without forced danger', () => {
      const healthyState = deriveCriticalLowStockState(0, false);
      assert.equal(healthyState.value, '0 SKUs');
      assert.equal(healthyState.badge, 'Action Req');
      assert.equal(healthyState.badgeVariant, 'default');
      assert.equal(healthyState.isDanger, false);
      assert.equal(healthyState.subtext, 'Below threshold limit');
      assert.equal(healthyState.subtextColor, 'text-text-muted');
    });
  });
});
