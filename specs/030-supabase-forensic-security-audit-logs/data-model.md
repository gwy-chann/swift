# Data Model & Schema Specification: Supabase Forensic Security Audit Logs

**Feature**: Supabase Forensic Security Audit Logs Schema, Immutable Ledger & RPC Logger  
**Ticket**: [SIAA-62](https://the-three-devsketeers.atlassian.net/browse/SIAA-62) (STORY-7.9)  

---

## 1. Relational Database Schema (`public.security_audit_logs`)

### Table Definition
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
```

### Column Metadata
| Column | Type | Nullable | Default | Description |
|---|---|---|---|---|
| `id` | UUID | No | `gen_random_uuid()` | Immutable unique identifier |
| `timestamp` | TIMESTAMPTZ | No | `now()` | Business occurrence timestamp |
| `user_id` | UUID | Yes | `NULL` | Foreign key to `auth.users(id)` |
| `user_email` | TEXT | No | None | Verified email of acting user |
| `action` | TEXT | No | None | Human-readable description of event |
| `severity` | TEXT | No | `'info'` | `'info'` \| `'warning'` \| `'security_alert'` |
| `terminal_ip` | TEXT | Yes | `NULL` | IP address or client station descriptor |
| `metadata` | JSONB | No | `'{}'::jsonb` | Structured contextual metadata |
| `created_at` | TIMESTAMPTZ | No | `now()` | Physical record insertion timestamp |

### Indexes
- `idx_security_audit_logs_created_at_desc`: B-tree on `(created_at DESC)` for efficient reverse-chronological scanning.
- `idx_security_audit_logs_user_id`: B-tree on `(user_id)` for employee forensic auditing.
- `idx_security_audit_logs_severity`: B-tree on `(severity)` for security alert filtering.

---

## 2. Stored Procedure Interface (`public.log_security_event`)

```sql
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_action TEXT,
    p_severity TEXT DEFAULT 'info',
    p_terminal_ip TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_new_id UUID;
BEGIN
    -- Validate severity parameter
    IF p_severity NOT IN ('info', 'warning', 'security_alert') THEN
        RAISE EXCEPTION 'Invalid severity level: %. Allowed values are info, warning, security_alert.', p_severity
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Extract caller identity from auth context
    v_user_id := auth.uid();
    
    -- Resolve email from JWT or users table
    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
        IF v_email IS NULL THEN
            v_email := coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email', 'authenticated-user@swift.local');
        END IF;
    ELSE
        -- Fallback for internal system or non-interactive service calls
        v_email := coalesce(p_metadata->>'user_email', 'system@swift.local');
    END IF;

    -- Perform atomic insertion
    INSERT INTO public.security_audit_logs (
        user_id,
        user_email,
        action,
        severity,
        terminal_ip,
        metadata
    ) VALUES (
        v_user_id,
        v_email,
        p_action,
        p_severity,
        p_terminal_ip,
        p_metadata
    ) RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;
```

---

## 3. TypeScript Domain Models & DTOs

```typescript
export type AuditLogSeverity = 'info' | 'warning' | 'security_alert';

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

export interface LogSecurityEventParams {
  action: string;
  severity: AuditLogSeverity;
  terminalIp?: string;
  metadata?: Record<string, unknown>;
  userEmail?: string; // used only for fallback/mock test environments
}

export interface AuditActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  totalCount?: number;
}
```
