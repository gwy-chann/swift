import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  validateMultiPeriodReportData,
  validateAccountingCsvExportResult,
  analyticsPeriodSchema,
  financialReportSummarySchema,
  categoryPnlItemSchema,
} from '../../../specs/037-multi-period-sales-filter-accounting-csv-export-dispatcher/contracts/accounting-export.contract.ts';

describe('Multi-Period Sales Filter & Accounting CSV Contracts (SIAA-37)', () => {
  describe('Period Schema Validation', () => {
    it('validates permitted analytics periods: daily, weekly, monthly', () => {
      assert.equal(analyticsPeriodSchema.parse('daily'), 'daily');
      assert.equal(analyticsPeriodSchema.parse('weekly'), 'weekly');
      assert.equal(analyticsPeriodSchema.parse('monthly'), 'monthly');
    });

    it('rejects unsupported periods like yearly or quarterly', () => {
      assert.throws(() => analyticsPeriodSchema.parse('yearly'));
      assert.throws(() => analyticsPeriodSchema.parse('quarterly'));
    });
  });

  describe('Financial Report Summary Schema', () => {
    it('validates normal summary structures with positive counts and amounts', () => {
      const valid = {
        total_units_sold: 71,
        total_gross_revenue: 45230.0,
        total_cogs: 27234.0,
        total_net_profit: 17996.0,
        overall_margin_pct: 39.8,
        completed_invoices_count: 38,
      };
      const parsed = financialReportSummarySchema.parse(valid);
      assert.equal(parsed.completed_invoices_count, 38);
      assert.equal(parsed.total_gross_revenue, 45230.0);
    });

    it('defaults zero-data fields safely without crashing', () => {
      const parsed = financialReportSummarySchema.parse({});
      assert.equal(parsed.total_units_sold, 0);
      assert.equal(parsed.total_gross_revenue, 0);
      assert.equal(parsed.total_cogs, 0);
      assert.equal(parsed.total_net_profit, 0);
      assert.equal(parsed.overall_margin_pct, 0);
      assert.equal(parsed.completed_invoices_count, 0);
    });
  });

  describe('Category PnL Item Schema', () => {
    it('validates itemized category fields', () => {
      const item = {
        category: 'Fluids & Engine Oils',
        units_sold: 24,
        gross_revenue: 9360.0,
        cogs: 6240.0,
        net_profit: 3120.0,
        margin_pct: 33.3,
      };
      const parsed = categoryPnlItemSchema.parse(item);
      assert.equal(parsed.category, 'Fluids & Engine Oils');
      assert.equal(parsed.units_sold, 24);
      assert.equal(parsed.margin_pct, 33.3);
    });
  });

  describe('Multi-Period Report Data Validation Helper', () => {
    it('validates a complete MultiPeriodReportData structure', () => {
      const payload = {
        period: 'daily',
        date_range_label: 'Today (2026-10-16)',
        summary: {
          total_units_sold: 71,
          total_gross_revenue: 45230.0,
          total_cogs: 27234.0,
          total_net_profit: 17996.0,
          overall_margin_pct: 39.8,
          completed_invoices_count: 38,
        },
        categories: [
          {
            category: 'Fluids & Engine Oils',
            units_sold: 24,
            gross_revenue: 9360.0,
            cogs: 6240.0,
            net_profit: 3120.0,
            margin_pct: 33.3,
          },
        ],
        generated_at: new Date().toISOString(),
      };

      const result = validateMultiPeriodReportData(payload);
      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.equal(result.data?.period, 'daily');
    });

    it('gracefully reports validation errors for malformed payloads', () => {
      const result = validateMultiPeriodReportData({ period: 'invalid' });
      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });

  describe('CSV Export Result Validation Helper', () => {
    it('validates a valid AccountingCsvExportResult', () => {
      const payload = {
        success: true,
        filename: 'swift_revenue_report_2026-10-16.csv',
        csvContent: 'Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %\r\n',
        rowCount: 6,
        period: 'daily',
        generatedAt: new Date().toISOString(),
      };

      const result = validateAccountingCsvExportResult(payload);
      assert.equal(result.success, true);
      assert.ok(result.data);
      assert.equal(result.data?.filename, 'swift_revenue_report_2026-10-16.csv');
    });

    it('rejects invalid CSV export result payloads', () => {
      const result = validateAccountingCsvExportResult({ success: 'not-a-bool' });
      assert.equal(result.success, false);
      assert.ok(result.error);
    });
  });
});
