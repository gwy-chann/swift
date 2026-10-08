# Implementation Tasks: Master Parts Catalog & Multi-Attribute Search Filtering

**Feature**: `Master Parts Catalog & Multi-Attribute Search Filtering`
**Ticket**: `SIAA-13`
**Epic**: `SIAA-2: Inventory & Warehouse Rack/Shelf Management`
**Status**: In Progress

---

## Phase 1: Core Logic & Filter Engine (TDD)

- [x] **Task 1.1**: Create `lib/inventory/catalog-filter.ts`
  - Implement `filterCatalogProducts` supporting multi-attribute keyword search across SKU, Name, Brand, Model, Category, and Shelf Locator.
  - Implement category filtering with `'All'` default handling.
  - Implement stock availability filtering (`'all'`, `'in_stock'`, `'low_stock'`, `'out_of_stock'`).
  - Implement `calculateCatalogStats` computing total SKUs, low stock count, out of stock count, total valuation, and categories count.
  - Implement `getStockHealthStatus` classifying products into `'healthy'`, `'low'`, or `'out_of_stock'`.
  - Export types and contracts aligned with `specs/007-master-parts-catalog-search/contracts/catalog-contracts.ts`.

- [x] **Task 1.2**: Create unit test suite in `lib/inventory/__tests__/catalog-filter.test.ts`
  - Test keyword matching across all attributes, case-insensitivity, and whitespace trimming.
  - Test individual and combined category + stock filters.
  - Test statistics calculation and valuation aggregation.
  - Run and verify tests pass: `npm test`.

---

## Phase 2: UI Presentation Components

- [x] **Task 2.1**: Implement `components/admin/inventory/inventory-stats-cards.tsx`
  - Render 4 KPI metric cards: Total SKUs, Low Stock Alerts, Total Valuation (₱), and Monitored Categories.
  - Strictly use SWIFT design tokens (`bg-bg-card`, `border-border`, `text-text-primary`, `text-danger`, etc.).
  - Ensure accessible icon labels and typography hierarchy.

- [x] **Task 2.2**: Implement `components/admin/inventory/catalog-filter-bar.tsx`
  - Search input with search icon, clear button, and accessible `aria-label`.
  - Category dropdown selector dynamically populating categories or standard list.
  - Stock availability dropdown selector (`All`, `In Stock`, `Low Stock Only`, `Out of Stock`).
  - "Reset Filters" action button when filters are active.

- [x] **Task 2.3**: Implement `components/admin/inventory/catalog-table.tsx`
  - Structured responsive table displaying columns: SKU, Part Name & Fitment, Category, Shelf Location, Stock Level, Retail Price, and Actions.
  - Render semantic status badges: Green for healthy, Amber/Red for low stock, Red for out of stock.
  - Render shelf location tag with icon and OEM Genuine badge.
  - Provide "Adjust" action button with accessible label and callback hook.
  - Include horizontal scroll wrapping for tablet/mobile viewports.

- [x] **Task 2.4**: Implement `components/admin/inventory/catalog-empty-state.tsx`
  - Centered empty state card with search/box icon, helpful message, and "Reset Filters" button.

---

## Phase 3: Container Component & Page Integration

- [x] **Task 3.1**: Implement `components/admin/inventory/inventory-catalog.tsx`
  - Client component (`"use client"`) subscribing to `useInventoryStore`.
  - Maintain active filter state (`query`, `category`, `stockStatus`).
  - Calculate active stats and filtered products using `lib/inventory/catalog-filter.ts`.
  - Render layout with stats header, filter bar, catalog table, or empty state.

- [x] **Task 3.2**: Update `/app/admin/inventory/page.tsx`
  - Replace the placeholder content with the full `<InventoryCatalog />` view.
  - Provide proper page header, title, and descriptive subtitle.

---

## Phase 4: Verification & Quality Gates

- [x] **Task 4.1**: Run TypeScript verification: `npm run typecheck` (`npx tsc --noEmit`)
- [x] **Task 4.2**: Run ESLint verification: `npm run lint`
- [x] **Task 4.3**: Run full test suite: `npm test`
- [x] **Task 4.4**: Verify token adherence (zero hardcoded hex/RGB values).
- [x] **Task 4.5**: Perform Atomic Commits adhering to Conventional Commits format (`.agents/rules/atomic-commit.md`).
