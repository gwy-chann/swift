# Implementation Plan: Staff Floor Terminal Touch-Optimized MotoMatcher & Shelf Locator Integration

**Feature**: `028-staff-terminal-motomatcher-shelf-locator`  
**Jira Ticket**: [SIAA-27](https://the-three-devsketeers.atlassian.net/browse/SIAA-27) (STORY-4.5)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Architecture Overview & Component Boundaries

```text
[Staff Shop Floor Terminal (/staff/compat)]
   │
   ├── <MotorcycleSelector /> (Platform selector with touch chips)
   ├── <SubsystemFilterBar /> (Touch-friendly subsystem category pills)
   │
   └── <ComparisonMatrix />
         │
         ├── [Mobile Segmented Switcher] (< 768px viewports)
         │     ├── Tab: "OEM Standard Factory Parts (X)"
         │     └── Tab: "Performance / Aftermarket Parts (Y)"
         │
         ├── [Desktop Side-by-Side Grid] (>= 768px viewports)
         │     ├── OEM Column
         │     └── Aftermarket Column
         │
         └── [Part Cards with Touch Ergonomics]
               ├── Prominent <ShelfLocationTag location={part.shelfLocation} />
               ├── High-contrast card border & typography
               └── Touch-Optimized "+ Add to Active POS Cart" (min-h-[44px])
                     │
                     ▼
             [dispatchMotoMatcherCartInsertion] (usePosStore + Toast Feedback)
```

---

## 2. Implementation Phases

### Phase 1: Contract Extensions & Shelf Location Propagation
- **File**: `lib/motomatcher/comparison-matrix-contracts.ts`
  - Extend `ComparisonMatrixProps` with `touchOptimized?: boolean`, `activeMobileTab?: "oem" | "aftermarket"`, `onMobileTabChange?: (tab: "oem" | "aftermarket") => void`.
- **File**: `lib/motomatcher/subsystem-filter.ts`
  - Ensure `toComparisonPartItem(product, isOem)` maps `product.shelf_location` (or `product.shelfLocation`) cleanly to `shelfLocation`.

### Phase 2: Touch Ergonomics & Shelf Locator Tag in `<ComparisonMatrix />`
- **File**: `components/motomatcher/comparison-matrix.tsx`
  - Import `<ShelfLocationTag />` from `@/components/inventory/shelf-location-tag`.
  - In `renderPartCard`:
    - Replace the basic inline text with `<ShelfLocationTag location={part.shelfLocation} className="text-xs" />`.
    - Enforce `min-h-[44px]` on the Add to Cart button for touch-friendly ergonomics.
  - Implement mobile segmented tab controls:
    - Displayed on mobile/tablet viewports (`block md:hidden`).
    - Tab buttons with `min-h-[44px]` height and active styling.
    - Seamlessly display the selected column without horizontal scrolling.

### Phase 3: Staff Terminal View Refinement
- **File**: `app/staff/compat/page.tsx`
  - Pass `touchOptimized={true}` to `<ComparisonMatrix />`.
  - Verify optimistic toast confirmation and shared floor cart synchronization.

### Phase 4: Verification Suite & Testing
- **Test File**: `components/motomatcher/__tests__/comparison-matrix.test.tsx`
  - Verify `<ShelfLocationTag />` is rendered with coordinates (e.g. `Rack A-01 / Shelf 2`).
  - Verify unassigned bays render the warning tag.
  - Verify mobile tab switching toggles visible column content.
  - Verify touch target `min-h-[44px]` classes on action buttons.
  - Verify cart callback dispatches correctly on click/tap.
- Run `npm test`, `npm run typecheck`, and `npm run lint`.
