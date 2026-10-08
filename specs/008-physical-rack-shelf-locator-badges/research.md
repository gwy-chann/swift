# Research & Architectural Analysis: Shelf Locator Mapping

- **Feature**: `SIAA-14`
- **Component Scope**: `components/common/shelf-location-tag.tsx`, `components/admin/inventory/catalog-table.tsx`, `lib/inventory/catalog-filter.ts`

---

## 1. Domain Modeling of Warehouse Locations

In the SWIFT motorcycle warehouse layout:
- Standard format consists of:
  - **Zone / Aisle / Rack**: e.g., `Rack A-01`, `Rack B-04`, `Aisle 1`, `Tire Rack 2`
  - **Level / Shelf / Bin**: e.g., `Shelf 2`, `Shelf 1`, `Floor`
  - Combinator: `" / "` delimiter (e.g., `Rack A-01 / Shelf 2`)
- Missing or blank assignments:
  - `""`, `"   "`, `null`, `undefined`, or `"Unassigned"`
  - Must trigger the fallback state with `Unassigned Bay` badge.

## 2. Location Parser & Formatter Utility

To support robust parsing, badge rendering, and search normalization:
- Utility function `parseShelfLocation(location?: string | null)`:
  - Input: raw string
  - Returns:
    ```typescript
    export interface ParsedShelfLocation {
      isAssigned: boolean;
      zoneOrRack: string;
      shelfOrBin?: string;
      formatted: string;
    }
    ```
- When `isAssigned` is false, returns `formatted: 'Unassigned Bay'`.

## 3. High-Contrast Accessible Tag Design

- The badge must carry the specific CSS class `.shelf-location-tag` to satisfy automation and styling contracts.
- High contrast compliant with WCAG AA.
- Token mapping:
  - Assigned: `bg-secondary-light text-secondary border-secondary/20`
  - Unassigned: `bg-accent-light text-accent border-accent/30` with `aria-label="Unassigned storage bay warning"`

## 4. Search Filter Integration

In `lib/inventory/catalog-filter.ts`:
- Current query check matches `product.location.toLowerCase().includes(query)`.
- If an unassigned item has `location: ''`, searching for `unassigned` should also match unassigned bay items!
- Normalizing whitespace and case guarantees rapid picking queries like `"shelf 2"` or `"rack a-01"`.
