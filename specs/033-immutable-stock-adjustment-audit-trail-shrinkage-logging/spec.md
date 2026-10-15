# Feature Specification: Immutable Stock Adjustment Audit Trail & Shrinkage Logging

**Feature Branch**: `feat/SIAA-41-immutable-stock-adjustment-audit-trail-shrinkage-logging`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-41](https://the-three-devsketeers.atlassian.net/browse/SIAA-41) (STORY-7.4)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  
**Target View**: Admin Portal Settings & Audit Logs (`/admin/logs` and container `#view-settings`)  

---

## 1. Executive Summary & Objective

In high-throughput motorcycle parts retail and repair workshop environments, inventory integrity directly governs shop profitability and regulatory accountability. Warehouse stock is continuously adjusted across varied operational workflows: physical stock count corrections, write-offs of damaged goods during shelving or handling, supplier replenishment deliveries, internal service bay usage, and fast-lane POS checkouts.

Without a tamper-proof, real-time audit ledger, store owners and inventory compliance auditors cannot reliably investigate shrinkage, identify loss patterns, or attribute discrepancies to specific staff members.

This feature delivers **Immutable Stock Adjustment Audit Trail & Shrinkage Logging (SIAA-41)**:
1. **Canonical Audit Ledger Presentation**: Implements the immutable stock adjustment ledger in the Admin Portal Settings & Audit Logs view (`#view-settings` / `/admin/logs`), strictly rendering table rows inside `#stockAdjLogsBody` matching `mockup/admin.html:580-595`.
2. **Standard 6-Column Layout**: Monospaced Timestamp, Monospaced Bold SKU, Categorized Adjustment Type Badge (`Restock Inbound`, `Damaged Goods`, `Audit Adjustment`, `Physical Count`), Color-coded Change Quantity (`+Units` in success green, `-Units` in danger red), Reason / Reference description, and Authorized Staff attribution.
3. **Reactive Real-time Append**: When an inventory clerk submits a stock adjustment (e.g. marking brake pads as damaged goods or restocking oil), the new adjustment record is immediately prepended to the reactive adjustment logs store, and the audit ledger dynamically re-renders with the new entry at the very top of the list without requiring a full page refresh.
4. **Dynamic Filter & Search with Delta Aggregation**: Allows auditors to instantaneously filter by SKU (e.g., `YAM-NMAX-BL01`), full-text search across reasons/users, and filter by adjustment type (e.g., `Damaged Goods`), with real-time recalculation of total matching records, net unit delta, and shrinkage totals.
5. **Absolute Immutability & Edit Protection Guard**: Zero inline edit, modification, archive, or delete controls exist in the UI or client actions. Records once logged cannot be retroactively altered.
6. **Strict SWIFT Design Tokens**: 100% adherence to established semantic color tokens (`bg-bg-card`, `bg-bg-surface`, `text-text-primary`, `text-text-secondary`, `text-success`, `text-danger`, `border-border`, etc.) with zero hardcoded hex or rgb styles.

---

## 2. User Stories & Acceptance Criteria

### User Story
* **As an** Inventory Auditor or Store Owner,
* **I want to** inspect an immutable, chronological audit trail of all warehouse stock quantity adjustments with reason tagging and authorized staff attribution,
* **so that** inventory shrinkage, damaged goods, and stock reconciliation discrepancies can be investigated with complete accountability.

### Acceptance Criteria (Gherkin Scenarios)

#### Scenario 1: Stock Adjustment Audit Trail Ledger Rendering
* **Given** an authorized user navigating to Settings & Audit Logs (`#view-settings` / `/admin/logs`)
* **When** viewing the "Stock Adjustment Audit Trail" panel
* **Then** the ledger renders records (`#stockAdjLogsBody`) with columns:
  - Timestamp (monospaced)
  - SKU (monospaced bold)
  - Adjustment Type badge (`Restock Inbound`, `Damaged Goods`, `Audit Adjustment`, etc.)
  - Change quantity (color-coded `+Units` in green / `-Units` in red)
  - Reason / Reference
  - Authorized By staff account.

#### Scenario 2: Real-time Append on Stock Adjustment Execution
* **Given** an inventory clerk performing a stock adjustment (e.g. marking 2 brake pads as "Damaged Goods")
* **When** the adjustment is submitted
* **Then** a new record is prepended to `stockAdjustmentLogs`
* **And** the audit table re-renders dynamically with the new entry at the top of the list.

#### Scenario 3: Filter & Search by SKU or Adjustment Type
* **Given** multiple historical adjustment entries
* **When** an auditor filters by SKU (e.g., `YAM-NMAX-BL01`) or type (e.g., `Damaged Goods`)
* **Then** only matching adjustment records are displayed with total unit delta aggregated.

#### Scenario 4: Immutability and Edit Protection Guard
* **Given** historical adjustment records in the audit trail
* **When** an administrative user inspects the ledger
* **Then** no inline edit or delete controls are exposed
* **And** records cannot be retroactively modified or deleted via UI controls.

---

## 3. Dependencies & Architectural Traceability

- **Prerequisites (Blocked by)**:
  - [SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9) (STORY-1.2: Admin Portal Navigation Shell - provides `#view-settings` container)
  - [SIAA-15](https://the-three-devsketeers.atlassian.net/browse/SIAA-15) (STORY-2.3: Interactive Stock Adjustment Engine with Reason-Based Audit Logging - generates adjustment records)
- **Blocks (Enables)**:
  - [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins - shrinkage accounting & COGS audit)
- **Related To**:
  - [SIAA-12](https://the-three-devsketeers.atlassian.net/browse/SIAA-12) (Domain Models & Mock Store - `stockAdjustmentLogs` array in `inventoryStore`)
  - [SIAA-17](https://the-three-devsketeers.atlassian.net/browse/SIAA-17) (Automated Low-Stock Threshold Detection & Floor Restock Alerts)
  - [SIAA-65](https://the-three-devsketeers.atlassian.net/browse/SIAA-65) (Supabase Stock Adjustment Audit Trail Ledger Query Engine & Shrinkage Analytics Action)

---

## 4. Requirements & Specifications

### Functional Requirements

- **FR-001 (Audit Trail Rendering)**: Render the Stock Adjustment Audit Trail panel inside `app/admin/logs/page.tsx` within `#view-settings`, featuring table container `#stockAdjLogsBody` matching `mockup/admin.html:580-595`.
- **FR-002 (Canonical Column Structure)**: The table body `#stockAdjLogsBody` MUST display 6 standard columns:
  1. Timestamp: Formatted local/UTC time in monospaced font (`font-mono text-xs text-text-secondary`)
  2. SKU: Monospaced bold part number (`font-mono font-bold text-text-primary`)
  3. Type: Adjustment badge (`badge badge-warning` for Damaged Goods, `badge badge-info` for Restock Inbound, `badge badge-neutral` for Physical Count/Audit)
  4. Change: High-contrast unit delta pill with explicit sign (`+Units` in `text-success` / `bg-success-light`, `-Units` in `text-danger` / `bg-danger-light`)
  5. Reason / Reference: Informative textual explanation of adjustment
  6. Authorized By: Staff name and attribution (`text-text-secondary text-xs` with badge/shield icon).
- **FR-003 (Real-time Reactive Append)**: The audit table MUST subscribe to the client reactive store (`inventoryStore` via `useSyncExternalStore` or store listener). When `inventoryStore.adjustStock` or `adjustProductStockAction` executes:
  - The newly created adjustment log entry is immediately prepended to the visible list.
  - The table dynamically re-renders with the new entry at index 0.
  - Summary KPI cards (Total Adjustments, Net Unit Delta, Total Shrinkage) update instantaneously (<16ms).
- **FR-004 (Multi-Criteria Filtering & Search)**:
  - Input `#stockAuditFilterSku`: Debounced SKU and description search.
  - Dropdown `#stockAuditFilterType`: Filters by adjustment type (`All`, `Restock Inbound`, `Damaged Goods`, `Physical Count`, `Supplier Return`, `Internal Use`, `POS Sale`).
  - Total unit delta is dynamically recalculated across matching entries and presented in summary badges.
- **FR-005 (Immutability & Edit Protection)**: The table rows, table header, and panel MUST NOT expose any edit, delete, modify, or archive buttons. Direct modification attempts fail.
- **FR-006 (CSV Audit Export)**: Button `#exportStockAuditBtn` allows compliance auditors to download an RFC 4180-compliant CSV snapshot of the currently filtered audit trail.

### Non-Functional Requirements

- **NFR-001 (Design Token Compliance)**: All styles MUST strictly consume SWIFT design tokens (`lib/tokens.ts`, `app/globals.css`). Zero hardcoded hex, RGB, or default Tailwind colors.
- **NFR-002 (Reactivity & Performance)**: Client re-renders upon stock adjustment execution MUST complete in < 16ms (60fps animation frame).
- **NFR-003 (Accessibility)**: Screen reader announcements, keyboard navigation, and full WCAG 2.1 AA contrast compliance across both Light and Dark themes.

---

## 5. UI Wiring & DOM Specifications

| DOM Element ID / Selector | Component | Target Role / Action |
| :--- | :--- | :--- |
| `#view-settings` | Container | Main settings and audit logs section container |
| `#stockAdjLogsBody` | `StockAuditTable` | Table body rendering dynamic immutable adjustment rows |
| `#stockAuditFilterSku` | `StockAuditPanel` | Input for filtering SKU or searching reasons |
| `#stockAuditFilterType` | `StockAuditPanel` | Dropdown for filtering adjustment type |
| `#exportStockAuditBtn` | `StockAuditPanel` | Button to export audit ledger as CSV |
| `#stockAuditEmptyState` | `StockAuditTable` | Displayed when filters produce 0 matching rows |
