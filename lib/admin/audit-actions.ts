'use server';

import type {
  SecurityAuditLog,
  GetAuditLogsOptions,
  ExportAuditLogsOptions,
  LogSecurityEventParams,
  AuditActionResult,
  DbSecurityAuditLog,
  AuditLogSeverity,
} from '../types/audit.ts';
import {
  LogSecurityEventInputSchema,
  GetAuditLogsFilterSchema,
} from '../contracts/audit.ts';
import { mapDbSecurityAuditLog } from '../types/audit.ts';

const BASELINE_SEED_AUDIT_LOGS: SecurityAuditLog[] = [
  {
    id: 'f0000000-0000-0000-0000-000000005091',
    timestamp: '2026-09-28 16:30',
    userId: null,
    userEmail: 'carlos.rodriguez@swift.ph',
    action: 'Modified Global Retail Markup rule from 30% to 35%',
    severity: 'warning',
    terminalIp: '192.168.1.100 (Admin PC)',
    metadata: { previousMarkup: 30, newMarkup: 35 },
    createdAt: new Date('2026-09-28T16:30:00Z').toISOString(),
  },
  {
    id: 'f0000000-0000-0000-0000-000000005090',
    timestamp: '2026-09-28 15:10',
    userId: null,
    userEmail: 'mike.morales@swift.ph',
    action: 'Applied 20% Senior Citizen Discount on TX-1041',
    severity: 'info',
    terminalIp: '192.168.1.102 (Terminal 1)',
    metadata: { invoice: 'TX-1041', discountRate: 0.2 },
    createdAt: new Date('2026-09-28T15:10:00Z').toISOString(),
  },
  {
    id: 'f0000000-0000-0000-0000-000000005089',
    timestamp: '2026-09-28 14:22',
    userId: null,
    userEmail: 'carlos.rodriguez@swift.ph',
    action: 'Executed Stock Adjustment ADJ-8821 on SKU YAM-NMAX-BL01',
    severity: 'info',
    terminalIp: '192.168.1.100 (Admin PC)',
    metadata: { adjustmentId: 'ADJ-8821', sku: 'YAM-NMAX-BL01' },
    createdAt: new Date('2026-09-28T14:22:00Z').toISOString(),
  },
  {
    id: 'f0000000-0000-0000-0000-000000005088',
    timestamp: '2026-09-28 08:00',
    userId: null,
    userEmail: 'mike.morales@swift.ph',
    action: 'Staff Shift Time-In (Shift #492)',
    severity: 'info',
    terminalIp: '192.168.1.102 (Terminal 1)',
    metadata: { shiftNumber: 492 },
    createdAt: new Date('2026-09-28T08:00:00Z').toISOString(),
  },
  {
    id: 'f0000000-0000-0000-0000-000000005087',
    timestamp: '2026-09-28 07:45',
    userId: null,
    userEmail: 'security@swift.ph',
    action: 'Failed Master Admin PIN Elevation (3 Consecutive Attempts)',
    severity: 'security_alert',
    terminalIp: '192.168.1.109 (Service Bay)',
    metadata: { failedAttempts: 3, terminal: 'Service Bay' },
    createdAt: new Date('2026-09-28T07:45:00Z').toISOString(),
  },
];

let memoryAuditLogs: SecurityAuditLog[] = [...BASELINE_SEED_AUDIT_LOGS];

/**
 * Resets the in-memory fallback audit store to the baseline seed logs.
 * Primarily utilized during testing and state isolation.
 */
export function resetMemoryAuditLogs(): void {
  memoryAuditLogs = BASELINE_SEED_AUDIT_LOGS.map((item) => ({
    ...item,
    metadata: { ...item.metadata },
  }));
}

async function safeRevalidatePaths(): Promise<void> {
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/admin/logs');
  } catch {
    // Suppressed when executing outside Next.js request context
  }
}

function filterInMemoryAuditLogs(
  logs: SecurityAuditLog[],
  filter: {
    severity?: AuditLogSeverity | 'all';
    searchQuery?: string;
    startDate?: string;
    endDate?: string;
  }
): SecurityAuditLog[] {
  let result = [...logs];

  if (filter.severity && filter.severity !== 'all') {
    result = result.filter((log) => log.severity === filter.severity);
  }

  if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
    const q = filter.searchQuery.trim().toLowerCase();
    result = result.filter(
      (log) =>
        log.action.toLowerCase().includes(q) ||
        log.userEmail.toLowerCase().includes(q) ||
        (log.terminalIp && log.terminalIp.toLowerCase().includes(q))
    );
  }

  if (filter.startDate) {
    const startMs = new Date(filter.startDate).getTime();
    result = result.filter((log) => new Date(log.createdAt).getTime() >= startMs);
  }

  if (filter.endDate) {
    const endMs = new Date(filter.endDate).getTime();
    result = result.filter((log) => new Date(log.createdAt).getTime() <= endMs);
  }

  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  return result;
}

/**
 * Retrieves security audit logs with optional severity filter, search keywords, and pagination.
 * Attempts Supabase query first; gracefully falls back to memory store on connection or configuration errors.
 */
export async function getSecurityAuditLogsAction(
  options?: GetAuditLogsOptions
): Promise<AuditActionResult<SecurityAuditLog[]>> {
  const validated = GetAuditLogsFilterSchema.safeParse(options ?? {});
  const filter = validated.success ? validated.data : { limit: 50, offset: 0, severity: 'all' as const };

  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    let query = supabase
      .from('security_audit_logs')
      .select('*', { count: 'exact' });

    if (filter.severity && filter.severity !== 'all') {
      query = query.eq('severity', filter.severity);
    }

    if (filter.searchQuery && filter.searchQuery.trim().length > 0) {
      const q = filter.searchQuery.trim();
      query = query.or(`action.ilike.%${q}%,user_email.ilike.%${q}%,terminal_ip.ilike.%${q}%`);
    }

    if (filter.startDate) {
      query = query.gte('created_at', filter.startDate);
    }

    if (filter.endDate) {
      query = query.lte('created_at', filter.endDate);
    }

    const from = filter.offset ?? 0;
    const to = from + (filter.limit ?? 50) - 1;

    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to);

    if (!error && data && data.length > 0) {
      const mapped = (data as DbSecurityAuditLog[]).map(mapDbSecurityAuditLog);
      return {
        success: true,
        data: mapped,
        totalCount: count ?? mapped.length,
      };
    }
  } catch {
    // Fall back to in-memory store
  }

  const filtered = filterInMemoryAuditLogs(memoryAuditLogs, filter);
  const totalCount = filtered.length;
  const from = filter.offset ?? 0;
  const to = from + (filter.limit ?? 50);
  const sliced = filtered.slice(from, to);

  return {
    success: true,
    data: sliced,
    totalCount,
  };
}


/**
 * Appends a security audit event to the ledger using the atomic stored procedure RPC.
 * Falls back to in-memory store if offline or running in mock environment.
 */
export async function logSecurityEventAction(
  params: LogSecurityEventParams
): Promise<AuditActionResult<SecurityAuditLog>> {
  const validation = LogSecurityEventInputSchema.safeParse(params);
  if (!validation.success) {
    const msg = validation.error.issues.map((i) => i.message).join('; ');
    return {
      success: false,
      error: `Validation error: ${msg}`,
    };
  }

  const { action, severity, terminalIp, metadata, userEmail } = validation.data;

  try {
    const { createClient } = await import('../supabase/server.ts');
    const supabase = await createClient();

    // Call stored procedure RPC public.log_security_event
    const { data: rpcId, error: rpcError } = await supabase.rpc('log_security_event', {
      p_action: action,
      p_severity: severity,
      p_terminal_ip: terminalIp ?? null,
      p_metadata: metadata ?? {},
    });

    if (!rpcError && rpcId) {
      const { data: row } = await supabase
        .from('security_audit_logs')
        .select('*')
        .eq('id', rpcId)
        .single();

      if (row) {
        const created = mapDbSecurityAuditLog(row as DbSecurityAuditLog);
        memoryAuditLogs.unshift(created);
        await safeRevalidatePaths();
        return { success: true, data: created };
      }
    }
  } catch {
    // Fall back to memory recording
  }

  const now = new Date();
  const created: SecurityAuditLog = {
    id: crypto.randomUUID(),
    timestamp: now.toISOString().replace('T', ' ').slice(0, 16),
    userId: null,
    userEmail: userEmail ?? 'admin@swift.ph',
    action,
    severity,
    terminalIp: terminalIp ?? '192.168.1.100 (Admin PC)',
    metadata: metadata ?? {},
    createdAt: now.toISOString(),
  };

  memoryAuditLogs.unshift(created);
  await safeRevalidatePaths();

  return {
    success: true,
    data: created,
  };
}

function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Generates an RFC 4180 compliant CSV string or formatted JSON string of filtered security audit logs.
 */
export async function exportSecurityAuditLogsAction(
  options?: ExportAuditLogsOptions
): Promise<string> {
  const result = await getSecurityAuditLogsAction({
    ...options,
    limit: 500,
    offset: 0,
  });

  const logs = result.success && result.data ? result.data : [];

  if (options?.format === 'json') {
    return JSON.stringify(logs, null, 2);
  }

  const headers = ['ID', 'Timestamp', 'User Email', 'Action', 'Severity', 'Terminal IP', 'Metadata'];
  const rows: string[] = [headers.join(',')];

  for (const log of logs) {
    const row = [
      escapeCsvCell(log.id),
      escapeCsvCell(log.timestamp),
      escapeCsvCell(log.userEmail),
      escapeCsvCell(log.action),
      escapeCsvCell(log.severity),
      escapeCsvCell(log.terminalIp),
      escapeCsvCell(log.metadata),
    ];
    rows.push(row.join(','));
  }

  return rows.join('\n');
}
