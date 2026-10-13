# Tasks: MotoMatcher Server Actions, Invalidation & 1-Click Fast-Lane Cart Wiring

**Feature**: `025-motomatcher-server-actions-cart-wiring`  
**Ticket**: [SIAA-58](https://the-three-devsketeers.atlassian.net/browse/SIAA-58)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4)  

---

## Phase 1: Contracts & Domain Models

- [ ] **Task 1.1**: Define and export `FitmentMatrixActionResult` and `AddFitmentRuleInput` in `lib/types/motomatcher.ts` and verify contracts in `specs/025-motomatcher-server-actions-cart-wiring/contracts/`.

---

## Phase 2: Cart Store Extension & Invariant Tests (TDD)

- [ ] **Task 2.1**: Create unit test suite `lib/store/__tests__/cart-store-motomatcher.test.ts` covering `addItem` with `MotoMatcherMatrixPart`, stock guard, and `useCartStore.getState().addItem`.
- [ ] **Task 2.2**: Implement `addItem` on `CartStore` and attach `useCartStore.getState = cartStore.getState` in `lib/store/cart-store.ts`.

---

## Phase 3: Server Actions Suite & Cache Invalidation (TDD)

- [ ] **Task 3.1**: Create unit test suite `lib/motomatcher/__tests__/server-actions.test.ts` covering `getMotorcycleModelsAction`, `getFitmentMatrixAction` `{ success: true, data }` envelope, and `addFitmentRuleAction`.
- [ ] **Task 3.2**: Implement Next.js caching with tag `['motomatcher-models']`, envelope response in `getFitmentMatrixAction`, and `addFitmentRuleAction` with `revalidateTag('motomatcher-matrix')` in `lib/motomatcher/actions.ts`.

---

## Phase 4: UI Wiring & 1-Click Fast-Lane Cart Integration

- [ ] **Task 4.1**: Wire 1-click cart insertion, out-of-stock guard, and shelf locator toast into `app/admin/motomatcher/admin-motomatcher-client.tsx`.
- [ ] **Task 4.2**: Wire dynamic models, 1-click cart insertion, out-of-stock guard, and shelf locator toast into `app/staff/compat/page.tsx`.

---

## Phase 5: Verification & Convergence

- [ ] **Task 5.1**: Execute automated unit tests and verify all pass cleanly.
- [ ] **Task 5.2**: Validate zero hardcoded colors and finalize all tasks in `tasks.md`.
