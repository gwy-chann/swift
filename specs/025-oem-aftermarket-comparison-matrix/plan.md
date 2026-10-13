# Implementation Plan: Side-by-Side OEM vs. Aftermarket Comparison Matrix

**Feature**: `025-oem-aftermarket-comparison-matrix`  
**Jira Ticket**: [SIAA-24](https://the-three-devsketeers.atlassian.net/browse/SIAA-24)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Architecture Overview & Component Boundaries

```text
[MotorcycleSelector] (SIAA-23)
         │
         ▼ (Selected Model / Platform)
[AdminMotoMatcherClient / StaffCompatPage]
         │
         ▼ (Filtered Parts)
[partitionComparisonParts / normalizeToComparisonPart]
         │
         ▼ (oemParts, aftermarketParts)
[<ComparisonMatrix />] (components/motomatcher/comparison-matrix.tsx)
 ├── Column 1: OEM Standard Replacement
 │    ├── Themed Blue/Slate Header (ShieldCheck icon)
 │    ├── OEM Part Cards (SKU, Name, Brand, Shelf Location, Retail ₱, Stock Badge)
 │    └── Graceful Empty Fallback
 └── Column 2: Performance / Alternative Aftermarket
      ├── Themed Purple/Amber Header (Zap icon)
      ├── Aftermarket Part Cards (Upsell Delta Badge, Brand, Shelf Location, Retail ₱, Stock Badge)
      └── Graceful Empty Fallback
```

---

## 2. Implementation Phases

### Phase 1: Contracts & Pure Domain Utilities
- File: `lib/motomatcher/comparison-matrix-contracts.ts` (re-export or implement `ComparisonPartItem`, `fromProductToComparisonPart`, `fromMatrixPartToComparisonPart`, `partitionComparisonParts`).
- Unit Tests: `lib/motomatcher/__tests__/comparison-matrix.test.ts` covering partitioning accuracy, attribute mapping, low-stock threshold detection, and upsell delta formatting.

### Phase 2: Reusable `<ComparisonMatrix />` Component
- File: `components/motomatcher/comparison-matrix.tsx`
- Implement dual-column responsive grid (`grid-cols-1 lg:grid-cols-2 gap-4`).
- Implement high-contrast semantic headers:
  - OEM: `bg-primary-light border-primary-border text-primary`
  - Aftermarket: `bg-secondary/10 border-secondary/20 text-secondary`
- Implement part card rendering with SKU, name, brand, shelf location badge (`MapPin`), retail price (₱), stock badges (normal vs low stock), upsell delta badges, and "Add to POS Cart" action button with visual checkmark feedback.
- Implement empty column fallbacks with `PackageOpen` icons.

### Phase 3: Portal Integration
- Admin Portal: Refactor `app/admin/motomatcher/admin-motomatcher-client.tsx` to utilize `<ComparisonMatrix />`.
- Staff Portal: Upgrade `app/staff/compat/page.tsx` from single grid to side-by-side `<ComparisonMatrix />` with subsystem filter integration.

### Phase 4: Verification & Convergence
- Run `npm run typecheck`.
- Run `npm test -- lib/motomatcher/__tests__/comparison-matrix.test.ts`.
- Run `npm run lint`.
