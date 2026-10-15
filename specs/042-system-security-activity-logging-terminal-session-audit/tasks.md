# Implementation Tasks: System Security Activity Logging & Terminal Session Audit

**Feature**: `specs/042-system-security-activity-logging-terminal-session-audit`  
**Jira Ticket**: [SIAA-42](https://the-three-devsketeers.atlassian.net/browse/SIAA-42)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  

---

## Task List

### Phase 1: Contracts & Export Types
- [x] **TASK-1.1**: Update `lib/types/audit.ts` to add `ExportAuditLogsOptions` interface supporting `format?: 'csv' | 'json'`.
- [x] **TASK-1.2**: Update `lib/contracts/audit.ts` to add Zod schemas and validation helpers for `ExportAuditLogsOptionsSchema`.

### Phase 2: Sensitive Operation Security Event Interception
- [x] **TASK-2.1**: Enhance `lib/staff/actions.ts` (`verifyAdminElevationAction`):
  - Log `Failed Master Admin elevation attempt (Invalid Password/PIN)` with severity `security_alert`, terminal tag, and timestamp via `logSecurityEventAction`.
  - Log `Master Admin elevation granted for 1-hour administrative session` with severity `warning` on valid elevation via `logSecurityEventAction`.
- [x] **TASK-2.2**: Enhance `lib/pos/actions.ts` (`processCheckoutAction`):
  - When discount is applied (`discountRate > 0` or statutory Senior Citizen / PWD 20%), automatically invoke `logSecurityEventAction` with transaction number, discount rate, cashier name, and terminal IP tag.
- [x] **TASK-2.3**: Enhance `lib/admin/pricing-actions.ts` (`updatePricingRulesAction`):
  - Ensure `logSecurityEventAction` is called with severity `warning` documenting modified markup percentages and administrator identity.
- [x] **TASK-2.4**: Enhance `lib/admin/audit-actions.ts` (`exportSecurityAuditLogsAction`):
  - Add support for `format: 'json'` alongside `format: 'csv'`.

### Phase 3: Admin UI & Dual Compliance Export
- [x] **TASK-3.1**: Enhance `components/admin/logs/audit-logs-table.tsx`:
  - Add dual export controls for both "Export CSV" and "Export JSON".
  - Ensure table body element has `id="auditLogsBody"`.
  - Verify bold user account (`font-semibold text-text-primary`), monospaced timestamps and IPs (`font-mono text-[11px]`).
  - Render high-visibility warning and security alert badges with SWIFT design tokens (`bg-danger-light text-danger border-danger/30`, `bg-accent-light text-accent border-accent/30`).
- [x] **TASK-3.2**: Verify `app/admin/logs/page.tsx` `#view-settings` container and header integration.

### Phase 4: Automated Testing & Verification
- [x] **TASK-4.1**: Expand `lib/admin/__tests__/audit-actions.test.ts` to test JSON and CSV exports, format handling, filtering, and search.
- [x] **TASK-4.2**: Add / update test in `lib/staff/__tests__/admin-elevation-modal.test.ts` to verify failed elevation attempt writes a `security_alert` log record.
- [x] **TASK-4.3**: Add test in `lib/pos/__tests__/discount-logging.test.ts` to verify discount checkout writes an `info` audit record.
- [x] **TASK-4.4**: Execute static analysis, typechecking, and linting (`npm run typecheck`, `npm run lint`, `npx vitest run`).
