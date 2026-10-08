# Implementation Plan: Master Parts Catalog & Multi-Attribute Search Filtering

**Feature**: `Master Parts Catalog & Multi-Attribute Search Filtering`
**Ticket**: `SIAA-13`
**Epic**: `SIAA-2: Inventory & Warehouse Rack/Shelf Management`
**Date**: 2026-10-09

---

## 1. Technical Objectives

Implement a production-grade, responsive parts catalog table with sub-100ms multi-attribute search, category filtering, stock health badges, and inventory KPI cards for the Admin Portal at `/admin/inventory`.

Key architectural principles:
- **Design Tokens Strictness**: 100% adherence to SWIFT tokens (`lib/tokens.ts`, `app/globals.css`, zero hardcoded hex/RGB).
- **Client Reactivity**: Consume `useInventoryStore` from `@/lib/store/inventory-store.ts` for live updates.
- **TDD / Unit Testing**: Provide comprehensive test coverage for filtering predicates, stock classification, and statistics computation.
- **Atomic Commits**: Structured, single-purpose commits conforming to Conventional Commits.

---

## 2. Component Hierarchy & Module Layout

```text
swift/
├── lib/
│   └── inventory/
│       ├── catalog-filter.ts       # Pure filtering, stats aggregation, and helper predicates
│       └── __tests__/
│           └── catalog-filter.test.ts # Comprehensive unit tests
├── components/
│   └── admin/
│       └── inventory/
│           ├── inventory-catalog.tsx       # Main client container with store hook & state
│           ├── inventory-stats-cards.tsx   # Top KPI metrics (Total SKUs, Low Stock, Valuation, Categories)
│           ├── catalog-filter-bar.tsx      # Search input, Category select, Stock filter, Reset button
│           ├── catalog-table.tsx           # Responsive table with stock badges & "Adjust" trigger
│           └── catalog-empty-state.tsx     # Zero results empty state feedback
└── app/
    └── admin/
        └── inventory/
            └── page.tsx                    # Route entrypoint rendering InventoryCatalog
```

---

## 3. Test Plan (TDD First)

Before building the UI components, implement pure functions in `lib/inventory/catalog-filter.ts` and test them with Vitest:

1. **`filterCatalogProducts` Tests**:
   - Matches text across SKU, name, brand, model, and shelf location.
   - Case-insensitive search queries and whitespace trimming.
   - Category filtering (`'All'` vs. specific category).
   - Stock status filtering:
     - `'all'`: returns all products.
     - `'in_stock'`: only products with `stock > minThreshold`.
     - `'low_stock'`: only products with `0 < stock <= minThreshold`.
     - `'out_of_stock'`: only products with `stock === 0`.
   - Intersection of search query + category + stock filter.
   - Empty result handling.

2. **`calculateCatalogStats` Tests**:
   - Total SKUs count calculation.
   - Low stock count (`stock <= minThreshold && stock > 0`).
   - Out of stock count (`stock === 0`).
   - Total valuation calculation (`sum(retail * stock)`).
   - Unique active categories count.

3. **`getStockHealthStatus` Tests**:
   - Returns `'healthy'` when `stock > minThreshold`.
   - Returns `'low'` when `0 < stock <= minThreshold`.
   - Returns `'out_of_stock'` when `stock === 0`.

---

## 4. UI Component Architecture & Design Token Mapping

| Component | Design Tokens Used | Interactive Features |
| :--- | :--- | :--- |
| **`InventoryStatsCards`** | `bg-bg-card`, `border-border`, `text-text-primary`, `text-text-muted`, `text-danger`, `text-success` | Live counters reflecting catalog store data |
| **`CatalogFilterBar`** | `bg-bg-input`, `border-border`, `border-border-focus`, `text-text-primary`, `bg-bg-muted` | Real-time input with search icon, category dropdown, stock status dropdown, reset button |
| **`CatalogTable`** | `bg-bg-card`, `bg-bg-muted/60`, `border-border-subtle`, `hover:bg-bg-hover/50`, `bg-primary-light text-primary`, `bg-secondary-light text-secondary`, `bg-danger-light text-danger`, `bg-success-light text-success` | Responsive tabular display, formatted PHP currency, action buttons |
| **`CatalogEmptyState`** | `bg-bg-card`, `border-border-subtle`, `text-text-muted`, `bg-primary text-text-light` | Clear filters CTA button |

---

## 5. Verification & Quality Gates

1. Run unit test suite: `npm test`
2. Run TypeScript checks: `npm run typecheck`
3. Run ESLint checks: `npm run lint`
4. Verify responsive layout and theme switching (Light / Dark mode) with semantic tokens.
