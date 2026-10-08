# Tasks Breakdown: Physical Rack & Shelf Locator Mapping (SIAA-14)

## Phase 1: Setup & Contracts
- [x] T001: [contracts] Define shelf locator contracts in `contracts/shelf-locator-contracts.ts` (Done)

## Phase 2: Domain Utilities & Tests (TDD)
- [x] T002: [tests] Create unit test suite `lib/inventory/__tests__/shelf-location.test.ts` testing assigned and unassigned locations
- [x] T003: [feat] Implement `parseShelfLocation` and formatting in `lib/inventory/shelf-location.ts`
- [x] T004: [feat] Update `filterCatalogProducts` in `lib/inventory/catalog-filter.ts` to support unassigned search keyword

## Phase 3: UI Components & Integration
- [x] T005: [feat] Implement `<ShelfLocationTag>` component in `components/inventory/shelf-location-tag.tsx`
- [x] T006: [feat] Update `components/admin/inventory/catalog-table.tsx` to render `<ShelfLocationTag>`
- [x] T007: [mock] Add unassigned product sample to `lib/mock-data/products.ts`

## Phase 4: Verification & Convergence
- [x] T008: [verify] Run unit tests and typecheck (`npm test`, `npx tsc --noEmit`)
- [x] T009: [docs] Mark all tasks complete and prepare atomic commits
