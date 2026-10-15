import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { getStockAdjustmentLogsAction } from '@/lib/admin/stock-audit-actions';
import { getSecurityAuditLogsAction } from '@/lib/admin/audit-actions';
import { StockAuditPanel } from '@/components/admin/logs/stock-audit-panel';
import { AuditLogsTable } from '@/components/admin/logs/audit-logs-table';

export const dynamic = 'force-dynamic';

export default async function AdminLogsPage() {
  const [stockResponse, auditResponse] = await Promise.all([
    getStockAdjustmentLogsAction({ limit: 50 }),
    getSecurityAuditLogsAction({ limit: 50 }),
  ]);

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

  const securityLogs = auditResponse.success && auditResponse.data ? auditResponse.data : [];
  const securityTotal = auditResponse.totalCount ?? securityLogs.length;

  return (
    <div id="view-settings" className="space-y-6 animate-fadeIn">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">
            System Settings & Audit Logs
          </h2>
          <p className="text-xs text-text-secondary">
            Immutable stock adjustment audit trails, terminal security session logs, and system compliance tracking.
          </p>
        </div>
      </div>

      {/* 1. Stock Adjustment Audit Trail & Shrinkage Analytics (SIAA-65) */}
      <section aria-labelledby="stock-audit-heading">
        <StockAuditPanel
          initialLogs={stockLogs}
          initialMetrics={stockMetrics}
          initialTotal={stockTotal}
        />
      </section>

      {/* 2. System Activity & Forensic Security Logs (SIAA-62) */}
      <section aria-labelledby="security-logs-heading">
        <AuditLogsTable
          initialLogs={securityLogs}
          totalCount={securityTotal}
        />
      </section>
    </div>
  );
}
