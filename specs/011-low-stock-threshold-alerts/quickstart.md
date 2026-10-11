# Quickstart & Verification Guide: Low-Stock Threshold Detection & Restock Alerts

- **Feature Key**: `SIAA-17`
- **Branch**: `feat/SIAA-17-low-stock-threshold-alerts`

---

## 1. Automated Testing

Run the test suite verifying threshold evaluations, calculation of summary stat cards, quick-filter logic, and zero-stock guards:

```bash
npm test
```

Verify TypeScript type safety and linting:

```bash
npx tsc --noEmit
npm run lint
```

---

## 2. Interactive End-to-End Verification

### Scenario 1: Dynamic Low-Stock & Out-of-Stock Badging
1. Navigate to `/admin/inventory` in your browser.
2. Observe the **Stock Status** column in the parts catalog table:
   - Items with `stock > minThreshold` render with green/success badges (e.g. `12 in stock`).
   - Items with `stock <= minThreshold` and `stock > 0` render with high-contrast red/danger badges (e.g. `Low: 2 left (Min 5)`).
   - Items with `0` stock render with an explicit `Out of Stock` warning badge.

### Scenario 2: Operational Health Stat Cards
1. Check the top 4 summary metric cards at `/admin/inventory`:
   - **Total Active SKUs**: Shows distinct SKU count.
   - **Total Units on Hand**: Shows the cumulative count of all physical units on the floor.
   - **Critical Low Stock**: Shows the count of items at or below safety threshold.
   - **Total Inventory Valuation**: Formatted in `₱` (e.g. `₱458,250.00`).
2. Adjust stock on any item via the "Adjust" modal to confirm that the stat cards update immediately without reloading.

### Scenario 3: Reorder Quick-Filter Toggle
1. Click the **Low Stock Alerts** quick-filter button in the filter bar.
2. Confirm the catalog immediately filters to show only items with depleted stock (`stock <= minThreshold`).
3. Combine with search (e.g., search "Brake") to verify filter composition.
4. Toggle the button off to restore the full catalog view.

### Scenario 4: Fast-Lane POS Terminal Zero-Stock Protection
1. Navigate to `/staff/pos`.
2. Locate a product with 0 stock.
3. Verify that the item renders an `Out of Stock` warning badge and the `+ Add` button is disabled unless manager override is enabled.
4. Verify that low-stock items render advisory warning tags.
