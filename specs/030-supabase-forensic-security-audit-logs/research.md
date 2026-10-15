# Research & Technical Architecture: Supabase Forensic Security Audit Logs Schema, Immutable Ledger & RPC Logger

**Feature**: Supabase Forensic Security Audit Logs Schema, Immutable Ledger & RPC Logger  
**Ticket**: [SIAA-62](https://the-three-devsketeers.atlassian.net/browse/SIAA-62) (STORY-7.9)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  

---

## Technical Architecture & Design Decisions

### 1. PostgreSQL Immutability & Append-Only Guarantees

#### Context
Audit trails are vulnerable to tampering if privileged users or database clients can issue `UPDATE` or `DELETE` statements. Even if client-side code restricts modification, database-level invariants are required to satisfy compliance standards.

#### Decision
1. **Revoke DML Privileges**:
   - `REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.security_audit_logs FROM authenticated, anon, public;`
2. **PostgreSQL Trigger Guard**:
   - Create a `BEFORE UPDATE OR DELETE` trigger on `public.security_audit_logs` that unconditionally raises an exception:
     ```sql
     CREATE OR REPLACE FUNCTION public.prevent_security_audit_log_mutation()
     RETURNS trigger
     LANGUAGE plpgsql
     SECURITY DEFINER
     AS $$
     BEGIN
       RAISE EXCEPTION 'Security audit log records are immutable. UPDATE and DELETE operations are forbidden.'
         USING ERRCODE = 'integrity_constraint_violation';
     END;
     $$;

     CREATE TRIGGER trg_prevent_audit_log_mutation
     BEFORE UPDATE OR DELETE ON public.security_audit_logs
     FOR EACH ROW EXECUTE FUNCTION public.prevent_security_audit_log_mutation();
     ```
3. **Row Level Security (RLS)**:
   - Enable RLS: `ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;`
   - Create `SELECT` policy allowing authenticated users to read records (or scoped to admins).
   - Create `INSERT` policy allowing authenticated users or `log_security_event` to insert records.
   - Intentionally omit `UPDATE` and `DELETE` policies.

---

### 2. Atomic Stored Procedure RPC (`log_security_event`)

#### Context
Client applications cannot be trusted to self-report their `user_id` or `user_email`. If a compromised client sends `{ user_id: 'admin-uuid', user_email: 'owner@swift.ph' }`, an attacker could forge audit logs.

#### Decision
- Create `public.log_security_event(p_action text, p_severity text, p_terminal_ip text DEFAULT NULL, p_metadata jsonb DEFAULT '{}'::jsonb) RETURNS uuid`:
  - Defined with `SECURITY DEFINER` and `SET search_path = public, auth`.
  - Derives caller identity using `auth.uid()`.
  - Extracts email from `auth.jwt() ->> 'email'` or queries `auth.users` for the verified email. If executed in server/test mock without auth context, falls back safely to provided metadata or system user.
  - Validates `p_severity` against enum values: `'info'`, `'warning'`, `'security_alert'`.
  - Inserts directly into `public.security_audit_logs` and returns the newly generated UUID `id`.

---

### 3. Server Actions & Mock Fallback Architecture

#### Context
In local development, automated testing (Jest / Vitest), or when Supabase credentials are not populated in CI, Server Actions must continue functioning smoothly without breaking application rendering.

#### Decision
- In `lib/admin/audit-actions.ts`:
  - Maintain an in-memory audit store initialized with baseline audit items from `mockup/app.js` and `mock-data/`.
  - `getSecurityAuditLogsAction(options)`:
    - Attempt Supabase query on `security_audit_logs` ordered by `created_at DESC` with optional range pagination and severity filters.
    - On connection failure or missing environment variables, filter and slice in-memory records.
  - `logSecurityEventAction(params)`:
    - Calls Supabase RPC `log_security_event` or direct insert.
    - Appends to in-memory store as fallback.
  - `exportSecurityAuditLogsAction(options)`:
    - Queries filtered records and formats them as RFC 4180 CSV:
      `ID,Timestamp,User Email,Action,Severity,Terminal IP,Metadata`
    - Handles proper quotation and comma escaping.

---

### 4. UI Compliance with SWIFT Design Tokens

#### Context
Constitutional Principle I strictly forbids hardcoded hex/RGB values. `app/admin/logs/page.tsx` must render the System Activity & Security Logs table matching `mockup/admin.html` (`#auditLogsBody`) with rich aesthetics and zero hardcoded colors.

#### Decision
- Use semantic utility classes:
  - Table and panels: `bg-bg-card`, `border-border`, `text-text-primary`, `text-text-secondary`.
  - Severity Badges:
    - `info`: `bg-info-light text-info border border-info/30`
    - `warning`: `bg-accent-light text-accent border border-accent/30`
    - `security_alert`: `bg-danger-light text-danger border border-danger/30`
  - Terminal IP: `font-mono text-xs text-text-muted`
  - Action buttons: `bg-primary hover:bg-primary-hover text-white`
