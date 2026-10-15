# Technical Research & Architecture Decisions: System Security Activity Logging & Terminal Session Audit

**Feature**: `specs/042-system-security-activity-logging-terminal-session-audit`  
**Jira Ticket**: [SIAA-42](https://the-three-devsketeers.atlassian.net/browse/SIAA-42)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7)  

---

## 1. Technical Stack & Governance Constraints

### 1.1 Architectural Framework
- **Next.js 15 (App Router)**: Utilizing React 19 Server Components for `/admin/logs` with streaming data fetching and Client Components for interactive search, severity filtering, and export actions.
- **Supabase PostgreSQL & RPC**: Stored procedure `public.log_security_event` running as `SECURITY DEFINER` with automated `auth.uid()` binding and append-only tamper prevention triggers.
- **Tailwind CSS v4 & SWIFT Tokens**: Strict utilization of CSS variables in `app/globals.css` and token map in `lib/tokens.ts`. Prohibits arbitrary hex/rgb codes and legacy non-semantic utility classes.

---

## 2. Security Logging Matrix & Threat Modeling

| Triggering Domain Event | Location | Severity | Action Description Format | Key Metadata Captured | Workstation Tag |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Failed Elevation Attempt** | `lib/staff/actions.ts` (`verifyAdminElevationAction`) | `security_alert` | `Failed Master Admin elevation attempt (Invalid Password/PIN)` | `{ attemptTime, reason: 'INVALID_CREDENTIALS', terminalId }` | `Terminal #01 (Shop Floor)` |
| **Elevation Granted** | `lib/staff/actions.ts` (`verifyAdminElevationAction`) | `warning` | `Master Admin elevation granted for 1-hour administrative session` | `{ elevatedUntil, sessionDurationSeconds: 3600 }` | `Terminal #01 (Shop Floor)` |
| **Discount Override Applied** | `lib/pos/actions.ts` (`processCheckoutAction`) | `info` | `Applied 20% Senior Citizen Discount on TX-1041` / `Applied Discount Override (15%)` | `{ receiptNumber, discountType, discountRate, discountAmount, cashierId, subtotal, totalDue }` | `192.168.1.102 (Terminal 1)` |
| **Global Pricing / Markup Modified** | `lib/admin/pricing-actions.ts` (`updatePricingRulesAction`) | `warning` | `Modified Global Pricing Markup rules: Retail from 30% to 35%` | `{ oldRetailMarkup, newRetailMarkup, oldWholesaleMarkup, newWholesaleMarkup, reason }` | `192.168.1.100 (Admin Portal)` |
| **Stock Adjustment Executed** | `lib/admin/stock-audit-actions.ts` (`adjustProductStockAction`) | `info` | `Executed Stock Adjustment ADJ-8821 on SKU YAM-NMAX-BL01` | `{ adjustmentId, sku, change, previousStock, newStock, reason }` | `192.168.1.100 (Admin PC)` |
| **Employee Provisioned / Role Changed** | `lib/admin/user-actions.ts` (`provisionStaffUserAction`, `updateStaffUserAction`) | `info` / `warning` | `Created employee account for user@swift.ph (Cashier)` / `Modified user role for user@swift.ph` | `{ targetEmail, role, previousRole, status }` | `192.168.1.100 (Admin PC)` |

---

## 3. Key Architecture Decisions & Trade-Offs

### Decision 1: Server Actions vs. Direct Client Supabase Calls
- **Context**: Security audit events need to be created from both client modals (e.g. staff terminal elevation prompt) and backend operations (e.g. checkout, pricing changes).
- **Decision**: All security event logging flows through `logSecurityEventAction` ('use server').
- **Rationale**: Keeps database connection credentials secure, allows extracting server headers or caller auth tokens safely, and enables seamless memory fallback when working in offline / local development environments.

### Decision 2: Dual Format Export (CSV + JSON)
- **Context**: External compliance auditors frequently require CSV for spreadsheet import (Excel, Google Sheets), whereas IT forensics and security operations require JSON for log ingestion pipelines (Splunk, Datadog, Elastic).
- **Decision**: Extend `exportSecurityAuditLogsAction` to support a `format` parameter (`'csv' | 'json'`).
- **Rationale**:
  - `csv`: Uses RFC 4180 escaping (double-quoting values containing commas, double quotes, and line breaks).
  - `json`: Pretty-printed 2-space indented array of log records with nested metadata.
- **Client Handling**: Client dynamically generates browser download with appropriate MIME type (`text/csv` vs `application/json`) and clean ISO-stamped filenames (`swift-security-audit-logs-YYYY-MM-DD.csv` / `.json`).

### Decision 3: Resilient Memory Store Synchronization
- **Context**: Unit tests and local development often run without a live Supabase PostgreSQL connection.
- **Decision**: Maintain `memoryAuditLogs` initialized with baseline seed records from `lib/mock-data/logs.ts`.
- **Rationale**: Tests can assert logging side-effects synchronously without mocking network sockets, and user workflows never fail or freeze if a remote DB connection drops.

---

## 4. Design Token Integration & Accessibility (WCAG 2.1 AA)

- **Severity Badge Tokens**:
  - `security_alert`: `bg-danger-light text-danger border border-danger/30` with `ShieldAlert` icon.
  - `warning`: `bg-accent-light text-accent border border-accent/30` with `AlertTriangle` icon.
  - `info`: `bg-info-light text-info border border-info/30` with `Info` icon.
- **Table Structure**:
  - Container: `bg-bg-card border border-border rounded-xl shadow-xs`
  - Header: `bg-bg-muted/50 text-text-secondary uppercase text-[11px] font-semibold tracking-wider`
  - Body rows: `hover:bg-bg-hover/60 transition-colors border-b border-border text-xs`
  - Monospaced elements: `font-mono text-[11px]` for timestamps and IP addresses.
