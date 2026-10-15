# Quickstart & Verification Guide: System Security Activity Logging & Terminal Session Audit

**Feature**: `specs/042-system-security-activity-logging-terminal-session-audit`  
**Jira Ticket**: [SIAA-42](https://the-three-devsketeers.atlassian.net/browse/SIAA-42)  

---

## 1. Automated Test Execution

Run the complete test suite for security audit logging and sensitive operations:

```bash
# Execute unit tests for audit server actions and export formatting
npx vitest run lib/admin/__tests__/audit-actions.test.ts

# Execute unit tests for shop floor elevation security logging
npx vitest run lib/staff/__tests__/admin-elevation-modal.test.ts

# Execute typecheck
npm run typecheck

# Execute linter
npm run lint
```

---

## 2. Interactive Verification Scenarios

### Scenario 1: Table Rendering & Monospaced Typography
1. Open the Admin Portal and navigate to `/admin/logs` (Settings & Audit Logs).
2. Inspect the **System Activity & Security Logs** panel:
   - Verify container `#view-settings` is active.
   - Verify table body has element ID `#auditLogsBody`.
   - Verify timestamp column renders in clean monospaced font (`font-mono`).
   - Verify user account column displays in bold (`font-semibold text-text-primary`).
   - Verify originating terminal IP column displays in monospaced font (`font-mono text-text-muted`).

### Scenario 2: Failed Master Admin Elevation Threat Warning
1. Navigate to Staff Terminal (`/staff/pos` or `/staff/clock`).
2. Open the **Admin Switch / Elevation Modal** (`#btn-switch-admin`).
3. Enter an incorrect PIN or password (e.g. `9999`) and submit.
4. Verify the elevation error message appears on screen.
5. Switch to Admin Portal `/admin/logs`:
   - Verify a new record exists: `Failed Master Admin elevation attempt (Invalid Password/PIN)`.
   - Verify severity badge is highlighted in high-visibility danger styling (`Security Alert` in red pill).
   - Verify terminal tag displays `Terminal #01 (Shop Floor)` or originating IP.

### Scenario 3: Cashier Discount Override Event Capture
1. In the Staff POS terminal (`/staff/pos`), add parts to the cart.
2. Apply a 20% Senior Citizen / PWD discount or custom discount override.
3. Complete tender checkout.
4. Open `/admin/logs`:
   - Verify a new audit log record appears: `Applied 20% Senior Citizen Discount on TX-XXXX`.
   - Verify metadata includes invoice number, discount rate, and total amount.

### Scenario 4: Exporting Compliance Audit Trails (CSV & JSON)
1. On `/admin/logs` in the System Activity & Security Logs toolbar:
2. Click **Export CSV**:
   - Verify a `.csv` file downloads with headers: `ID,Timestamp,User Email,Action,Severity,Terminal IP,Metadata`.
   - Verify comma-separated and quoted fields adhere to RFC 4180.
3. Click **Export JSON**:
   - Verify a `.json` file downloads with a valid JSON array of security audit log objects.
