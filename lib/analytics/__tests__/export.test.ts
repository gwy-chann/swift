import test from 'node:test';
import assert from 'node:assert/strict';
import {
  generateAccountingCsvString,
} from '../export-utils.ts';
import {
  exportAccountingCsvAction,
} from '../export.ts';
import type { CategoryPnlData } from '../../types/analytics.ts';

const SAMPLE_PNL_DATA: CategoryPnlData = {
  categories: [
    {
      category: 'Fluids & Lubricants',
      units_sold: 45,
      gross_revenue: 12500.0,
      cogs: 7500.0,
      net_profit: 5000.0,
      margin_pct: 40.0,
    },
    {
      category: 'Drivetrain',
      units_sold: 18,
      gross_revenue: 18450.0,
      cogs: 11070.0,
      net_profit: 7380.0,
      margin_pct: 40.0,
    },
    {
      category: 'Workshop Labor',
      units_sold: 28,
      gross_revenue: 14280.0,
      cogs: 0.0,
      net_profit: 14280.0,
      margin_pct: 100.0,
    },
  ],
  summary: {
    total_units_sold: 91,
    total_gross_revenue: 45230.0,
    total_cogs: 18570.0,
    total_net_profit: 26660.0,
    overall_margin_pct: 58.94,
  },
};

test('generateAccountingCsvString - formats standard RFC 4180 headers and rows', () => {
  const csv = generateAccountingCsvString(SAMPLE_PNL_DATA);
  const lines = csv.trim().split('\r\n');

  // Verify header row
  assert.strictEqual(
    lines[0],
    'Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %'
  );

  // Verify first row
  assert.strictEqual(
    lines[1],
    'Fluids & Lubricants,45,12500.00,7500.00,5000.00,40.0%'
  );

  // Verify Workshop Labor row
  assert.strictEqual(
    lines[3],
    'Workshop Labor,28,14280.00,0.00,14280.00,100.0%'
  );

  // Verify Summary footer row
  assert.strictEqual(
    lines[4],
    'Total,91,45230.00,18570.00,26660.00,58.9%'
  );
});

test('generateAccountingCsvString - sanitizes values containing commas and quotes', () => {
  const dataWithSpecialChars: CategoryPnlData = {
    categories: [
      {
        category: 'Engine, "Belts" & Sprockets',
        units_sold: 5,
        gross_revenue: 2500.0,
        cogs: 1500.0,
        net_profit: 1000.0,
        margin_pct: 40.0,
      },
    ],
    summary: {
      total_units_sold: 5,
      total_gross_revenue: 2500.0,
      total_cogs: 1500.0,
      total_net_profit: 1000.0,
      overall_margin_pct: 40.0,
    },
  };

  const csv = generateAccountingCsvString(dataWithSpecialChars);
  const lines = csv.trim().split('\r\n');

  assert.strictEqual(
    lines[1],
    '"Engine, ""Belts"" & Sprockets",5,2500.00,1500.00,1000.00,40.0%'
  );
});

test('generateAccountingCsvString - handles empty category data gracefully', () => {
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
  const lines = csv.trim().split('\r\n');

  assert.strictEqual(lines.length, 2);
  assert.strictEqual(
    lines[0],
    'Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %'
  );
  assert.strictEqual(lines[1], 'Total,0,0.00,0.00,0.00,0.0%');
});

test('exportAccountingCsvAction - returns valid export metadata and filename', async () => {
  const result = await exportAccountingCsvAction({ period: 'daily' });

  assert.strictEqual(result.success, true);
  assert.strictEqual(result.period, 'daily');
  assert.match(result.filename, /^swift_revenue_report_\d{4}-\d{2}-\d{2}\.csv$/);
  assert.ok(result.csvContent.includes('Category,Units Sold,Gross Revenue'));
  assert.ok(result.rowCount > 0);
  assert.ok(typeof result.generatedAt === 'string');
});
