# Tasks: Physical Rack & Shelf Locator Mapping & Warehouse Navigation Badges

**Input**: Feature specification from `specs/008-physical-rack-shelf-locator-badges/spec.md`  
**Plan**: `specs/008-physical-rack-shelf-locator-badges/plan.md`  
**Ticket**: `SIAA-14`  
**Branch**: `feat/SIAA-14-shelf-locator-mapping`  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish domain contracts and test environment for shelf locator mapping.

- [X] T001 Define shelf locator TypeScript contracts in specs/008-physical-rack-shelf-locator-badges/contracts/shelf-locator-contracts.ts
- [X] T002 [P] Configure Vitest test runner setup for inventory unit tests in vitest.config.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core parsing engine that MUST be complete before UI components and search integration.

- [X] T003 Implement pure shelf location parser and helper utilities in lib/inventory/shelf-location.ts
- [X] T004 [P] Unit tests for shelf location parser and delimiter scenarios in lib/inventory/__tests__/shelf-location.test.ts

**Checkpoint**: Foundation ready - shelf location parsing is verified and ready for UI presentation and search integration.

---

## Phase 3: User Story 1 - Standardized Shelf Locator Badge Display (Priority: P1) 🎯 MVP

**Goal**: Render distinct high-contrast `.shelf-location-tag` badges with MapPin icon for catalog items with assigned storage bays.  
**Independent Test**: Load `/admin/inventory` and verify parts with assigned locations display `.shelf-location-tag` badges formatted as `Rack A-01 / Shelf 2`.

### Tests for User Story 1
- [X] T005 [P] [US1] Unit tests for assigned location badge formatting in lib/inventory/__tests__/shelf-location.test.ts

### Implementation for User Story 1
- [X] T006 [P] [US1] Implement reusable ShelfLocationTag component in components/inventory/shelf-location-tag.tsx
- [X] T007 [US1] Integrate ShelfLocationTag into admin inventory table in components/admin/inventory/catalog-table.tsx

**Checkpoint**: User Story 1 is functional and verifiable as a standalone MVP increment.

---

## Phase 4: User Story 2 - Real-Time Location-Specific Search & Filtering (Priority: P1)

**Goal**: Enable shop floor mechanics to filter the catalog in real-time by typing rack or shelf queries.  
**Independent Test**: Type "Rack A-01" or "Shelf 2" into the search bar at `/admin/inventory` and verify only matching parts are displayed in `< 50ms`.

### Tests for User Story 2
- [X] T008 [P] [US2] Unit tests for location-specific search filtering in lib/inventory/__tests__/catalog-filter.test.ts

### Implementation for User Story 2
- [X] T009 [US2] Extend search query predicate in lib/inventory/catalog-filter.ts to match product location coordinates

**Checkpoint**: Both User Story 1 and User Story 2 are functional and work seamlessly together.

---

## Phase 5: User Story 3 - Missing Location Fallback Warning (Priority: P2)

**Goal**: Render an amber `Unassigned Bay` warning badge for items lacking storage coordinates and surface them when searching `"unassigned"`.  
**Independent Test**: Inspect a part with empty location to see the amber badge with AlertTriangle icon, and search `"unassigned"` to filter all unallocated parts.

### Tests for User Story 3
- [X] T010 [P] [US3] Unit tests for unassigned fallback parsing and unassigned search matching in lib/inventory/__tests__/shelf-location.test.ts and lib/inventory/__tests__/catalog-filter.test.ts

### Implementation for User Story 3
- [X] T011 [P] [US3] Add unassigned warning badge styling and AlertTriangle icon in components/inventory/shelf-location-tag.tsx
- [X] T012 [P] [US3] Update mock products in lib/mock-data/products.ts to include sample items with unassigned location
- [X] T013 [US3] Connect "unassigned" search keyword handling in lib/inventory/catalog-filter.ts

**Checkpoint**: Catalog alerts inventory clerks to unallocated bays and provides instant search recovery.

---

## Phase 6: User Story 4 - Accessible Tooltips and Screen Reader Navigation (Priority: P3)

**Goal**: Provide WCAG 2.1 AA accessible labels, role statuses, and high-contrast readability.  
**Independent Test**: Verify screen readers and DOM inspectors announce `aria-label="Physical location: ..."` and `aria-label="Unassigned storage bay warning"`.

### Implementation for User Story 4
- [X] T014 [P] [US4] Add aria-label and role="status" attributes to ShelfLocationTag in components/inventory/shelf-location-tag.tsx

**Checkpoint**: All user stories are accessible, responsive, and functionally complete.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification gates, linting, type-safety, and design tokens audit.

- [X] T015 [P] Run unit test suite with Vitest via npm test
- [X] T016 [P] Run TypeScript typecheck verification via npx tsc --noEmit
- [X] T017 [P] Run ESLint static analysis via npm run lint
- [X] T018 Verify SWIFT design tokens adherence and zero hardcoded colors in app/globals.css and lib/tokens.ts
- [X] T019 Update quickstart verification guide in specs/008-physical-rack-shelf-locator-badges/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Complete.
- **Foundational (Phase 2)**: Complete.
- **User Story 1 (Phase 3)**: Complete.
- **User Story 2 (Phase 4)**: Complete.
- **User Story 3 (Phase 5)**: Complete.
- **User Story 4 (Phase 6)**: Complete.
- **Polish (Phase 7)**: Complete.

### Verification Summary
- **Unit Tests**: 30 passing (100% pass rate)
- **TypeScript**: 0 compilation errors (`tsc --noEmit`)
- **ESLint**: 0 errors, 0 warnings across all SIAA-14 feature files
- **Design Tokens**: 100% semantic token compliance (`bg-secondary-light`, `bg-accent-light`, etc.)
