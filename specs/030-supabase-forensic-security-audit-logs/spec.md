# Feature Specification: Supabase Forensic Security Audit Logs Schema, Immutable Ledger & RPC Logger

**Feature Branch**: `feat/SIAA-62-supabase-forensic-security-audit-logs`  
**Created**: 2026-10-15  
**Status**: Ready for Implementation  
**Jira Ticket**: [SIAA-62](https://the-three-devsketeers.atlassian.net/browse/SIAA-62) (STORY-7.9)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  
**Prerequisites**: [SIAA-43](https://the-three-devsketeers.atlassian.net/browse/SIAA-43) (STORY-1.6: Supabase Auth Migrations & Profiles Schema)  
**Blocks / Enables**: [SIAA-42](https://the-three-devsketeers.atlassian.net/browse/SIAA-42) (STORY-7.5: System Security Activity Logging & Terminal Session Audit)  

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Immutable Security Audit Logs Schema & Indexes (Priority: P1)

As a Master Administrator or Store Owner,  
I want a dedicated forensic security audit logs table in Supabase with strict foreign keys to auth users, high-performance descending timestamp indexes, and structured metadata,  
so that all security-sensitive administrative modifications, authorization elevation attempts, and terminal events are durably recorded in an organized schema.

**Why this priority**: Without this foundational schema and its index optimization, no security logging or audit querying can execute safely in the database.

**Independent Test**: Can be tested by running migration `20261012000003_security_audit_logs.sql` against PostgreSQL and inspecting table columns, constraints, foreign keys, and indexes in `pg_catalog`.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Applying the security audit logs schema migration
  Given a Supabase PostgreSQL instance
  When migration 20261012000003_security_audit_logs.sql is applied
  Then table public.security_audit_logs is created with columns:
    | Column      | Type        | Constraints                                               |
    | id          | UUID        | PRIMARY KEY DEFAULT gen_random_uuid()                     |
    | timestamp   | TIMESTAMPTZ | NOT NULL DEFAULT now()                                    |
    | user_id     | UUID        | REFERENCES auth.users(id) ON DELETE SET NULL              |
    | user_email  | TEXT        | NOT NULL                                                  |
    | action      | TEXT        | NOT NULL                                                  |
    | severity    | TEXT        | NOT NULL CHECK (severity IN ('info', 'warning', 'security_alert')) |
    | terminal_ip | TEXT        | NULL                                                      |
    | metadata    | JSONB       | NOT NULL DEFAULT '{}'::jsonb                              |
    | created_at  | TIMESTAMPTZ | NOT NULL DEFAULT now()                                    |
  And B-tree indexes exist on (created_at DESC), user_id, and severity
  And re-running the migration succeeds idempotently without error
```

---

### User Story 2 - Absolute Append-Only RLS Guarantee & Tamper-Proof Trigger (Priority: P1)

As a Compliance Officer and Security Auditor,  
I want the database to enforce an absolute append-only policy on `public.security_audit_logs` where `UPDATE`, `DELETE`, and `TRUNCATE` operations are unconditionally blocked,  
so that no user—regardless of role, elevation status, or database privileges—can alter or expunge audit trail records.

**Why this priority**: Audit logs are completely useless for forensic compliance if an attacker or rogue administrator can delete or modify records of their suspicious actions.

**Independent Test**: Attempt an `UPDATE` or `DELETE` query against `public.security_audit_logs` using both standard authenticated roles and service roles; verify that the database raises an exception and rejects the query.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Denying update operations on audit log records
  Given an existing record in public.security_audit_logs
  When any authenticated user or administrator executes an UPDATE query on that record
  Then the database aborts the transaction with an immutability exception
  And the existing audit record remains completely unchanged

Scenario: Denying delete and truncate operations on audit log records
  Given existing records in public.security_audit_logs
  When any user attempts a DELETE or TRUNCATE command on the table
  Then the database rejects the command and aborts execution
  And all audit log records remain intact in the table
```

---

### User Story 3 - Atomic Stored Procedure RPC (`public.log_security_event`) (Priority: P1)

As an authenticated staff member or administrator performing a sensitive action (e.g. failed elevation, markup rule change, cash drawer opening),  
I want the system to log the event via a secure stored procedure `public.log_security_event`,  
so that the server extracts `auth.uid()` and caller email automatically, preventing client-side forgery of user credentials or audit spoofing.

**Why this priority**: If clients were allowed to pass arbitrary `user_id` or `user_email` values directly in an `INSERT`, malicious actors could spoof actions onto other employees.

**Independent Test**: Invoke `public.log_security_event(p_action, p_severity, p_terminal_ip, p_metadata)` through Supabase RPC; verify that `user_id` matches `auth.uid()`, `user_email` is extracted from the authenticated user token, and the new row is committed with valid UUID.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Logging a valid security event via stored procedure
  Given an authenticated user with active session
  When calling RPC public.log_security_event with parameters:
    | Parameter     | Value                                                   |
    | p_action      | "Modified Global Retail Markup rule from 30% to 35%"     |
    | p_severity    | "warning"                                               |
    | p_terminal_ip | "192.168.1.100 (Admin PC)"                              |
    | p_metadata    | {"previous_markup": 30, "new_markup": 35}               |
  Then a new record is inserted into public.security_audit_logs
  And user_id matches auth.uid()
  And user_email matches the authenticated user's registered email
  And the generated UUID id is returned to the caller

Scenario: Rejecting invalid severity levels
  Given an authenticated user session
  When calling RPC public.log_security_event with invalid severity "critical"
  Then the procedure raises an exception validating severity must be 'info', 'warning', or 'security_alert'
  And no record is created in the audit table
```

---

### User Story 4 - Filtered Query, Pagination & CSV Export Server Actions (Priority: P2)

As a Store Owner or Auditor reviewing the System Activity & Security Logs,  
I want Server Actions in `lib/admin/audit-actions.ts` to query, filter by severity and date range, paginate, and export records to RFC 4180-compliant CSV,  
so that I can quickly inspect anomalies, review terminal security activities, and download compliance reports.

**Why this priority**: Store owners must be able to filter through thousands of audit events and generate offline compliance spreadsheets without manual SQL queries.

**Independent Test**: Call `getSecurityAuditLogsAction` with severity filter `'security_alert'` and verify returned records; invoke `exportSecurityAuditLogsAction` and verify valid CSV headers and escaped string cells.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Querying audit logs with severity filtering
  Given 20 audit log records spanning 'info', 'warning', and 'security_alert'
  When an admin requests audit logs with filter severity = 'security_alert'
  Then getSecurityAuditLogsAction returns only records with severity = 'security_alert'
  And the records are sorted in descending timestamp order (newest first)

Scenario: Exporting audit logs to CSV
  Given recorded audit log entries
  When exportSecurityAuditLogsAction is executed
  Then it returns a CSV string containing headers:
    "ID,Timestamp,User Email,Action,Severity,Terminal IP,Metadata"
  And special characters, commas, and quotes in action and metadata are properly escaped
```

---

### User Story 5 - System Activity & Security Logs UI Wiring in Admin Portal (Priority: P2)

As an Administrator browsing to `/admin/logs`,  
I want the UI table container (`#auditLogsBody`) to render live audit logs with semantic severity badges, monospaced IP indicators, real-time date formatting, and filter/export controls,  
so that the experience faithfully mirrors `mockup/admin.html` while strictly adhering to SWIFT design tokens (`lib/tokens.ts`).

**Why this priority**: Fulfills the user-facing administrative monitoring requirement and links the backend schema directly to the admin workflow.

**Independent Test**: Load `/admin/logs` in browser; verify that `#auditLogsBody` displays records with correct semantic colors (`badge-info`, `badge-warning`, `badge-danger`), terminal IP in monospaced font, and that the export button initiates CSV download.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Rendering audit logs in Admin Portal
  Given audit log records exist in the database or memory fallback
  When the administrator visits /admin/logs
  Then the System Activity & Security Logs panel renders with table body #auditLogsBody
  And each row displays Timestamp, User Email/Name, Action Taken, and Terminal IP
  And severity levels display with token-based status badges (info, warning, security_alert)
  And all colors strictly use SWIFT design tokens with zero hardcoded hex/rgb values
```

---

## Edge Cases

- **Anonymous or Service Invocation**: When `log_security_event` is called without an active `auth.uid()`, the function falls back to system or provided service email or raises an unauthorized error depending on execution context.
- **Large JSONB Payloads**: `metadata` objects exceeding 32KB are gracefully truncated or rejected to prevent denial-of-service in database storage.
- **Malformed CSV Characters**: User emails or action descriptions containing commas, line breaks, or double quotes are escaped according to RFC 4180 standard.
- **Network / Offline Fallback**: If Supabase is unreachable, `getSecurityAuditLogsAction` and `logSecurityEventAction` gracefully fall back to in-memory audit logs derived from `mock-data/` to keep UI resilient.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST create table `public.security_audit_logs` via migration `20261012000003_security_audit_logs.sql`.
- **FR-002**: System MUST enforce an append-only guarantee via PostgreSQL table grants and an immutable trigger blocking all `UPDATE`, `DELETE`, and `TRUNCATE` operations.
- **FR-003**: System MUST provide a secure stored procedure `public.log_security_event` running as `SECURITY DEFINER` that automatically associates `auth.uid()` and caller email.
- **FR-004**: System MUST index `(created_at DESC)`, `user_id`, and `severity` for sub-50ms query latency across large audit datasets.
- **FR-005**: System MUST implement Server Actions in `lib/admin/audit-actions.ts`: `getSecurityAuditLogsAction`, `logSecurityEventAction`, and `exportSecurityAuditLogsAction`.
- **FR-006**: System MUST wire `/admin/logs` (`app/admin/logs/page.tsx`) to render `#auditLogsBody` with severity badges, monospaced IP badges, search/filter inputs, and CSV export.
- **FR-007**: All UI styling MUST strictly use SWIFT design tokens (`app/globals.css`, `lib/tokens.ts`) with zero arbitrary hex/rgb values or unmapped Tailwind classes.

### Key Entities

- **SecurityAuditLog**:
  - `id`: UUID (Primary key)
  - `timestamp`: ISO timestamp string with timezone
  - `userId`: UUID string referencing auth user
  - `userEmail`: String representation of user account
  - `action`: Human-readable description of action performed
  - `severity`: Enum (`info` | `warning` | `security_alert`)
  - `terminalIp`: IP address or station tag (e.g., `192.168.1.100 (Admin PC)`)
  - `metadata`: Arbitrary JSON key-value pairs providing event context
  - `createdAt`: ISO timestamp string

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of attempts to modify or delete existing audit rows fail with database-level error.
- **SC-002**: Audit log queries over 10,000 records complete in under 50ms utilizing the descending timestamp index.
- **SC-003**: 100% of audit event records captured via `log_security_event` reflect verified caller identities without client-side spoofing.
- **SC-004**: CSV export generates valid RFC 4180 format download within 500ms for up to 1,000 rows.
- **SC-005**: Zero hardcoded hex/rgb color violations in all UI components on `/admin/logs`.

---

## Assumptions

- PostgreSQL database is managed via Supabase with `pg_crypto` or `gen_random_uuid()` available.
- `auth.users` table exists in Supabase.
- When Supabase credentials are absent (e.g. during offline unit tests), Server Actions fall back to an in-memory audit store initialized with baseline records from `mock-data/`.
