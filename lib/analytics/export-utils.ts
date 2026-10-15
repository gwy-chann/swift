import type { CategoryPnlData } from '../types/analytics.ts';
import type { AnalyticsPeriod } from '../admin/pnl-cogs-utils.ts';

/**
 * Sanitizes a string or number for CSV inclusion according to RFC 4180.
 * Wraps fields in double quotes if they contain commas, double quotes, or newlines.
 * Escapes internal double quotes by doubling them ("").
 */
export function sanitizeCsvCell(value: string | number): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value.toFixed(2) : '0.00';
  }
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats a CategoryPnlData structure into an RFC 4180-compliant CSV string.
 * Structure:
 * Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %
 * ...category rows...
 * Total,[total_units],[total_gross],[total_cogs],[total_net],[overall_margin]%
 */
export function generateAccountingCsvString(data: CategoryPnlData): string {
  const CRLF = '\r\n';
  const headers = ['Category', 'Units Sold', 'Gross Revenue', 'COGS', 'Net Profit', 'Margin %'];
  const rows: string[] = [headers.join(',')];

  if (Array.isArray(data.categories)) {
    for (const item of data.categories) {
      const marginPct = Number.isFinite(item.margin_pct) ? item.margin_pct.toFixed(1) : '0.0';
      const row = [
        sanitizeCsvCell(item.category),
        String(item.units_sold ?? 0),
        sanitizeCsvCell(item.gross_revenue ?? 0),
        sanitizeCsvCell(item.cogs ?? 0),
        sanitizeCsvCell(item.net_profit ?? 0),
        `${marginPct}%`,
      ];
      rows.push(row.join(','));
    }
  }

  // Summary footer row
  const summary = data.summary || {
    total_units_sold: 0,
    total_gross_revenue: 0,
    total_cogs: 0,
    total_net_profit: 0,
    overall_margin_pct: 0,
  };

  const overallMargin = Number.isFinite(summary.overall_margin_pct)
    ? summary.overall_margin_pct.toFixed(1)
    : '0.0';

  const footerRow = [
    'Total',
    String(summary.total_units_sold ?? 0),
    sanitizeCsvCell(summary.total_gross_revenue ?? 0),
    sanitizeCsvCell(summary.total_cogs ?? 0),
    sanitizeCsvCell(summary.total_net_profit ?? 0),
    `${overallMargin}%`,
  ];
  rows.push(footerRow.join(','));

  return rows.join(CRLF) + CRLF;
}

/**
 * Computes date range for a designated financial period.
 */
export function computePeriodDateRange(period: AnalyticsPeriod = 'daily'): { start: Date; end: Date } {
  const now = new Date();
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  if (period === 'monthly') {
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    return { start, end };
  }

  if (period === 'weekly') {
    const start = new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000);
    start.setHours(0, 0, 0, 0);
    return { start, end };
  }

  // Default: daily
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return { start, end };
}
