import React from 'react';
import { getStockAdjustmentLogsAction } from '@/lib/admin/stock-audit-actions';
import { StockAuditPanel } from '@/components/admin/logs/stock-audit-panel';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const stockResponse = await getStockAdjustmentLogsAction({ limit: 50 });

  const stockLogs = stockResponse.success ? stockResponse.logs : [];
  const stockMetrics = stockResponse.success
    ? stockResponse.metrics
    : {
        totalCount: 0,
        netDelta: 0,
        totalShrinkage: 0,
        totalIntake: 0,
      };
  const stockTotal = stockResponse.success ? stockResponse.total : 0;

  return (
    <div id="view-settings" className="space-y-6 animate-fadeIn">
      {/* 1. Stock Adjustment Audit Trail & Shrinkage Analytics (SIAA-65) */}
      <section aria-labelledby="stock-audit-heading">
        <StockAuditPanel
          initialLogs={stockLogs}
          initialMetrics={stockMetrics}
          initialTotal={stockTotal}
        />
      </section>
    </div>
  );
}
