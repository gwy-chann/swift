import type {
  StockAdjustmentLogEntry,
  StockAuditSummaryMetrics,
} from '../types/stock-audit.ts';

/**
 * Calculates aggregated inventory metrics across stock adjustment log entries.
 * Shrinkage represents inventory reduction (negative deltas), while intake represents positive deltas.
 */
export function calculateSummaryMetrics(
  logs: StockAdjustmentLogEntry[]
): StockAuditSummaryMetrics {
  let netDelta = 0;
  let totalShrinkage = 0;
  let totalIntake = 0;

  for (const log of logs) {
    netDelta += log.quantityDelta;
    if (log.quantityDelta < 0) {
      totalShrinkage += Math.abs(log.quantityDelta);
    } else {
      totalIntake += log.quantityDelta;
    }
  }

  return {
    totalCount: logs.length,
    netDelta,
    totalShrinkage,
    totalIntake,
  };
}

/**
 * Formats an ISO datetime string into local or readable standard audit format (YYYY-MM-DD HH:mm).
 */
export function formatAuditTimestamp(isoDate: string): string {
  try {
    const d = new Date(isoDate);
    if (isNaN(d.getTime())) return isoDate;
    const pad = (n: number) => String(n).padStart(2, '0');
    const year = d.getUTCFullYear();
    const month = pad(d.getUTCMonth() + 1);
    const day = pad(d.getUTCDate());
    const hours = pad(d.getUTCHours());
    const minutes = pad(d.getUTCMinutes());
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  } catch {
    return isoDate;
  }
}

/**
 * Helper to escape CSV field values according to RFC 4180 standards.
 */
function escapeCsvField(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '""';
  }
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates an RFC 4180-compliant CSV string from stock adjustment log entries.
 */
export function generateAuditCsv(logs: StockAdjustmentLogEntry[]): string {
  const headers = [
    'Timestamp (UTC)',
    'SKU',
    'Adjustment Type',
    'Quantity Delta',
    'Previous Stock',
    'New Stock',
    'Reason / Reference',
    'Authorized User',
  ];

  const rows = logs.map((log) => [
    escapeCsvField(formatAuditTimestamp(log.createdAt)),
    escapeCsvField(log.sku),
    escapeCsvField(log.adjustmentType),
    escapeCsvField(log.quantityDelta > 0 ? `+${log.quantityDelta}` : `${log.quantityDelta}`),
    escapeCsvField(log.previousStock),
    escapeCsvField(log.newStock),
    escapeCsvField(log.reason),
    escapeCsvField(log.userName),
  ]);

  const csvLines = [
    headers.map((h) => `"${h}"`).join(','),
    ...rows.map((row) => row.join(',')),
  ];

  return csvLines.join('\r\n');
}
