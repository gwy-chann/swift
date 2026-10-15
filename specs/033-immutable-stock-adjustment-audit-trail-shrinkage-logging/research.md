# Technical Research & Architecture Decisions: Immutable Stock Adjustment Audit Trail & Shrinkage Logging

**Feature**: `033-immutable-stock-adjustment-audit-trail-shrinkage-logging`  
**Jira Issue**: [SIAA-41](https://the-three-devsketeers.atlassian.net/browse/SIAA-41) (STORY-7.4)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  

---

## 1. Architecture Overview & Context

This feature implements the full reactive client-facing experience for the **Immutable Stock Adjustment Audit Trail & Shrinkage Logging** module.

In the SWIFT ecosystem:
- **Database Layer (`SIAA-46`)**: Established `public.stock_adjustment_logs` and atomic stored procedure `adjust_product_stock(sku, delta, type, reason, user_id, user_name)`.
- **Query & Analytics Server Action Layer (`SIAA-65`)**: Established `getStockAdjustmentLogsAction` and `exportStockAdjustmentLogsAction` in `lib/admin/stock-audit-actions.ts`.
- **Client Reactive Store (`SIAA-12`, `SIAA-15`, `SIAA-41`)**: `inventoryStore` (`lib/store/inventory-store.ts`) manages in-memory stock and `adjustmentLogs` using React 19's `useSyncExternalStore` observable pattern.

### Key Problem Addressed
When an inventory clerk marks items as "Damaged Goods" or restocks inventory in `/admin/inventory` (or via POS sale decrements), the audit table rendered at `/admin/logs` (`#view-settings`) must instantaneously reflect the newly executed adjustment at index 0 of `#stockAdjLogsBody` without requiring manual page refresh or losing active filters.

---

## 2. Technical Decisions & Tradeoffs

### Decision 1: Reactive Store Synchronization with Server Action Hydration
- **Approach**: `StockAuditPanel` accepts server-fetched `initialLogs` and `initialMetrics` for fast, SEO-friendly SSR rendering.
- **Client Synchronization**: On mount, `StockAuditPanel` subscribes to `inventoryStore` (`useSyncExternalStore` or store listener). When `inventoryStore.adjustStock` is executed, the new `StockAdjustmentLog` is mapped to `StockAdjustmentLogEntry` and prepended to the local logs list.
- **Fallback / Offline Support**: If the database is unreachable, `inventoryStore` maintains the state in-memory, ensuring seamless demo execution.

### Decision 2: 6-Column Layout Conforming to Mockup & Jira Spec
- **Mockup Reference**: `mockup/admin.html:580-595` and `mockup/app.js:428-444`.
- **Standard Columns**:
  1. `Timestamp` (`font-mono text-xs text-text-secondary`)
  2. `SKU` (`font-mono font-bold text-text-primary`)
  3. `Type` (`badge` pill with contextual styling)
  4. `Change` (`+Units` in text-success, `-Units` in text-danger)
  5. `Reason / Reference` (detailed note, truncated with title tooltip)
  6. `Authorized By` (staff name with shield icon)
- **Tradeoff**: Previous Stock and New Stock columns are available in CSV export and server queries, but omitted or made optional in the primary UI ledger to strictly conform to the 6-column specification in `mockup/admin.html` and SIAA-41 Scenario 1.

### Decision 3: Immutability Enforcement
- **Presentation Layer**: No `button`, `input` (inline edit), `trash` icon, or mutation actions are rendered in `StockAuditTable`.
- **API Boundary**: No update or delete endpoints exist for `stock_adjustment_logs`.
- **Database Boundary**: PostgreSQL trigger `prevent_stock_adjustment_log_tampering` raises `TAMPER_FORBIDDEN` exception upon any `UPDATE` or `DELETE` attempt.

### Decision 4: SWIFT Semantic Design Tokens & Tailwind CSS v4
- Adheres strictly to `lib/tokens.ts` and `app/globals.css`.
- Classes used:
  - Backgrounds: `bg-bg-card`, `bg-bg-surface`, `bg-bg-muted`, `bg-bg-input`, `bg-bg-hover`
  - Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-success`, `text-danger`, `text-accent`, `text-primary`
  - Badges: `bg-success-light`, `bg-danger-light`, `bg-accent-light`, `bg-info-light`, `bg-primary-light`
  - Borders: `border-border`, `border-border-focus`, `border-primary-border`
- Zero hardcoded colors.

---

## 3. Component Hierarchy

```
app/admin/logs/page.tsx (#view-settings)
└── StockAuditPanel
    ├── StockAuditSummaryKpis
    │   ├── Total Logs KPI Card
    │   ├── Net Unit Delta KPI Card
    │   └── Total Shrinkage Units KPI Card
    ├── Search & Filter Toolbar
    │   ├── Input #stockAuditFilterSku
    │   ├── Select #stockAuditFilterType
    │   ├── Button #refreshBtn
    │   └── Button #exportStockAuditBtn
    └── StockAuditTable
        └── <tbody id="stockAdjLogsBody">
            ├── Dynamic Log Rows
            └── Empty State #stockAuditEmptyState
```
