# Research & Architectural Analysis: Low-Stock Threshold Detection & Restock Alerts

- **Feature Key**: `SIAA-17`
- **Parent Epic**: `SIAA-2` (EPIC-2: Inventory & Warehouse Rack/Shelf Management)
- **Scope**: Catalog Badges, Operational KPI Summary Cards, Quick-Filter Toggle, POS Depletion Warnings

---

## 1. Domain Logic & Threshold Evaluation

### Decision
Implement centralized stock evaluation logic in `lib/inventory/threshold-alerts.ts` (re-exported or integrated with `catalog-filter.ts`):
- `StockStatus`:
  - `'healthy'`: `product.stock > product.minThreshold`
  - `'low'`: `product.stock > 0 && product.stock <= product.minThreshold`
  - `'out_of_stock'`: `product.stock <= 0`
- `getStockBadgeLabel(product)`:
  - Healthy: `${stock} in stock` or `${stock} Units`
  - Low: `Low: ${stock} left (Min ${minThreshold})`
  - Out of Stock: `Out of Stock` (or `0 Out of Stock`)

### Rationale
Consolidating status checks and formatting into pure functions guarantees identical evaluations across:
1. Admin Parts Catalog Table (`components/admin/inventory/catalog-table.tsx`)
2. Inventory Summary Cards (`components/admin/inventory/inventory-stats-cards.tsx`)
3. Staff Fast-Lane POS Terminal (`app/staff/pos/page.tsx`)
4. Quick-filter queries and future executive KPI dashboards (`SIAA-6`, `SIAA-33`).

### Alternatives Considered
- *Inline conditional checks inside React components*: Rejected because disparate components would diverge on edge cases (such as when `minThreshold` is 0 or when `stock` is equal to `minThreshold`).

---

## 2. Inventory Summary KPI Metrics Computation

### Decision
Extend `CatalogStats` in `lib/inventory/catalog-filter.ts` to compute all four required operational indicators:
1. **Total Active SKUs**: `products.length`
2. **Total Units on Hand**: `sum(product.stock)` across all catalog items
3. **Critical Low Stock**: Count of items where `product.stock <= product.minThreshold` (inclusive of out-of-stock items requiring restock)
4. **Total Inventory Valuation**: Cumulative valuation formatted in Philippine Pesos (`₱`) using `formatPeso()`.

Update `InventoryStatsCards` to present these 4 canonical cards in strict conformance with Scenario 2 of the acceptance criteria.

### Rationale
The store manager needs an immediate holistic picture of physical units and monetary value alongside SKU counts and critical replenishment needs.

### Alternatives Considered
- *Computing values in separate hooks*: Unnecessary overhead since products are already in-memory via `useInventoryStore()` and calculated in a single linear pass `O(N)`.

---

## 3. Dedicated Reorder Quick-Filter Toggle

### Decision
Add a high-visibility "Low Stock Alerts" quick-filter toggle button alongside the existing search bar and category dropdown in `CatalogFilterBar`:
- Dedicated toggle button / filter chip displaying the live count of critical low-stock items (e.g. `⚠️ Low Stock Alerts (3)`).
- When active, filters the catalog to show only items where `stock <= minThreshold`.
- Syncs bi-directionally with the `stockFilter` state (`'low_stock'` or dedicated boolean toggle).
- Composes seamlessly with active search queries, shelf rack filters, and category selections.
- If no items are below threshold, displays a helpful empty state confirming optimal stock levels.

### Rationale
Gives inventory clerks a single-click action to isolate purchase order candidates without navigating dropdown menus.

---

## 4. POS Terminal Availability Badging & Zero-Stock Prevention

### Decision
1. Create a reusable `<StockBadge stock={number} minThreshold={number} compact?: boolean />` component consuming SWIFT semantic tokens.
2. In Staff Fast-Lane POS (`app/staff/pos/page.tsx`):
   - Display stock availability badges on item cards.
   - For items with `stock <= 0`, disable the `+ Add` button and render an `Out of Stock` badge.
   - Provide an optional "Manager Override" checkbox/action to allow backorders if authorized.
   - For low-stock items (`stock <= minThreshold`), display the warning badge to caution the cashier.

### Rationale
Prevents cashiers from committing to orders of physical parts that are not present on shelves, protecting store integrity and avoiding refund friction.
