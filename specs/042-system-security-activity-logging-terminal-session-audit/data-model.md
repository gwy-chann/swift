# Data Models, Schemas & Entity Specifications: System Security Activity Logging & Terminal Session Audit

**Feature**: `specs/042-system-security-activity-logging-terminal-session-audit`  
**Jira Ticket**: [SIAA-42](https://the-three-devsketeers.atlassian.net/browse/SIAA-42)  

---

## 1. Domain Entities & Type Definitions

### 1.1 `SecurityAuditLog` (Domain Entity)
The canonical domain model consumed across Server Actions, Client Components, and export generators:

```typescript
export type AuditLogSeverity = 'info' | 'warning' | 'security_alert';

export interface SecurityAuditLog {
  id: string; // UUID primary key
  timestamp: string; // Formatted date string (e.g. '2026-09-28 16:30')
  userId?: string | null; // Optional UUID referencing auth.users
  userEmail: string; // Authenticated user email or workstation role
  action: string; // Detailed narrative description of event
  severity: AuditLogSeverity; // Classification: 'info' | 'warning' | 'security_alert'
  terminalIp?: string | null; // Originating workstation IP or name
  metadata: Record<string, unknown>; // Structured contextual details
  createdAt: string; // ISO 8601 UTC timestamp
}
```

### 1.2 `DbSecurityAuditLog` (Database Row Shape)
The raw row representation in Supabase `public.security_audit_logs`:

```typescript
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
```

---

## 2. Server Action Request & Response DTOs

### 2.1 `LogSecurityEventParams`
```typescript
export interface LogSecurityEventParams {
  action: string; // Non-empty narrative
  severity: AuditLogSeverity; // 'info' | 'warning' | 'security_alert'
  terminalIp?: string | null; // Workstation identifier
  metadata?: Record<string, unknown>; // Arbitrary JSON payload
  userEmail?: string; // Optional user override
}
```

### 2.2 `GetAuditLogsOptions`
```typescript
export interface GetAuditLogsOptions {
  severity?: AuditLogSeverity | 'all';
  searchQuery?: string;
  startDate?: string;
  endDate?: string;
  limit?: number; // Defaults to 50
  offset?: number; // Defaults to 0
}
```

### 2.3 `ExportAuditLogsOptions`
```typescript
export interface ExportAuditLogsOptions extends GetAuditLogsOptions {
  format?: 'csv' | 'json'; // Defaults to 'csv'
}
```

### 2.4 `AuditActionResult<T>`
```typescript
export interface AuditActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  totalCount?: number;
}
```

---

## 3. Database Schema Mapping & Invariants

### 3.1 PostgreSQL Table Definition
```sql
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'security_alert')),
    terminal_ip TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at_desc ON public.security_audit_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_severity ON public.security_audit_logs (severity);
```

### 3.2 Immutability Guarantees
- `BEFORE UPDATE` or `BEFORE DELETE` triggers reject mutations with exception: `"Immutable security audit log record cannot be modified or deleted."`
- Append-only policy: `GRANT INSERT, SELECT ON public.security_audit_logs TO authenticated, service_role;`

---

## 4. Entity Mapping Function
```typescript
export function mapDbSecurityAuditLog(row: DbSecurityAuditLog): SecurityAuditLog {
  return {
    id: row.id,
    timestamp: row.timestamp,
    userId: row.user_id,
    userEmail: row.user_email,
    action: row.action,
    severity: row.severity,
    terminalIp: row.terminal_ip,
    metadata: typeof row.metadata === 'object' && row.metadata !== null 
      ? (row.metadata as Record<string, unknown>) 
      : {},
    createdAt: row.created_at,
  };
}
```
