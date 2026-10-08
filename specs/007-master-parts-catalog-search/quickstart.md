# Quickstart & Verification Guide: Master Parts Catalog & Filtering

**Feature**: `Master Parts Catalog & Multi-Attribute Search Filtering`
**Ticket**: `SIAA-13`
**Date**: 2026-10-09

---

## 1. Quick Verification Overview

This guide provides step-by-step procedures to verify the master parts catalog table, live search engine, category filtering, stock status flags, and KPI metric cards on `/admin/inventory`.

---

## 2. Automated Test Execution

Run the automated test suite to verify filter predicate logic, search matching, and stock calculations:

```bash
npm test -- test/catalog-filter.test.ts
```

Run TypeScript and lint validations:

```bash
npm run typecheck
npm run lint
```

---

## 3. Manual UI Verification Scenarios

### Scenario 1: Initial Page Render & KPI Header
1. Start the development server: `npm run dev`
2. Open `http://localhost:3000/admin/inventory` in your browser.
3. Verify that the 4 top KPI cards display accurate summary numbers:
   - Total SKUs (12 items from seed catalog)
   - Low Stock Alert count (items where `stock <= minThreshold`)
   - Total Inventory Retail Valuation (formatted in ₱)
   - Active Categories count
4. Verify the structured table contains all 12 initial parts with SKU, Name, Fitment, Category pill, Shelf Location tag, Stock status badge, and Retail price (₱).

### Scenario 2: Instant Multi-Attribute Search
1. Focus on the search input in the filter bar.
2. Type `"Brake"`:
   - Verify table narrows to `"OEM Front Brake Pads"` and `"RCB S-Series Ceramic Brake Pads"`.
3. Clear and type `"NMAX"`:
   - Verify table displays all parts compatible with Yamaha NMAX 155.
4. Clear and type `"Rack B-04"`:
   - Verify table displays Drive Belt parts stored in Rack B-04.
5. Type an impossible query like `"xyz123"`:
   - Verify that the empty state component renders with "No products found" and a "Reset Filters" button.
6. Click "Reset Filters" and confirm the full catalog returns.

### Scenario 3: Category Dropdown
1. Select `"Fluids"` from the Category dropdown:
   - Verify only Motul and Shell oil products appear.
2. Select `"Tires"`:
   - Verify only Michelin and IRC tires appear.
3. Reset dropdown to `"All Categories"`.

### Scenario 4: Stock Status Filter
1. Select `"Low Stock Only"` from the Stock Status filter:
   - Verify table displays only items where `stock <= minThreshold` (e.g. `YAM-NMAX-BL01` with stock 2 <= min 5, `HON-CLK-CVTB` with stock 4 <= min 8, `NGK-CPR8EA9` with stock 3 <= min 10).
   - Verify each displays an urgent danger badge.
2. Select `"In Stock"`:
   - Verify only items with healthy stock (`stock > minThreshold`) are displayed with green badges.

### Scenario 5: Row Action Trigger
1. Locate any product row (e.g., `YAM-NMAX-BL01`).
2. Click the "Adjust" button.
3. Verify button triggers without errors, logging or notifying the user that stock adjustment is prepared for SIAA-15 modal integration.
