# Feature Specification: System Security Activity Logging & Terminal Session Audit

**Feature Branch**: `feat/SIAA-42-system-security-activity-logging-terminal-session-audit`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-42](https://the-three-devsketeers.atlassian.net/browse/SIAA-42) (STORY-7.5)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  
**Target Views**: Admin Portal Settings & Audit Logs (`/admin/logs`, `#view-settings`), Staff Terminal Elevation Modal, POS Checkout, Pricing Management  

---

## 1. Executive Summary & Objective

In high-throughput motorcycle parts retail and multi-bay repair shop operations, administrative actions, cashier policy overrides, pricing modifications, and elevation requests represent sensitive security vectors. Unauthorized access attempts, cashier discount abuse, silent markup alterations, and untracked terminal sessions create severe operational vulnerabilities and accounting discrepancies.

While the underlying immutable database table and stored procedure were scaffolded in [SIAA-62](https://the-three-devsketeers.atlassian.net/browse/SIAA-62) (`public.security_audit_logs` and `log_security_event`), the system requires end-to-end integration across all sensitive operational touchpoints, complete forensic session tracing with terminal identifiers, high-visibility security threat alerts, and dual compliance export capabilities (CSV and JSON) in the administrative portal.

This feature delivers **System Security Activity Logging & Terminal Session Audit**:
1. **End-to-End Sensitive Operation Event Capture**: Automatically logs forensic records for cashier customer discount overrides (Senior Citizen / PWD 20% statutory discounts and custom overrides), administrator global markup adjustments, stock adjustment executions, and staff shift punch events with user identity, parameter deltas, and originating workstation tags.
2. **Terminal Elevation Threat Warnings**: Detects failed Master Admin PIN/credential elevation attempts on shop floor terminals, logs security alert entries tagged with workstation IP and terminal identifiers, and highlights them with high-visibility warning badges in the audit log viewer.
3. **Comprehensive Admin Audit Table (`#view-settings` & `#auditLogsBody`)**: Renders chronological audit records with monospaced timestamps, bold user accounts, detailed narrative action descriptions, semantic severity badges, and terminal IP/host origin tags adhering strictly to SWIFT design tokens (`lib/tokens.ts`).
4. **Dual Format Compliance Export**: Provides one-click export for both RFC 4180-compliant CSV and structured JSON files containing all timestamped security events for external audit and statutory compliance.

---

## 2. User Stories & Acceptance Criteria

### User Story
* **As a** Master Administrator or Store Owner,
* **I want to** monitor a comprehensive system security activity log documenting user logins, elevation attempts, pricing adjustments, discount overrides, and terminal IP origins,
* **so that** unauthorized access attempts, cashier policy infractions, and security events are traced with immutable forensic records.

### Acceptance Criteria (Gherkin Scenarios)

#### Scenario 1: System Activity & Security Logs Table Render
* **Given** an authenticated admin on the Settings & Audit Logs view (`#view-settings` / `/admin/logs`)
* **When** viewing the "System Activity & Security Logs" panel
* **Then** the log table body (`#auditLogsBody`) renders chronological events with columns:
  * **Timestamp**: formatted date and time in monospaced font
  * **User Account**: bold user email or employee name
  * **Severity**: token-styled status pill (`info`, `warning`, or `security_alert`)
  * **Action Taken**: detailed narrative description of the specific operational change or session event
  * **Terminal IP / Host**: originating workstation tag (e.g. `192.168.1.100 (Admin PC)`, `192.168.1.102 (Terminal 1)`).

#### Scenario 2: Sensitive Operation Event Capture
* **Given** a cashier completing a transaction with a 20% Senior Citizen / PWD discount or an administrator updating global retail markup rules
* **When** the operation completes
* **Then** an immutable audit event is automatically recorded via `logSecurityEventAction` and committed to `public.security_audit_logs` and in-memory fallback
* **And** the record includes the authorized user identifier, specific change parameters in metadata, severity classification, and originating workstation tag.

#### Scenario 3: Failed Elevation & Security Threat Warning
* **Given** an unauthorized operator or user entering incorrect master admin credentials on a shop floor terminal elevation prompt
* **When** credential validation fails
* **Then** a security alert entry ("Failed Master Admin elevation attempt") is generated with severity `security_alert` and tagged with the terminal identifier
* **And** displayed with high-visibility warning badge styling (`bg-danger-light text-danger border-danger/30`) in the administrative security log view.

#### Scenario 4: Exportable Compliance Audit Trail
* **Given** a store owner or auditor conducting a regulatory or compliance review
* **When** the user clicks "Export Security Log"
* **Then** the system offers downloadable export options for both RFC 4180-compliant CSV and structured JSON format
* **And** the generated export file includes complete timestamped forensic records, user accounts, actions, severity levels, workstation IPs, and parsed metadata.

---

## 3. Dependencies & Architectural Traceability

- **Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)
- **Prerequisites (Blocked by)**:
  - [SIAA-8](https://the-three-devsketeers.atlassian.net/browse/SIAA-8) (STORY-1.1: Role-Based Authentication Hub & Login Switcher)
  - [SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9) (STORY-1.2: Admin Portal Navigation Shell - `#view-settings` container)
  - [SIAA-32](https://the-three-devsketeers.atlassian.net/browse/SIAA-32) (STORY-5.5: Secure Master Admin Elevation Modal & Shop Floor Session Guard)
  - [SIAA-62](https://the-three-devsketeers.atlassian.net/browse/SIAA-62) (STORY-7.9: Supabase Forensic Security Audit Logs Schema, Immutable Ledger & RPC Logger)
- **Related To**:
  - [SIAA-20](https://the-three-devsketeers.atlassian.net/browse/SIAA-20) (Customer Discount Matrix Engine)
  - [SIAA-29](https://the-three-devsketeers.atlassian.net/browse/SIAA-29) (Terminal Digital Shift Punch Clock)
  - [SIAA-65](https://the-three-devsketeers.atlassian.net/browse/SIAA-65) (Stock Adjustment Audit Trail Ledger & Shrinkage Analytics)

---

## 4. Requirements & Specifications

### Functional Requirements

- **FR-001 (Audit Event Logger Server Action)**: Provide `logSecurityEventAction` in `lib/admin/audit-actions.ts` accepting `action`, `severity`, `terminalIp`, `userEmail`, and structured `metadata`.
- **FR-002 (Terminal Elevation Event Interception)**: In `verifyAdminElevationAction` (`lib/staff/actions.ts`):
  - On failed credential verification: invoke `logSecurityEventAction` with severity `security_alert`, descriptive text "Failed Master Admin elevation attempt (Invalid Password/PIN)", and terminal workstation ID.
  - On successful elevation: invoke `logSecurityEventAction` with severity `warning`, descriptive text "Master Admin elevation granted for 1-hour administrative session", and terminal workstation ID.
- **FR-003 (POS Discount Override Event Interception)**: In `processCheckoutAction` (`lib/pos/actions.ts`):
  - When a transaction has a non-zero discount (`discountRate > 0` or statutory discount like Senior Citizen / PWD 20%), invoke `logSecurityEventAction` recording invoice number, discount type, percentage, cashier name, and terminal tag.
- **FR-004 (Pricing & Markup Rule Update Event Interception)**: In `updatePricingRulesAction` (`lib/admin/pricing-actions.ts`):
  - Invoke `logSecurityEventAction` with severity `warning` detailing old and new markup percentages (Retail, Wholesale, Aftermarket, Labor) and administrator identity.
- **FR-005 (Stock Adjustment Event Interception)**: In `adjustProductStockAction` (`lib/admin/stock-audit-actions.ts`):
  - Automatically append an audit record summarizing adjustment ID, SKU, unit change, and operator.
- **FR-006 (Admin Logs Table View & DOM Specification)**: In `components/admin/logs/audit-logs-table.tsx` and `app/admin/logs/page.tsx`:
  - Enclose within `#view-settings` container.
  - Table body element MUST have `id="auditLogsBody"`.
  - Format columns: Timestamp (monospaced), User Account (font-semibold), Severity Badge, Action Taken, and Terminal IP (monospaced).
  - High-visibility badges for `security_alert` (`bg-danger-light text-danger border-danger/30`) and `warning` (`bg-accent-light text-accent border-accent/30`).
- **FR-007 (Dual Export Action)**: Provide `exportSecurityAuditLogsAction` supporting format parameter:
  - `format: 'csv'`: RFC 4180-compliant comma-separated values with escaped special characters.
  - `format: 'json'`: Formatted JSON array of audit log objects.
- **FR-008 (SWIFT Design Token Compliance)**: 100% of UI elements and badges MUST utilize semantic design tokens (`bg-bg-card`, `bg-bg-surface`, `bg-primary`, `text-text-primary`, `border-border`, etc.) with zero hardcoded hex/rgb values.

### Key Entities & Data Types

- **SecurityAuditLog**:
  - `id`: UUID string
  - `timestamp`: formatted local or ISO string (e.g. `2026-09-28 16:30`)
  - `userId`: optional UUID string
  - `userEmail`: string representation of employee account or terminal
  - `action`: human-readable narrative of action taken
  - `severity`: enum (`'info'` | `'warning'` | `'security_alert'`)
  - `terminalIp`: string with workstation tag (e.g. `192.168.1.102 (Terminal 1)`)
  - `metadata`: record of key-value parameters providing forensic context
  - `createdAt`: ISO 8601 UTC timestamp string

---

## 5. Success Criteria & Non-Functional Requirements

- **SC-001 (100% Forensic Capture)**: 100% of failed elevation attempts, statutory discount checkouts, and global markup adjustments generate an immutable audit log entry.
- **SC-002 (Sub-Second Query Latency)**: Audit table rendering and search filtering across 1,000+ records executes in under 200ms.
- **SC-003 (Export Compliance)**: Export generation for both CSV and JSON formats completes in under 500ms for up to 1,000 rows.
- **SC-004 (Zero Hardcoded Color Violations)**: Zero hardcoded hex/rgb colors; full compliance with SWIFT token system in light and dark mode.
- **SC-005 (WCAG 2.1 AA Accessibility)**: Visual contrast ratios on all severity badges meet or exceed 4.5:1; table elements include descriptive ARIA attributes and keyboard-accessible toolbar controls.

---

## 6. Assumptions & Edge Cases

- **Offline / Disconnected Resilience**: If the Supabase database connection is unavailable, `logSecurityEventAction` and `getSecurityAuditLogsAction` seamlessly fall back to the in-memory audit store without throwing uncaught exceptions to end users.
- **Special Characters in Export**: Quotes, commas, and newlines in action narratives and metadata are escaped following RFC 4180 rules to prevent CSV injection or malformed rows.
- **High Volume Logging**: Repetitive rapid elevation failures within a short interval (e.g. brute force attempts) are each logged independently with accurate timestamps for forensic tracing.
