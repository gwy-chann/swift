# Implementation Tasks: Supabase Realtime Fitment Updates & Stock Alert Broadcast for Floor Terminals

**Feature**: `025-motomatcher-realtime-stock-sync`  
**Branch**: `feat/SIAA-55-motomatcher-realtime-stock-sync`  
**Jira Issue**: [SIAA-55](https://the-three-devsketeers.atlassian.net/browse/SIAA-55) (STORY-4.8)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## Phase 1: Setup & Foundational Publication Migration

- [ ] T001 [US1] Create Supabase migration in `supabase/migrations/20261017000000_motomatcher_realtime.sql` registering `public.product_fitments` and `public.products` to `supabase_realtime` publication with `REPLICA IDENTITY FULL`.

---

## Phase 2: Domain Models & Hook Architecture (US1, US2)

- [ ] T002 [P] [US1] Define `UseMotoMatcherRealtimeOptions` and `UseMotoMatcherRealtimeResult` contracts in `lib/types/motomatcher.ts`.
- [ ] T003 [P] [US1] Create comprehensive unit tests in `lib/hooks/__tests__/use-motomatcher-realtime.test.ts` asserting channel subscription, event dispatching, and fallback handling.
- [ ] T004 [US1] Implement `useMotoMatcherRealtime(activeModelId, options)` hook in `lib/hooks/use-motomatcher-realtime.ts` listening to `motomatcher-matrix` (and `realtime:products`).
- [ ] T005 [US2] Connect `useMotoMatcherRealtime` payload handling with `inventoryStore.updateProduct()` and trigger alert callbacks on low-stock/out-of-stock transitions.

---

## Phase 3: Staff Floor Terminal UI Integration (US2, US4)

- [ ] T006 [US2] Mount `useMotoMatcherRealtime` and render live connection status indicator in `app/staff/compat/page.tsx`.
- [ ] T007 [US2] Update part cards in `app/staff/compat/page.tsx` to render dynamic stock badges:
  - In Stock: `bg-success-light text-success border-success/20`
  - Low Stock: `bg-accent-light text-accent border-accent/20`
  - Out of Stock: `<span class="badge badge-danger">Out of Stock</span>` (`bg-danger-light text-danger border-danger/20 badge badge-danger`).
- [ ] T008 [US2] Disable the 1-click "Add to POS" button and display "Out of Stock" state when part stock is `<= 0` in `app/staff/compat/page.tsx`.

---

## Phase 4: Silent Reconnection & Cache Invalidation (US3)

- [ ] T009 [US3] Implement automatic re-hydration and cache invalidation upon channel re-subscription in `lib/hooks/use-motomatcher-realtime.ts`.
- [ ] T010 [US3] Add unit test in `lib/hooks/__tests__/use-motomatcher-realtime.test.ts` verifying channel recovery and re-sync trigger after network restoration.

---

## Phase 5: Verification & Architectural Convergence

- [ ] T011 Run static typecheck (`npx tsc --noEmit`) and verify zero TypeScript compiler errors.
- [ ] T012 Run Jest test suite (`npm test -- lib/hooks` and `npm test -- lib/motomatcher`) and confirm all tests pass.
- [ ] T013 Verify SWIFT design tokens compliance (zero hardcoded hex/RGB values).
