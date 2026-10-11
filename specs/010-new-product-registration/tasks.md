# Tasks: New Product Registration with Automated Markup & Location Assignment

**Input**: Feature specification from `specs/010-new-product-registration/spec.md`  
**Plan**: `specs/010-new-product-registration/plan.md`  
**Ticket**: `SIAA-16`  
**Branch**: `feat/SIAA-16-new-product-registration`  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish domain contracts and test infrastructure for new product registration.

- [X] T001 Define product registration TypeScript interfaces and contracts in specs/010-new-product-registration/contracts/product-registration-contracts.ts
- [X] T002 [P] Verify native test runner and TypeScript configuration in package.json

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core calculation engine, validation rules, and unit tests that MUST be complete before UI components and store mutations.

- [X] T003 Implement pure domain functions (calculateMarkupPrices, normalizeSku, validateProductRegistration) in lib/inventory/product-registration.ts
- [X] T004 [P] Unit tests for pure markup calculation (Wholesale +18%, OEM Retail +35%, Aftermarket Retail +40%, custom rules) in lib/inventory/__tests__/product-registration.test.ts
- [X] T005 [P] Unit tests for SKU normalization and case-insensitive collision detection in lib/inventory/__tests__/product-registration.test.ts
- [X] T006 [P] Unit tests for required field validation and numeric constraints in lib/inventory/__tests__/product-registration.test.ts

**Checkpoint**: Foundation ready - markup engine, validations, and unit tests verified, user story implementation can proceed.

---

## Phase 3: User Story 1 - Registration Modal Invocation & Complete Part Entry (Priority: P1) 🎯 MVP

**Goal**: Render an accessible dialog `<ProductRegistrationModal>` with all product attribute inputs and default states when clicking "+ Add Part" on the inventory page.  
**Independent Test**: Navigate to `/admin/inventory`, click "+ Add Part", and verify the registration modal opens displaying all fields with default values (Stock=10, Min=5) and accessible keyboard controls (`Escape`, backdrop click).

### Implementation for User Story 1
- [X] T007 [P] [US1] Implement accessible ProductRegistrationModal dialog shell with backdrop blur, headers, and footer in components/admin/inventory/product-registration-modal.tsx
- [X] T008 [P] [US1] Implement responsive form grid with inputs for SKU, Name, Category, Brand, Model, Shelf Location, Spec Type, Initial Stock, Low Stock Alert, Unit Cost, Wholesale Price, and Retail Price in components/admin/inventory/product-registration-modal.tsx
- [X] T009 [US1] Add Escape key listener, backdrop dismissal, and auto-focus handling in components/admin/inventory/product-registration-modal.tsx
- [X] T010 [US1] Add "+ Add Part" button trigger to components/admin/inventory/catalog-filter-bar.tsx and wire modal opening in components/admin/inventory/inventory-catalog.tsx

**Checkpoint**: User Story 1 is functional and verifiable as a standalone MVP increment.

---

## Phase 4: User Story 2 - Real-Time Dynamic Markup Auto-Calculation & Manual Override (Priority: P1)

**Goal**: Automatically compute Wholesale (+18%) and Retail (+35% OEM vs +40% Aftermarket) prices in real time as Unit Cost or Part Specification changes, while supporting manual price overrides.  
**Independent Test**: Type a Unit Cost of ₱500.00 into the modal; verify Wholesale Price computes to ₱590.00 and Retail Price computes to ₱700.00 (+40% Aftermarket) or ₱675.00 (+35% OEM), and verify custom edits to price inputs are preserved.

### Implementation for User Story 2
- [X] T011 [P] [US2] Connect auto-calculate pricing handler to Unit Cost and Part Specification inputs in components/admin/inventory/product-registration-modal.tsx
- [X] T012 [US2] Implement manual price override tracking to preserve user-entered custom wholesale and retail amounts in components/admin/inventory/product-registration-modal.tsx

**Checkpoint**: User Stories 1 and 2 deliver automated pricing with full commercial override flexibility.

---

## Phase 5: User Story 3 - Case-Insensitive SKU Collision Prevention & Field Validation (Priority: P1)

**Goal**: Validate required fields and prevent duplicate SKU registration regardless of letter casing (`yam-nmax-bl01` vs `YAM-NMAX-BL01`) with clear inline alerts.  
**Independent Test**: Attempt to submit a new part with an existing catalog SKU in lowercase; confirm submission is rejected with an inline duplicate error alert.

### Implementation for User Story 3
- [X] T013 [P] [US3] Implement real-time and on-submit case-insensitive SKU collision detection against active catalog in components/admin/inventory/product-registration-modal.tsx
- [X] T014 [US3] Render field-level validation messages for missing required fields, non-positive unit cost, or duplicate SKU in components/admin/inventory/product-registration-modal.tsx

**Checkpoint**: Data integrity protected from duplicate SKUs and invalid data entry.

---

## Phase 6: User Story 4 - Immediate Catalog Insertion & Dual Audit Trail Recording (Priority: P1)

**Goal**: Atomically register the product into active catalog state, record an initial inbound stock movement log (`ADJ-XXXX`) when `stock > 0`, record an administrative audit entry (`AUD-XXXX`), and update UI views in `< 50ms`.  
**Independent Test**: Submit a valid new part with stock 10; confirm the part appears at the top of the catalog table, stock adjustment logs contain `+10 Units` inbound record, and audit logs record creation.

### Implementation for User Story 4
- [X] T015 [P] [US4] Implement registerProduct store action with SKU collision guard, product prepending, conditional inbound restock log generation, and audit log generation in lib/store/inventory-store.ts
- [X] T016 [US4] Connect modal submission to registerProduct and display success notification toast in components/admin/inventory/inventory-catalog.tsx

**Checkpoint**: Full end-to-end registration lifecycle functional with dual audit trail logging.

---

## Phase 7: User Story 5 - Physical Shelf Locator Assignment & Motorcycle Fitment Linking (Priority: P2)

**Goal**: Link newly registered parts to physical warehouse coordinates (Rack/Shelf) and target motorcycle models for instant warehouse navigation and MotoMatcher compatibility.  
**Independent Test**: Register a part with shelf location `Rack A-02 / Shelf 1` and motorcycle model `Yamaha Aerox 155`; verify location badge and model tag render accurately in the catalog table.

### Implementation for User Story 5
- [X] T017 [P] [US5] Implement warehouse shelf location input with placeholder guidance in components/admin/inventory/product-registration-modal.tsx
- [X] T018 [US5] Add motorcycle model selector and ensure newly registered products render locator badges and compatibility tags in components/admin/inventory/catalog-table.tsx

**Checkpoint**: Physical shelf location and vehicle fitment metadata established for incoming inventory.

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Validation gates, type safety, test execution, and SWIFT design tokens compliance.

- [X] T019 [P] Run automated unit test suite with npm test
- [X] T020 [P] Run TypeScript verification with npx tsc --noEmit
- [X] T021 [P] Audit modal and catalog components for 100% SWIFT semantic design tokens compliance in app/globals.css and lib/tokens.ts
- [X] T022 Validate end-to-end browser workflows against specs/010-new-product-registration/quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Complete.
- **Foundational (Phase 2)**: Complete.
- **User Story 1 (Phase 3)**: Complete.
- **User Story 2 (Phase 4)**: Complete.
- **User Story 3 (Phase 5)**: Complete.
- **User Story 4 (Phase 6)**: Complete.
- **User Story 5 (Phase 7)**: Complete.
- **Polish (Phase 8)**: Complete.

### Verification Summary
- **Unit Tests**: 42 passing (100% pass rate) across `product-registration.test.ts`, `stock-adjustment.test.ts`, `shelf-location.test.ts`, and `catalog-filter.test.ts`
- **TypeScript**: 0 compilation errors (`tsc --noEmit`)
- **ESLint**: 0 errors, 0 warnings across all project files (`npm run lint`)
- **Design Tokens**: 100% semantic token compliance (`bg-bg-surface`, `bg-bg-input`, `bg-primary`, `border-border`, etc.)
