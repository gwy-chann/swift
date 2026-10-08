# Tasks Breakdown: Interactive Stock Adjustment Engine (SIAA-15)

## Phase 1: Setup & Contracts
- [x] T001: [contracts] Define contracts in `contracts/stock-adjustment-contracts.ts` (Done)

## Phase 2: Domain Utilities & Tests (TDD)
- [x] T002: [tests] Create unit test suite `lib/inventory/__tests__/stock-adjustment.test.ts`
- [x] T003: [feat] Implement adjustment calculation helper in `lib/inventory/stock-adjustment.ts`

## Phase 3: UI Components & Modal
- [x] T004: [feat] Create `<StockAdjustmentModal>` in `components/admin/inventory/stock-adjustment-modal.tsx`
- [x] T005: [feat] Wire modal state into `components/admin/inventory/inventory-catalog.tsx`

## Phase 4: Verification & Convergence
- [x] T006: [verify] Run unit tests and typecheck (`npm test`, `npx tsc --noEmit`)
- [x] T007: [docs] Mark tasks complete and prepare atomic commits
