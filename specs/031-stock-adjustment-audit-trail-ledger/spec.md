# Feature Specification: Stock Adjustment Audit Trail Ledger Query Engine & Shrinkage Analytics Action

**Feature Branch**: `feat/SIAA-65-supabase-stock-adjustment-audit-trail-ledger`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-65](https://the-three-devsketeers.atlassian.net/browse/SIAA-65) (STORY-7.10)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  
**Target View**: Admin Portal Settings & Audit Logs (`/admin/logs` and `#view-settings`)

---

## 1. Executive Summary & Objective

In high-throughput motorcycle parts retail and repair workshop environments, inventory integrity directly governs shop profitability and regulatory compliance. Physical parts and consumables are routinely adjusted across multiple operational contexts: physical shelf counts, damaged goods write-offs, supplier returns, internal shop usage, warranty replacements, and point-of-sale inventory decrements.

While the underlying immutable database ledger and atomic stored procedure were established in [SIAA-46](https://the-three-devsketeers.atlassian.net/browse/SIAA-46) (`public.stock_adjustment_logs` and `adjust_product_stock`), store owners and inventory compliance auditors lack a dedicated, high-performance query engine and administrative interface to interrogate the ledger, isolate shrinkage anomalies, aggregate unit adjustments across SKUs and categories, and export audit trails for statutory accounting compliance.

This feature delivers the **Supabase Stock Adjustment Audit Trail Ledger Query Engine & Shrinkage Analytics Action**:
1. **Server Actions Query Engine**: Provides `getStockAdjustmentLogsAction` in `lib/admin/stock-audit-actions.ts` with comprehensive multi-criteria filtering (by SKU, adjustment type, date range, authorized operator), deterministic sorting (`created_at DESC`), and instant server-side aggregation of net unit deltas and shrinkage totals.
2. **Immutable Read-Only Protection**: Strictly enforces zero write/update/delete capabilities at both the database level (PostgreSQL trigger `prevent_stock_adjustment_log_tampering` & RLS) and the presentation layer (zero inline edit or mutation controls).
3. **Compliance CSV Audit Export**: Provides `exportStockAdjustmentLogsAction` to stream RFC 4180-compliant CSV exports with standardized column headers (Timestamp, SKU, Product Name, Adjustment Type, Delta, Previous Stock, New Stock, Reason / Reference, and Authorized Operator).
4. **Admin Audit Portal Integration**: Renders the complete, responsive Stock Adjustment Audit Trail panel in `app/admin/logs/page.tsx` adhering to the canonical mockup design (`#stockAdjLogsBody` in `mockup/admin.html`), featuring high-contrast color-coded delta pills (`+Units` in success green, `-Units` in danger red, zero delta in neutral text).

---

## 2. User Stories & Acceptance Criteria

### User Story
* **As an** Inventory Auditor or Store Owner,
* **I want** a dedicated Server Action and query engine over stock adjustment logs with unit delta aggregation and shrinkage reporting,
* **so that** warehouse stock discrepancies and damaged goods can be investigated with rapid filtering and CSV compliance exports.

### Acceptance Criteria (Gherkin Scenarios)

#### Scenario 1: Stock Adjustment Log Querying & Filtering
* **Given** existing audit records in `public.stock_adjustment_logs`
* **When** an administrator or auditor requests logs with filters (e.g., `sku = 'YAM-NMAX-BL01'`, `type = 'Damaged Goods'`) via `getStockAdjustmentLogsAction`
* **Then** the server action returns matching records sorted by `created_at DESC`
* **And** computes aggregated metrics including total records matched, net unit delta sum, negative delta (shrinkage/loss) sum, and positive delta (intake/count) sum.

#### Scenario 2: Immutability & Read-Only Protection
* **Given** an administrative user inspecting the Stock Adjustment Audit Trail in `/admin/logs`
* **When** the UI renders the adjustment log records
* **Then** records are purely read-only with no inline edit, modification, or deletion controls exposed
* **And** any attempted direct mutation API calls or SQL updates fail at the database boundary with an immutability violation error (`TAMPER_FORBIDDEN`).

#### Scenario 3: Audit Trail CSV Export
* **Given** multiple stock adjustment records matching the active query criteria
* **When** the auditor clicks the "Export Stock Audit Trail" button (`#exportStockAuditBtn`)
* **Then** `exportStockAdjustmentLogsAction` generates a formatted, RFC 4180-compliant CSV payload
* **And** the download contains Timestamp (ISO 8601 UTC / formatted local), SKU, Adjustment Type, Delta, Previous Stock, New Stock, Reason / Reference, and Authorized User.

#### Scenario 4: Shrinkage Analytics & Aggregation Summary
* **Given** stock adjustments with both positive adjustments (`Physical Count`, `Supplier Return`) and negative adjustments (`Damaged Goods`, `Internal Use`, `Theft / Discrepancy`)
* **When** the query engine processes logs for an SKU, category, or time window
* **Then** it aggregates total negative units as `totalShrinkage` and net units as `netUnitDelta`
* **And** the UI displays summary metric cards with badges highlighting shrinkage volume.

---

## 3. Dependencies & Architectural Traceability

- **Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)
- **Prerequisites**:
  - [SIAA-46](https://the-three-devsketeers.atlassian.net/browse/SIAA-46) (STORY-2.7: Supabase Atomic Stock Adjustment RPC & Immutable Audit Ledger - `public.stock_adjustment_logs`)
  - [SIAA-12](https://the-three-devsketeers.atlassian.net/browse/SIAA-12) (Domain Models & Mock Engine)
- **Blocks / Enables**:
  - [SIAA-41](https://the-three-devsketeers.atlassian.net/browse/SIAA-41) (STORY-7.4: Immutable Stock Adjustment Audit Trail & Shrinkage Logging)
- **Related Stories**:
  - [SIAA-15](https://the-three-devsketeers.atlassian.net/browse/SIAA-15) (Interactive Stock Adjustment Engine with Reason-Based Audit Logging)
  - [SIAA-17](https://the-three-devsketeers.atlassian.net/browse/SIAA-17) (Automated Low-Stock Threshold Detection & Floor Restock Alerts)

---

## 4. Requirements & Specifications

### Functional Requirements

- **FR-001 (Server Action Query Engine)**: Implement `getStockAdjustmentLogsAction(filters?: StockAuditFilterOptions): Promise<StockAuditLogsResponse>` in `lib/admin/stock-audit-actions.ts`.
- **FR-002 (Filter Capabilities)**: The query engine MUST support filtering by:
  - `sku`: Partial match or exact SKU string
  - `adjustmentType`: Selection across standard types (`All`, `Physical Count`, `Damaged Goods`, `Internal Use`, `Supplier Return`, `POS Sale`, `New Product Initial Stock`, `Inventory Correction`)
  - `startDate` and `endDate`: ISO timestamp range filtering on `created_at`
  - `search`: Full text search across SKU, reason, and authorized user name
  - `limit` and `offset`: Pagination support defaulting to 50 records per page (up to 500 for export).
- **FR-003 (Deterministic Sorting)**: Query results MUST always be ordered by `created_at DESC` as the primary sort, and `id DESC` as the secondary tie-breaker.
- **FR-004 (Aggregated Analytics)**: Every query execution MUST compute summary metrics:
  - `totalCount`: Total number of matching log records
  - `netDelta`: Sum of `quantity_delta` across matching records
  - `totalShrinkage`: Absolute sum of all negative `quantity_delta` values
  - `totalIntake`: Sum of all positive `quantity_delta` values.
- **FR-005 (CSV Export Generator)**: Implement `exportStockAdjustmentLogsAction(filters?: StockAuditFilterOptions): Promise<StockAuditExportResult>` generating CSV text with MIME type `text/csv` and appropriate sanitized filename `stock-adjustment-audit-<timestamp>.csv`.
- **FR-006 (UI Panel & DOM IDs)**: Update `app/admin/logs/page.tsx` with:
  - Panel header: "Stock Adjustment Audit Trail" with badge "Immutable Records"
  - Summary KPI cards for Total Adjustments, Net Unit Delta, and Total Shrinkage Units
  - Search and filter bar (`#stockAuditFilterSku`, `#stockAuditFilterType`, `#exportStockAuditBtn`)
  - Table container with `id="stockAdjLogsBody"` for rows displaying:
    - Timestamp (mono, text-sm)
    - SKU (mono, bold)
    - Type badge (warning gold, neutral, or info)
    - Change pill (`+Units` in text-success, `-Units` in text-danger)
    - Reason / Reference
    - Authorized By (text-muted, text-sm)
  - Empty state when no logs match the specified criteria.
- **FR-007 (Read-Only Enforcement)**: The table and action bar MUST NOT contain any edit, update, archive, or delete buttons.
- **FR-008 (Offline / Fallback Resilience)**: If Supabase connection fails or runs in a mock/test environment, the Server Action MUST transparently fall back to mock adjustment logs (`MOCK_STOCK_ADJUSTMENT_LOGS`) while logging a diagnostic warning.

### Non-Functional Requirements

- **NFR-001 (Design Token Compliance)**: Strictly use semantic SWIFT tokens (`bg-bg-card`, `bg-bg-surface`, `text-text-primary`, `text-text-secondary`, `text-success`, `text-danger`, `bg-success-light`, `bg-danger-light`, `border-border`). Zero hardcoded hex/rgb colors.
- **NFR-002 (Performance & Latency)**: Query execution and table rendering for up to 500 records MUST execute in < 250ms.
- **NFR-003 (Accessibility - WCAG 2.1 AA)**: All interactive filter inputs, dropdowns, and export buttons must have clear labels (`aria-label`), keyboard focus outlines, and pass contrast tests in both Light and Dark mode.
- **NFR-004 (Type Safety)**: 100% strict TypeScript types and Zod schemas for filter inputs, log items, response payloads, and CSV exports.

---

## 5. UI Wiring & DOM Specifications

| Element ID / Selector | Component | Purpose |
| :--- | :--- | :--- |
| `#stockAdjLogsBody` | `StockAuditTableBody` | Table body rendering audit rows matching `mockup/admin.html:590` |
| `#stockAuditFilterSku` | `Input` | Text input for searching SKU or description |
| `#stockAuditFilterType` | `Select` | Dropdown filter for adjustment type |
| `#exportStockAuditBtn` | `Button` | Trigger button to initiate CSV export download |
| `#stockAuditSummaryKpi` | `MetricCards` | KPI cards for Total Logs, Net Delta, and Shrinkage Loss |
| `#stockAuditEmptyState` | `EmptyNotice` | Displayed when query filters produce 0 matching records |
