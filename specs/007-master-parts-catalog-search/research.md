# Technical Research: Master Parts Catalog & Search Engine Architecture

**Feature**: `Master Parts Catalog & Multi-Attribute Search Filtering`
**Ticket**: `SIAA-13`
**Epic**: `SIAA-2 (EPIC-2: Inventory & Warehouse Rack/Shelf Management)`
**Date**: 2026-10-09

---

## 1. Context & Architecture Alignment

### A. Pre-existing Foundation (SIAA-12 & SIAA-9)
- **Domain Models (`lib/types/product.ts`)**: The `Product` interface defines `sku`, `name`, `category`, `stock`, `minThreshold`, `location`, `cost`, `wholesale`, `retail`, `oem`, `model`, `brand`.
- **Reactive Store (`lib/store/inventory-store.ts`)**: `inventoryStore` manages products with `useSyncExternalStore` integration (`useInventoryStore`), providing instant reactive updates across client components.
- **Admin Layout Shell (`app/admin/layout.tsx` & `components/admin/admin-layout-shell.tsx`)**: Provides the responsive admin topbar, sidebar, and container grid for `/admin/inventory`.

### B. Mockup Analysis (`mockup/admin.html` & `mockup/app.js`)
In the reference motorcycle workshop mockup:
1. **Catalog Table Columns**:
   - `SKU`: Monospace badge/code (e.g., `YAM-NMAX-BL01`)
   - `Part Name & Fitment`: Name in bold, OEM tag, motorcycle model compatibility (e.g., `Yamaha NMAX 155`)
   - `Category`: Subsystem pill badge (`Brakes`, `Drivetrain`, `Fluids`, etc.)
   - `Shelf Locator`: Warehouse rack coordinates (e.g., `Rack A-01 / Shelf 2`)
   - `Stock Status`: Quantity indicator with health badge (Normal green vs. Low-Stock amber/red vs. Out-of-Stock red)
   - `Retail Price`: Formatted currency in PHP (e.g., `₱450.00`)
   - `Actions`: "Adjust" button with icon
2. **Top Filter Toolbar**:
   - Live search input with search icon and clear button
   - Category dropdown filter
   - Stock level filter (All, In Stock, Low Stock Only, Out of Stock)
   - Summary statistics bar (Total SKUs, Low Stock, Inventory Valuation, Categories)

---

## 2. Multi-Attribute Filter Predicate Design

To achieve deterministic `< 50ms` client-side filtering without unnecessary network round trips:

```typescript
export interface CatalogFilterCriteria {
  query: string;
  category: string;
  stockStatus: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
}

export function filterCatalogProducts(
  products: Product[],
  criteria: CatalogFilterCriteria
): Product[] {
  const normalizedQuery = criteria.query.trim().toLowerCase();

  return products.filter((product) => {
    // 1. Text Query Matching across multiple attributes
    if (normalizedQuery) {
      const matchesText =
        product.sku.toLowerCase().includes(normalizedQuery) ||
        product.name.toLowerCase().includes(normalizedQuery) ||
        product.brand.toLowerCase().includes(normalizedQuery) ||
        product.model.toLowerCase().includes(normalizedQuery) ||
        product.category.toLowerCase().includes(normalizedQuery) ||
        product.location.toLowerCase().includes(normalizedQuery);

      if (!matchesText) return false;
    }

    // 2. Category Filter
    if (criteria.category && criteria.category !== 'All' && criteria.category !== 'All Categories') {
      if (product.category !== criteria.category) return false;
    }

    // 3. Stock Status Filter
    if (criteria.stockStatus === 'in_stock') {
      if (product.stock <= product.minThreshold) return false;
    } else if (criteria.stockStatus === 'low_stock') {
      if (product.stock > product.minThreshold || product.stock === 0) return false;
    } else if (criteria.stockStatus === 'out_of_stock') {
      if (product.stock > 0) return false;
    }

    return true;
  });
}
```

---

## 3. Component Hierarchy & Module Boundaries

The implementation follows a modular component structure under `components/admin/inventory/`:

```text
app/admin/inventory/page.tsx (Page Entrypoint)
  └── components/admin/inventory/inventory-view.tsx (Client Container with store hook)
        ├── inventory-stats-header.tsx (KPI summary cards)
        ├── catalog-filter-bar.tsx (Search input, category select, stock select, clear)
        ├── catalog-table.tsx (Responsive structured table, stock badges, actions)
        └── catalog-empty-state.tsx (No results feedback card)
```

### Boundary Rationale:
- **`app/admin/inventory/page.tsx`**: Thin Server Component metadata wrapper.
- **`inventory-view.tsx`**: Client Component (`"use client"`) subscribing to `useInventoryStore` for live product reactivity.
- **`catalog-table.tsx`**: Pure presentational component accepting filtered products and an optional `onAdjustStock` callback.

---

## 4. SWIFT Design Tokens & Accessibility Guidelines

- **Zero Hardcoded Colors**:
  - Table background: `bg-bg-card`
  - Table headers: `bg-bg-muted/60 text-text-secondary`
  - Table row border: `border-border-subtle`
  - Row hover: `hover:bg-bg-hover/50`
  - Text colors: `text-text-primary`, `text-text-secondary`, `text-text-muted`
  - Stock Healthy Badge: `bg-success-light text-success border-success/30`
  - Low Stock Badge: `bg-danger-light text-danger border-danger/30`
  - Out of Stock Badge: `bg-danger text-text-light`
  - OEM Badge: `bg-primary-light text-primary border-primary/20`
  - Shelf Location Pill: `bg-secondary-light text-secondary border-secondary/20`
- **Accessibility (WCAG 2.1 AA)**:
  - Form inputs have explicit labels / `aria-label` attributes.
  - Interactive table action buttons include `aria-label="Adjust stock for {product.name}"`.
  - Contrast ratios conform to 4.5:1 for normal text and 3:1 for large badges.
