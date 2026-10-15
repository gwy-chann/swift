# Technical Implementation Plan: Immutable Stock Adjustment Audit Trail & Shrinkage Logging

**Feature**: `033-immutable-stock-adjustment-audit-trail-shrinkage-logging`  
**Jira Issue**: [SIAA-41](https://the-three-devsketeers.atlassian.net/browse/SIAA-41) (STORY-7.4)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing)  
**Spec Reference**: [`specs/033-immutable-stock-adjustment-audit-trail-shrinkage-logging/spec.md`](spec.md)  

---

## 1. Technical Boundary & Architecture Mapping

```
app/admin/logs/page.tsx (#view-settings)
├── StockAuditPanel (components/admin/logs/stock-audit-panel.tsx)
│   ├── Reactive Subscription to inventoryStore (lib/store/inventory-store.ts)
│   ├── StockAuditSummaryKpis (components/admin/logs/stock-audit-summary-kpis.tsx)
│   └── StockAuditTable (components/admin/logs/stock-audit-table.tsx)
│       └── <tbody id="stockAdjLogsBody">
│           └── 6-column canonical rows (Timestamp, SKU, Type, Change, Reason, User)
```

---

## 2. Planned Changes & Refinements

### Component 1: `StockAuditPanel` (`components/admin/logs/stock-audit-panel.tsx`)
- Enhance with subscription to `inventoryStore.subscribe`.
- When a new `StockAdjustmentLog` is recorded in `inventoryStore` (via `adjustStock` in `/admin/inventory` or POS):
  - Convert to `StockAdjustmentLogEntry`.
  - Dynamically prepend to local `logs` state (unshift to index 0).
  - Recalculate summary metrics (`totalShrinkage`, `netDelta`, `totalCount`).
  - Ensure reactive update occurs in <16ms without requiring a full page refresh.

### Component 2: `StockAuditTable` (`components/admin/logs/stock-audit-table.tsx`)
- Standardize table columns strictly matching `mockup/admin.html:580-595` and SIAA-41 Scenario 1:
  1. `Timestamp` (`font-mono text-text-secondary text-xs`)
  2. `SKU` (`font-mono font-bold text-text-primary`)
  3. `Type` (`badge` with semantic styling: `Damaged Goods` in warning gold, `Restock Inbound` in info blue, `Physical Count` in primary/neutral)
  4. `Change` (high-contrast pills: `+Units` in text-success, `-Units` in text-danger)
  5. `Reason / Reference` (descriptive reason with full tooltip)
  6. `Authorized By` (staff attribution with shield icon)
- Ensure container has `id="stockAdjLogsBody"`.
- Ensure zero mutation controls (no edit, delete, or modify buttons).

### Component 3: Test Suite Expansion
- Add automated tests in `components/admin/logs/__tests__/stock-audit-reactive.test.tsx` verifying:
  - Scenario 1: 6-column table rendering with `#stockAdjLogsBody`.
  - Scenario 2: Real-time dynamic prepend when `inventoryStore.adjustStock` is executed.
  - Scenario 3: SKU and adjustment type filtering with delta aggregation.
  - Scenario 4: Immutability guard verifying absence of any edit or delete controls.

---

## 3. Constitutional Quality Gates

| Principle | Requirement | Implementation Strategy | Status |
| :--- | :--- | :--- | :--- |
| **I. Semantic Design Tokens** | Zero hardcoded hex/RGB colors; pure token utility classes. | Strictly use `bg-bg-card`, `bg-bg-surface`, `text-text-primary`, `text-success`, `text-danger`, `border-border`. | **COMPLIANT** |
| **II. Single Source of Truth** | Spec fidelity to `mockup/admin.html` and `mockup/app.js`. | Confirms 6-column table headers, `#stockAdjLogsBody`, and `#view-settings` container ID. | **COMPLIANT** |
| **III. Type Safety** | 100% strict TypeScript types and Zod schemas. | Derives types from `contracts/stock-audit.contract.ts` and `lib/types/stock-audit.ts`. | **COMPLIANT** |
| **IV. Test-First Verification** | Automated unit and component test suites. | Unit tests in `lib/admin/__tests__/` and component tests in `components/admin/logs/__tests__/`. | **COMPLIANT** |
| **V. Server-First & Accessibility** | WCAG 2.1 AA accessible HTML structure and SSR page shell. | Server Component `AdminLogsPage` fetches initial data; accessible client components handle filtering and live reactivity. | **COMPLIANT** |
