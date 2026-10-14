# Implementation Plan: Subsystem Category & Universal vs. Dedicated Fitment Filtering

**Feature**: `027-subsystem-category-universal-fitment-filtering`  
**Jira Ticket**: [SIAA-26](https://the-three-devsketeers.atlassian.net/browse/SIAA-26) (STORY-4.4)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Architecture Overview & Component Boundaries

```text
[MotorcycleSelector] (SIAA-23)
        │
        ▼ (selectedModel, isUniversalPlatform)
[<SubsystemFilterBar />] (SIAA-26)
  ├── Subsystem Category Chips ("All Systems", "Braking System", "Drive & CVT", etc.)
  ├── Reset Action ("All Systems" chip)
  └── "Include Universal Parts" Toggle Switch
        │
        ▼ (selectedCategory, includeUniversal)
[filterMotoMatcherProducts / getMotoMatcherFilteredSet] (lib/motomatcher/subsystem-filter.ts)
  ├── Platform match & Universal inclusion/exclusion
  ├── Subsystem category alias normalization & filtering
  └── Exact synchronous count aggregation (total, oemCount, aftermarketCount)
        │
        ▼ (oemParts, aftermarketParts, counts)
[<ComparisonMatrix />] (SIAA-24)
  ├── OEM Column: Header with exact counter badge `OEM (X)`
  └── Aftermarket Column: Header with exact counter badge `Aftermarket (Y)`
```

---

## 2. Implementation Phases

### Phase 1: Contracts & Pure Domain Filtering Engine
- **File**: `lib/motomatcher/subsystem-filter.ts`
  - Defines `SUBSYSTEM_CATEGORIES` taxonomy with labels and aliases.
  - Implements `filterMotoMatcherProducts(products, options)`.
  - Implements `getMotoMatcherFilteredSet(products, options)`.
  - Guarantees:
    - If `includeUniversal === false`, all parts with `model === 'Universal'` or `isUniversal === true` are excluded.
    - If `systemCategory !== 'ALL'`, only parts whose category matches the subsystem ID or aliases are retained.
    - Resulting OEM and Aftermarket counts are mathematically exact (`total === oemCount + aftermarketCount`).
- **Unit Tests**: `lib/motomatcher/__tests__/subsystem-filter.test.ts`
  - Scenario 1: Subsystem Category Pill Filtering (Brakes, Drivetrain/CVT, Fluids).
  - Scenario 2: "All Categories" Reset Action.
  - Scenario 3: Universal Parts Visibility Toggle (`includeUniversal: true` vs `includeUniversal: false`).
  - Scenario 4: Dynamic Header Counter Badges.
  - Scenario 5: Universal platform selection behavior.
  - Scenario 6: Category aliases matching ("CVT" matching "Drivetrain").

### Phase 2: Reusable UI Component: `<SubsystemFilterBar />`
- **File**: `components/motomatcher/subsystem-filter-bar.tsx`
  - Category pill strip with horizontal scrolling for touch and mobile screens (`overflow-x-auto no-scrollbar`).
  - Active chip styling using SWIFT brand primary tokens (`bg-primary text-white`).
  - Inactive chip styling (`bg-bg-card border-border text-text-secondary hover:text-text-primary`).
  - "Include Universal Parts" toggle switch with accessible checkbox/toggle button, clear label, and visual switch indicator.
  - Accessibility: `role="toolbar"` or `role="radiogroup"`, `aria-label`, keyboard focus rings (`focus-visible:ring-2 focus-visible:ring-primary`).

### Phase 3: Portal Integration
- **Staff Floor Terminal (`app/staff/compat/page.tsx`)**:
  - Replace existing ad-hoc category buttons with `<SubsystemFilterBar />`.
  - Wire `systemCategory` and `includeUniversal` state to `getMotoMatcherFilteredSet`.
  - Render live count badges in verified fitment banner and `<ComparisonMatrix />`.
- **Admin MotoMatcher (`app/admin/motomatcher/admin-motomatcher-client.tsx`)**:
  - Integrate `<SubsystemFilterBar />` between `<MotorcycleSelector />` and `<ComparisonMatrix />`.
  - Wire `systemCategory` and `includeUniversal` state to `getMotoMatcherFilteredSet`.
  - Synchronize counters in active platform banner and matrix headers.

### Phase 4: Verification, Lint & Convergence
- Run `npm test -- lib/motomatcher/__tests__/subsystem-filter.test.ts`.
- Run `npm run typecheck` across the entire workspace.
- Run `npm run lint`.
- Verify SWIFT semantic design tokens (zero hardcoded `#hex` or `rgb(...)`).
