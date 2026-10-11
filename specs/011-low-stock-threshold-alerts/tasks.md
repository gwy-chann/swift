# Implementation Tasks: Automated Low-Stock Threshold Detection & Floor Restock Alerts

**Feature**: `SIAA-17` | **Branch**: `feat/SIAA-17-low-stock-threshold-alerts` | **Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)

---

## Phase 1: Setup (Contracts & Types)

**Purpose**: Establish contract definitions and TypeScript interfaces for threshold alerts and inventory aggregation.

- [ ] T001 Export contracts and type definitions for stock threshold status, catalog stats, and filter criteria in `lib/inventory/catalog-filter.ts` and `specs/011-low-stock-threshold-alerts/contracts/threshold-alerts-contracts.ts`

---

## Phase 2: Foundational (Core Evaluation Engine & Domain Tests)

**Purpose**: Core mathematical aggregation, status classification, and unit tests that block all UI features.

**⚠️ CRITICAL**: Foundational calculations must be verified before user story components are wired.

- [ ] T002 [P] Update unit tests in `lib/inventory/__tests__/catalog-filter.test.ts` to assert `totalUnitsOnHand`, low-stock threshold detection (`stock <= minThreshold`), and `lowStockOnly` filtering
- [ ] T003 Implement `getStockHealthStatus`, updated `calculateCatalogStats` (computing `totalUnitsOnHand`), and quick-filter predicate logic in `lib/inventory/catalog-filter.ts`

**Checkpoint**: Core calculation and filter engine verified passing with unit tests.

---

## Phase 3: User Story 1 - Dynamic Visual Badging for Low-Stock & Out-of-Stock Items (Priority: P1) 🎯 MVP

**Goal**: Products at or below minimum safety stock render prominent, high-contrast badges (`Low: X left (Min Y)`), zero-stock items display `Out of Stock`, and healthy items display `X in stock`.

**Independent Test**: Load the parts catalog table and verify each stock condition renders the correct badge styling and copy without requiring other features.

### Implementation for User Story 1

- [ ] T004 [P] [US1] Create reusable `<StockBadge>` component with high-contrast SWIFT design tokens and accessible ARIA attributes in `components/inventory/stock-badge.tsx`
- [ ] T005 [US1] Integrate `<StockBadge>` into the parts catalog table rows in `components/admin/inventory/catalog-table.tsx`

**Checkpoint**: User Story 1 complete — all catalog items display dynamic, accessible stock status badges.

---

## Phase 4: User Story 2 - Real-Time Inventory Summary Operational Health Metrics (Priority: P2)

**Goal**: Top-level operational summary cards on `/admin/inventory` display Total Active SKUs, Total Units on Hand, Critical Low Stock Items count, and Total Valuation in ₱.

**Independent Test**: View `/admin/inventory` header cards and confirm the 4 metric cards match catalog aggregates and update dynamically upon stock mutations.

### Implementation for User Story 2

- [ ] T006 [US2] Update `components/admin/inventory/inventory-stats-cards.tsx` to render the 4 canonical operational health cards (Total SKUs, Total Units on Hand, Critical Low Stock, Total Valuation)
- [ ] T007 [US2] Wire live aggregated catalog stats into `InventoryStatsCards` within `components/admin/inventory/inventory-catalog.tsx`

**Checkpoint**: User Stories 1 and 2 functional — catalog badging and summary metric cards operate in real-time.

---

## Phase 5: User Story 3 - Quick-Filter Reorder Workflow for Depleted Inventory (Priority: P3)

**Goal**: Provide a dedicated "Low Stock Alerts" quick-filter toggle button on the catalog toolbar to instantly isolate purchase order candidates.

**Independent Test**: Click "Low Stock Alerts" and verify only depleted items (`stock <= minThreshold`) remain visible, composing cleanly with search queries and category filters.

### Implementation for User Story 3

- [ ] T008 [US3] Add "Low Stock Alerts" quick-filter toggle button with alert badge count to `components/admin/inventory/catalog-filter-bar.tsx`
- [ ] T009 [US3] Connect `lowStockOnly` quick-filter state and compose filter predicates in `components/admin/inventory/inventory-catalog.tsx`

**Checkpoint**: User Stories 1, 2, and 3 functional — streamlined reorder workflow is operational.

---

## Phase 6: User Story 4 - Point-of-Sale Depletion Warnings & Zero-Stock Protection (Priority: P4)

**Goal**: POS terminal displays stock availability badges, warns on low-stock items, and prevents adding zero-stock items without authorized manager override.

**Independent Test**: On `/staff/pos`, verify out-of-stock items have disabled add buttons and manager override dialog/toggle, while low-stock items display advisory badges.

### Implementation for User Story 4

- [ ] T010 [P] [US4] Create manager override modal/confirmation helper for out-of-stock POS items in `components/staff/pos/manager-override-modal.tsx`
- [ ] T011 [US4] Integrate `<StockBadge>`, out-of-stock add prevention, and manager override logic into `app/staff/pos/page.tsx`

**Checkpoint**: All 4 user stories complete across Admin and Staff portals.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Token audit, linting, type-checking, and end-to-end quickstart validation.

- [ ] T012 [P] Verify zero hardcoded colors and token compliance against `@/lib/tokens.ts` across all modified components
- [ ] T013 Run automated unit tests (`npm test`), TypeScript verification (`npx tsc --noEmit`), and linting (`npm run lint`)
- [ ] T014 Execute interactive walkthrough following `specs/011-low-stock-threshold-alerts/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — starts immediately.
- **Foundational (Phase 2)**: Depends on Setup (Phase 1) — blocks all user stories.
- **User Stories (Phases 3–6)**: Depend on Foundational (Phase 2) completion.
  - Can proceed sequentially in priority order (P1 → P2 → P3 → P4) or in parallel across isolated components.
- **Polish (Phase 7)**: Depends on completion of all user story tasks.

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Phase 2 — establishes the base `<StockBadge>` component.
- **User Story 2 (P2)**: Can start after Phase 2 — depends on `CatalogStats` calculation from Phase 2.
- **User Story 3 (P3)**: Can start after Phase 2 — connects quick-filter toggle to catalog filter predicates.
- **User Story 4 (P4)**: Can start after User Story 1 (reuses `<StockBadge>` in POS view).

---

## Parallel Opportunities

- **T002** (Unit tests) and **T004** (`<StockBadge>` component) can be prepared in parallel.
- **T006** (`InventoryStatsCards`) and **T008** (`CatalogFilterBar`) touch different files and can be styled in parallel once Phase 2 is complete.
- **T010** (Manager override modal) can be built in parallel with POS integration **T011**.

---

## Implementation Strategy (MVP First)

1. **Phase 1 & Phase 2**: Build contracts, test cases, and calculation predicates.
2. **Phase 3 (MVP)**: Build `<StockBadge>` and integrate into `catalog-table.tsx`. Validate independently.
3. **Phase 4**: Add 4 summary KPI stat cards to `/admin/inventory`.
4. **Phase 5**: Add "Low Stock Alerts" quick-filter toggle button.
5. **Phase 6**: Add POS zero-stock guards and manager override.
6. **Phase 7**: Run full verification suite (`npm test`, `npx tsc --noEmit`, `npm run lint`).
