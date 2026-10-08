# Implementation Plan: Physical Rack & Shelf Locator Mapping & Warehouse Navigation Badges

- **Feature**: `SIAA-14`
- **Parent Epic**: `SIAA-2`
- **Branch**: `feat/SIAA-14-shelf-locator-mapping`

---

## 1. Architectural Strategy

We will deliver this feature in 3 architectural units following atomic commit guidelines:
1. **Core Domain & Parsing Utilities**:
   - `lib/inventory/shelf-location.ts`
   - Pure parser `parseShelfLocation(location?: string | null): ParsedShelfLocation`
   - Unit tests in `lib/inventory/__tests__/shelf-location.test.ts`
2. **Search Integration**:
   - Enhance `lib/inventory/catalog-filter.ts` so searching for `"unassigned"` surfaces items with missing locations, and rack/shelf queries match cleanly.
   - Unit tests covering location filtering scenarios in `catalog-filter.test.ts`.
3. **UI Components & Catalog Table Integration**:
   - Create reusable `<ShelfLocationTag>` in `components/inventory/shelf-location-tag.tsx`.
   - Update `components/admin/inventory/catalog-table.tsx` to render `<ShelfLocationTag>`.
   - Update mock products in `lib/mock-data/products.ts` to include at least one unassigned product to demonstrate the amber badge.

---

## 2. Testing & Verification Gate

- Run vitest/node test runner on `lib/inventory/__tests__/shelf-location.test.ts` and `catalog-filter.test.ts`.
- Run `npx tsc --noEmit` for zero type errors.
- Confirm zero hardcoded colors and strict adherence to SWIFT design tokens.
