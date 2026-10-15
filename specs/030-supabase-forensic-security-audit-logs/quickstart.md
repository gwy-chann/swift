# Quickstart & Verification Guide: Supabase Forensic Security Audit Logs

**Feature**: Supabase Forensic Security Audit Logs Schema, Immutable Ledger & RPC Logger  
**Ticket**: [SIAA-62](https://the-three-devsketeers.atlassian.net/browse/SIAA-62)  

---

## 1. Migration Verification

To verify the migration in Supabase or local PostgreSQL:
```bash
# Verify SQL syntax & table definition
cat supabase/migrations/20261012000003_security_audit_logs.sql
```

Ensure the following constraints and triggers exist:
- Table: `public.security_audit_logs`
- Function: `public.prevent_security_audit_log_mutation()`
- Trigger: `trg_prevent_audit_log_mutation`
- Procedure: `public.log_security_event()`
- Indexes: `(created_at DESC)`, `(user_id)`, `(severity)`

---

## 2. Automated Test Verification

Run the test suite verifying Server Actions and CSV export:
```bash
npm test -- lib/admin/__tests__/audit-actions.test.ts
```

Run full project checks:
```bash
npx tsc --noEmit
npm run lint
```

---

## 3. UI Verification Walkthrough

1. Start development server: `npm run dev`
2. Open browser to `http://localhost:3000/admin/logs`
3. Verify:
   - Header shows "System Settings & Audit Logs" with ShieldCheck icon
   - "System Activity & Security Logs" panel renders with table body `#auditLogsBody`
   - Filter dropdown allows selecting "All Severities", "Info", "Warning", or "Security Alert"
   - Search input filters by action or user
   - Table rows display timestamp, user email/name, action taken, severity badge, and monospaced terminal IP
   - "Export CSV" button downloads `security-audit-logs-<date>.csv`
   - Zero hardcoded colors; all elements adapt seamlessly between light and dark mode.
