import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeCsvCell,
  generateAccountingCsvString,
  computePeriodDateRange,
  exportAccountingCsvAction,
} from '../export.ts';
import type { CategoryPnlData } from '../../types/analytics.ts';

describe('Accounting CSV Export Dispatcher & Period Math (SIAA-37)', () => {
  describe('RFC 4180 Cell Sanitization', () => {
    it('returns regular strings unchanged if no special characters are present', () => {
      assert.equal(sanitizeCsvCell('Fluids & Engine Oils'), 'Fluids & Engine Oils');
      assert.equal(sanitizeCsvCell('Brakes'), 'Brakes');
    });

    it('encloses strings containing commas in double quotes', () => {
      assert.equal(sanitizeCsvCell('Tires, Tubes & Accessories'), '"Tires, Tubes & Accessories"');
    });

    it('escapes existing double quotes by doubling them and wrapping in quotes', () => {
      assert.equal(sanitizeCsvCell('Spark Plug 10" Thread'), '"Spark Plug 10"" Thread"');
    });

    it('encloses strings containing newlines or carriage returns in double quotes', () => {
      assert.equal(sanitizeCsvCell("Line 1\nLine 2"), '"Line 1\nLine 2"');
      assert.equal(sanitizeCsvCell("Line 1\r\nLine 2"), '"Line 1\r\nLine 2"');
    });

    it('formats numeric values with two decimal precision', () => {
      assert.equal(sanitizeCsvCell(9360), '9360.00');
      assert.equal(sanitizeCsvCell(0), '0.00');
      assert.equal(sanitizeCsvCell(1234.5), '1234.50');
    });

    it('safely handles null or undefined values', () => {
      assert.equal(sanitizeCsvCell(undefined as unknown as string), '');
      assert.equal(sanitizeCsvCell(null as unknown as string), '');
    });
  });

  describe('RFC 4180 CSV Document Compilation', () => {
    const samplePnlData: CategoryPnlData = {
      categories: [
        {
          category: 'Fluids & Engine Oils',
          units_sold: 24,
          gross_revenue: 9360.0,
          cogs: 6240.0,
          net_profit: 3120.0,
          margin_pct: 33.3,
        },
        {
          category: 'Labor / Service Bay',
          units_sold: 14,
          gross_revenue: 6800.0,
          cogs: 1200.0,
          net_profit: 5600.0,
          margin_pct: 82.4,
        },
      ],
      summary: {
        total_units_sold: 38,
        total_gross_revenue: 16160.0,
        total_cogs: 7440.0,
        total_net_profit: 8720.0,
        overall_margin_pct: 54.0,
      },
    };

    it('includes standard accounting headers matching Jira acceptance criteria', () => {
      const csv = generateAccountingCsvString(samplePnlData);
      const lines = csv.split('\r\n');
      assert.equal(
        lines[0],
        'Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %'
      );
    });

    it('emits properly escaped category rows with correct figures and percentage formatting', () => {
      const csv = generateAccountingCsvString(samplePnlData);
      const lines = csv.split('\r\n');
      assert.equal(lines[1], 'Fluids & Engine Oils,24,9360.00,6240.00,3120.00,33.3%');
      assert.equal(lines[2], 'Labor / Service Bay,14,6800.00,1200.00,5600.00,82.4%');
    });

    it('appends summary total footer row reflecting consolidated metrics', () => {
      const csv = generateAccountingCsvString(samplePnlData);
      const lines = csv.split('\r\n');
      assert.equal(lines[3], 'Total,38,16160.00,7440.00,8720.00,54.0%');
    });

    it('terminates lines with CRLF per RFC 4180', () => {
      const csv = generateAccountingCsvString(samplePnlData);
      assert.ok(csv.includes('\r\n'));
      assert.ok(csv.endsWith('\r\n'));
    });
  });

  describe('Graceful Zero-Data & Empty Period Handling', () => {
    it('generates valid RFC 4180 headers and zeroed summary when categories are empty', () => {
      const emptyData: CategoryPnlData = {
        categories: [],
        summary: {
          total_units_sold: 0,
          total_gross_revenue: 0,
          total_cogs: 0,
          total_net_profit: 0,
          overall_margin_pct: 0,
        },
      };

      const csv = generateAccountingCsvString(emptyData);
      const lines = csv.split('\r\n');
      assert.equal(
        lines[0],
        'Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %'
      );
      assert.equal(lines[1], 'Total,0,0.00,0.00,0.00,0.0%');
      assert.ok(!csv.includes('NaN'));
      assert.ok(!csv.includes('Infinity'));
    });
  });

  describe('Multi-Period Date Range Calculations', () => {
    it('computes daily bounds from start of day to end of day', () => {
      const { start, end } = computePeriodDateRange('daily');
      assert.equal(start.getHours(), 0);
      assert.equal(start.getMinutes(), 0);
      assert.equal(start.getSeconds(), 0);
      assert.equal(end.getHours(), 23);
      assert.equal(end.getMinutes(), 59);
      assert.equal(end.getSeconds(), 59);
      assert.equal(start.toDateString(), end.toDateString());
    });

    it('computes rolling 7-day weekly bounds spanning 6 days prior through current time', () => {
      const { start, end } = computePeriodDateRange('weekly');
      const diffMs = end.getTime() - start.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      assert.ok(diffDays >= 6 && diffDays <= 8);
    });

    it('computes monthly bounds from day 1 of current month', () => {
      const { start, end } = computePeriodDateRange('monthly');
      assert.equal(start.getDate(), 1);
      assert.equal(start.getFullYear(), end.getFullYear());
      assert.equal(start.getMonth(), end.getMonth());
    });
  });

  describe('Server Action exportAccountingCsvAction', () => {
    it('returns successful export payload with standardized filename and row count', async () => {
      const result = await exportAccountingCsvAction({ period: 'daily' });
      assert.equal(result.success, true);
      assert.ok(result.filename.startsWith('swift_revenue_report_'));
      assert.ok(result.filename.endsWith('.csv'));
      assert.ok(result.csvContent.length > 0);
      assert.ok(result.rowCount > 0);
      assert.equal(result.period, 'daily');
      assert.ok(!result.csvContent.includes('NaN'));
    });
  });
});
