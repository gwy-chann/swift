import React from 'react';
import { ShieldCheck } from 'lucide-react';
import { getSecurityAuditLogsAction } from '@/lib/admin/audit-actions';
import { AuditLogsTable } from '@/components/admin/logs/audit-logs-table';
import { MOCK_STOCK_ADJUSTMENT_LOGS } from '@/lib/mock-data/logs';

export const metadata = {
  title: 'System Settings & Audit Logs | SWIFT Admin',
  description: 'Immutable forensic security audit logs and stock adjustment trails.',
};

export default async function AdminLogsPage() {
  const result = await getSecurityAuditLogsAction({ limit: 50, offset: 0 });
  const initialLogs = result.success && result.data ? result.data : [];
  const totalCount = result.totalCount ?? initialLogs.length;

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Top Header Section */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shadow-xs">
          <ShieldCheck className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-text-primary">System Settings & Audit Logs</h2>
          <p className="text-xs text-text-secondary">
            Immutable stock adjustment audit trails, terminal security session logs, and system configuration.
          </p>
        </div>
      </div>

      {/* 1. Stock Adjustment Audit Trail Panel */}
      <div className="rounded-xl bg-bg-card border border-border shadow-xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border bg-bg-surface flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-text-primary">Stock Adjustment Audit Trail</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Historical ledger of physical cycle counts, restocks, and damage write-offs.
            </p>
          </div>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-bg-muted text-text-secondary border border-border">
            Immutable Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-border bg-bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                <th className="py-3 px-4">Timestamp</th>
                <th className="py-3 px-4">SKU</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Change</th>
                <th className="py-3 px-4">Reason / Reference</th>
                <th className="py-3 px-4">Authorized By</th>
              </tr>
            </thead>
            <tbody id="stockAdjLogsBody" className="divide-y divide-border text-xs">
              {MOCK_STOCK_ADJUSTMENT_LOGS.map((log) => {
                const isPositive = log.change.startsWith('+');
                return (
                  <tr key={log.id} className="hover:bg-bg-hover/60 transition-colors">
                    <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-text-secondary">
                      {log.timestamp}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap font-mono font-bold text-text-primary">
                      {log.sku}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-light text-accent border border-accent/30">
                        {log.type}
                      </span>
                    </td>
                    <td
                      className={`py-3 px-4 whitespace-nowrap font-bold ${
                        isPositive ? 'text-success' : 'text-danger'
                      }`}
                    >
                      {log.change}
                    </td>
                    <td className="py-3 px-4 text-text-primary max-w-xs">{log.reason}</td>
                    <td className="py-3 px-4 whitespace-nowrap text-text-muted text-[11px]">
                      {log.user}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. System Activity & Security Logs Interactive Table */}
      <AuditLogsTable initialLogs={initialLogs} totalCount={totalCount} />
    </div>
  );
}
