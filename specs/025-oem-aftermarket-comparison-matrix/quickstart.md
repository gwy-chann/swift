# Quickstart & Verification Guide: Side-by-Side OEM vs. Aftermarket Comparison Matrix

**Feature**: `025-oem-aftermarket-comparison-matrix`  
**Jira Ticket**: [SIAA-24](https://the-three-devsketeers.atlassian.net/browse/SIAA-24)  

---

## 1. Automated Test Verification

Run the unit test suite verifying partitioning logic, contract schemas, card attribute validation, and component rendering:

```bash
npm test -- lib/motomatcher/__tests__/comparison-matrix.test.ts
```

Run TypeScript compilation check to ensure strict type safety across all consumers:

```bash
npm run typecheck
```

---

## 2. Interactive Manual Verification Scenarios

### Scenario 1: Dual-Column Layout Rendering & Distinct Visual Headers
1. Open the Admin MotoMatcher page at `http://localhost:3000/admin/motomatcher` or Staff Terminal at `http://localhost:3000/staff/compat`.
2. Select an active motorcycle (e.g., **Yamaha NMAX 155**).
3. **Verify**:
   - The matrix renders two distinct side-by-side columns:
     - Left column: `OEM Standard Replacement (X)` with blue/slate theme header (`ShieldCheck` icon, `Genuine Factory Specs` badge).
     - Right column: `Aftermarket & Performance (Y)` with purple/amber theme header (`Zap` icon, `Enhanced Tuning / Value` badge).
   - On narrower viewports (mobile), verify the grid stacks vertically with full readability.

### Scenario 2: Part Card Attributes & Shelf Locator Badges
1. Inspect individual cards in both columns.
2. **Verify** each card displays:
   - SKU code in bold monospace (e.g., `YAM-NMAX-BELT-OEM`).
   - Part name (e.g., `Yamaha Genuine V-Belt`).
   - Brand name (e.g., `Yamaha Genuine` or `Koso`).
   - Physical shelf location with map pin icon (e.g., `Rack A-01 / Shelf 2`).
   - Formatted retail price in Philippine Pesos (`₱1,150.00`).
   - Stock level badge (`X in stock` in green, or `Low Stock` alert in red when `stock <= minThreshold`).

### Scenario 3: Universal vs. Dedicated Partitioning
1. Click the "Universal" quick-select pill or filter for a platform with universal parts.
2. **Verify**:
   - Parts tagged as `Universal` with `oem: false` appear in the Aftermarket column with an `AFTERMARKET` or `UNIVERSAL` badge.
   - Parts with `oem: true` appear in the OEM column.

### Scenario 4: Graceful Empty State Fallback
1. Select a motorcycle platform that has OEM parts but no aftermarket parts, or vice versa (or filter by a category with 0 results in one column).
2. **Verify**:
   - The empty column displays a clean dashed card with a `PackageOpen` icon and helpful message:
     - "No OEM matches in stock for this platform" / "No Aftermarket matches in stock for this platform".
   - The opposite column continues to render normally without layout distortion.

### Scenario 5: 1-Click Cart Insertion & Visual Feedback
1. Click the "Add to POS Cart" button on any part card.
2. **Verify**:
   - The button transitions to "Added to Cart" with a checkmark in green.
   - After 1.8 seconds, the button resets.
   - The item is successfully added to the active POS cart.
