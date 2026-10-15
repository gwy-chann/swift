/**
 * Forensic Security Audit Logs Type Definitions
 * Source of truth: Jira SIAA-62 (STORY-7.9) & supabase/migrations/20261012000003_security_audit_logs.sql
 */

export type AuditLogSeverity = 'info' | 'warning' | 'security_alert';

/**
 * Raw database row shape for public.security_audit_logs
 */
export interface DbSecurityAuditLog {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_email: string;
  action: string;
  severity: AuditLogSeverity;
  terminal_ip: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

/**
 * Domain entity model for application layers and UI rendering
 */
export interface SecurityAuditLog {
  id: string;
  timestamp: string;
  userId?: string | null;
  userEmail: string;
  action: string;
  severity: AuditLogSeverity;
  terminalIp?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface GetAuditLogsOptions {
  severity?: AuditLogSeverity | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface ExportAuditLogsOptions extends GetAuditLogsOptions {
  format?: 'csv' | 'json';
}

export interface LogSecurityEventParams {
  action: string;
  severity: AuditLogSeverity;
  terminalIp?: string | null;
  metadata?: Record<string, unknown>;
  userEmail?: string;
}

export interface AuditActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  totalCount?: number;
}

/**
 * Translates a raw database security audit row into the domain SecurityAuditLog entity.
 */
export function mapDbSecurityAuditLog(row: DbSecurityAuditLog): SecurityAuditLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    userId: row.user_id,
    userEmail: row.user_email,
    action: row.action,
    severity: row.severity,
    terminalIp: row.terminal_ip,
    metadata: typeof row.metadata === 'object' && row.metadata !== null ? (row.metadata as Record<string, unknown>) : {},
    createdAt: row.created_at,
  };
}
