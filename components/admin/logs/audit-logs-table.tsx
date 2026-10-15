'use client';

import React, { useState, useTransition } from 'react';
import {
  ShieldAlert,
  Download,
  Search,
  Filter,
  RefreshCw,
  Info,
  AlertTriangle,
  Shield,
} from 'lucide-react';
import type { SecurityAuditLog, AuditLogSeverity } from '@/lib/types/audit';
import {
  getSecurityAuditLogsAction,
  exportSecurityAuditLogsAction,
} from '@/lib/admin/audit-actions';

interface AuditLogsTableProps {
  initialLogs: SecurityAuditLog[];
  totalCount?: number;
}

export function AuditLogsTable({
  initialLogs,
  totalCount: initialTotal,
}: AuditLogsTableProps) {
  const [logs, setLogs] = useState<SecurityAuditLog[]>(initialLogs);
  const [totalCount, setTotalCount] = useState<number>(initialTotal ?? initialLogs.length);
  const [selectedSeverity, setSelectedSeverity] = useState<AuditLogSeverity | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isPending, startTransition] = useTransition();
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleFilterChange = (severity: AuditLogSeverity | 'all', search: string) => {
    startTransition(async () => {
      const res = await getSecurityAuditLogsAction({
        severity,
        searchQuery: search,
      });
      if (res.success && res.data) {
        setLogs(res.data);
        if (typeof res.totalCount === 'number') {
          setTotalCount(res.totalCount);
        }
      }
    });
  };

  const handleRefresh = () => {
    handleFilterChange(selectedSeverity, searchQuery);
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const csvData = await exportSecurityAuditLogsAction({
        severity: selectedSeverity,
        searchQuery,
      });

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `swift-security-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch {
      // Graceful error suppression on export
    } finally {
      setIsExporting(false);
    }
  };

  const renderSeverityBadge = (severity: AuditLogSeverity) => {
    switch (severity) {
      case 'security_alert':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-danger-light text-danger border border-danger/30">
            <ShieldAlert className="w-3.5 h-3.5" />
            Security Alert
          </span>
        );
      case 'warning':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-accent-light text-accent border border-accent/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            Warning
          </span>
        );
      case 'info':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-info-light text-info border border-info/30">
            <Info className="w-3.5 h-3.5" />
            Info
          </span>
        );
    }
  };

  return (
    <div className="rounded-xl bg-bg-card border border-border shadow-xs overflow-hidden">
      {/* Panel Header */}
      <div className="p-4 sm:p-5 border-b border-border bg-bg-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-text-primary">
              System Activity & Security Logs
            </h3>
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary-light text-primary border border-primary-border">
              {totalCount} Total Records
            </span>
          </div>
          <p className="text-xs text-text-secondary mt-0.5">
            Immutable forensic audit trail capturing terminal session events, elevations, and administrative overrides.
          </p>
        </div>

        {/* Toolbar Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Search Input */}
          <div className="relative min-w-[200px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              placeholder="Search action, email, IP..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                handleFilterChange(selectedSeverity, e.target.value);
              }}
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-bg-input border border-border text-text-primary placeholder:text-text-muted focus:outline-none focus:border-border-focus"
            />
          </div>

          {/* Severity Filter Dropdown */}
          <div className="relative flex items-center">
            <Filter className="w-3.5 h-3.5 absolute left-2.5 text-text-muted pointer-events-none" />
            <select
              value={selectedSeverity}
              onChange={(e) => {
                const val = e.target.value as AuditLogSeverity | 'all';
                setSelectedSeverity(val);
                handleFilterChange(val, searchQuery);
              }}
              className="pl-8 pr-7 py-1.5 text-xs rounded-lg bg-bg-input border border-border text-text-primary focus:outline-none focus:border-border-focus cursor-pointer appearance-none"
            >
              <option value="all">All Severities</option>
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="security_alert">Security Alert</option>
            </select>
          </div>

          {/* Refresh Button */}
          <button
            type="button"
            onClick={handleRefresh}
            disabled={isPending}
            title="Refresh logs"
            className="p-1.5 rounded-lg border border-border bg-bg-card hover:bg-bg-hover text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
          </button>

          {/* Export to CSV Button */}
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary hover:bg-primary-hover text-white transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {isExporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
      </div>

      {/* Responsive Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border bg-bg-muted/50 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
              <th className="py-3 px-4">Timestamp</th>
              <th className="py-3 px-4">User Account</th>
              <th className="py-3 px-4">Severity</th>
              <th className="py-3 px-4">Action Taken</th>
              <th className="py-3 px-4">Terminal IP</th>
            </tr>
          </thead>
          <tbody id="auditLogsBody" className="divide-y divide-border text-xs">
            {logs.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-text-muted">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Shield className="w-8 h-8 text-text-muted/60" />
                    <p className="font-medium text-text-secondary">No security audit records found</p>
                    <p className="text-[11px]">Try adjusting your search query or severity filter.</p>
                  </div>
                </td>
              </tr>
            ) : (
              logs.map((log) => (
                <tr
                  key={log.id}
                  className="hover:bg-bg-hover/60 transition-colors"
                >
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-text-secondary">
                    {log.timestamp}
                  </td>
                  <td className="py-3 px-4 font-semibold text-text-primary whitespace-nowrap">
                    {log.userEmail}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    {renderSeverityBadge(log.severity)}
                  </td>
                  <td className="py-3 px-4 text-text-primary leading-relaxed max-w-md">
                    {log.action}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-text-muted">
                    {log.terminalIp ?? '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
