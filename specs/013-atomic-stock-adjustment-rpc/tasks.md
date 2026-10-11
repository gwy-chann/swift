# Implementation Tasks: Supabase Atomic Stock Adjustment RPC & Immutable Audit Ledger

**Feature**: Supabase Atomic Stock Adjustment RPC & Immutable Audit Ledger ([SIAA-46](https://the-three-devsketeers.atlassian.net/browse/SIAA-46))  
**Branch**: `feat/SIAA-46-atomic-stock-adjustment-rpc` | **Date**: 2026-10-11  
**Specification**: [`specs/013-atomic-stock-adjustment-rpc/spec.md`](spec.md) | **Plan**: [`specs/013-atomic-stock-adjustment-rpc/plan.md`](plan.md)  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish domain TypeScript types and ORM schema foundation for stock adjustments and audit logging.

- [X] T001 [P] Define stock adjustment domain interfaces, payload types, and result types in `lib/types/stock-adjustment.ts`
- [X] T002 [P] Update Prisma schema with `StockAdjustmentLog` model and relation to `Product` in `prisma/schema.prisma`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core PostgreSQL table definition, relational constraints, performance indexes, and ORM type generation.

**⚠️ CRITICAL**: No user story implementation can begin until this foundational database schema phase is complete.

- [X] T003 Create database migration file defining `public.stock_adjustment_logs` table with column constraints and foreign keys in `supabase/migrations/20261011000000_stock_adjustment_rpc.sql`
- [X] T004 [P] Add B-tree performance indexes on `sku`, `created_at DESC`, and `user_id` in `supabase/migrations/20261011000000_stock_adjustment_rpc.sql`
- [X] T005 Validate Prisma schema with `npx prisma validate` and generate client types with `npx prisma generate` in `prisma/schema.prisma`

**Checkpoint**: Foundation ready — database ledger table and ORM bindings established.

---

## Phase 3: User Story 1 - Atomic Stock Modification with Zero-Floor Enforcement (Priority: P1) 🎯 MVP

**Goal**: Deliver the atomic `public.adjust_product_stock` stored procedure executing row-level locking (`FOR UPDATE`), non-negative inventory enforcement (`INSUFFICIENT_STOCK`), product mutation, and ledger insertion in a single transaction.

**Independent Test**: Execute RPC function via SQL or Supabase client; confirm positive restock updates product and appends log, while over-deduction throws `INSUFFICIENT_STOCK` leaving inventory completely unchanged.

### Implementation for User Story 1

- [X] T006 [US1] Implement `public.adjust_product_stock` PL/pgSQL function with parameter validation and pessimistic row locking (`FOR UPDATE`) on target SKU in `supabase/migrations/20261011000000_stock_adjustment_rpc.sql`
- [X] T007 [US1] Implement non-negative stock check throwing `INSUFFICIENT_STOCK (P0001)` when `stock + p_delta < 0` in `supabase/migrations/20261011000000_stock_adjustment_rpc.sql`
- [X] T008 [US1] Implement atomic `UPDATE public.products` and `INSERT INTO public.stock_adjustment_logs` returning structured JSON in `supabase/migrations/20261011000000_stock_adjustment_rpc.sql`
- [X] T009 [US1] Grant execute permissions on `public.adjust_product_stock` to `authenticated` and `service_role` in `supabase/migrations/20261011000000_stock_adjustment_rpc.sql`

**Checkpoint**: At this point, User Story 1 delivers an independently testable, atomic zero-floor stock adjustment stored procedure in PostgreSQL.

---

## Phase 4: User Story 2 - Tamper-Proof Immutable Audit Ledger with Staff Attribution (Priority: P1)

**Goal**: Guarantee immutable append-only ledger properties via RLS and triggers, while cryptographically binding operator attribution to `auth.uid()`.

**Independent Test**: Attempt direct `UPDATE` or `DELETE` queries on `stock_adjustment_logs` to verify `TAMPER_FORBIDDEN (55000)` rejection; verify audit rows record the operator's actual user ID and name.

### Implementation for User Story 2

- [X] T010 [US2] Implement anti-tamper trigger function `prevent_stock_adjustment_log_tampering()` raising `TAMPER_FORBIDDEN (55000)` on any `UPDATE` or `DELETE` attempt in `supabase/migrations/20261011000000_stock_adjustment_rpc.sql`
- [X] T011 [P] [US2] Configure Row Level Security (RLS) on `public.stock_adjustment_logs` granting `SELECT` and `INSERT` to authenticated sessions while strictly revoking `UPDATE` and `DELETE` in `supabase/migrations/20261011000000_stock_adjustment_rpc.sql`
- [X] T012 [US2] Wire non-repudiation `auth.uid()` extraction and user profile name lookup inside `adjust_product_stock` in `supabase/migrations/20261011000000_stock_adjustment_rpc.sql`

**Checkpoint**: User Stories 1 and 2 combine to provide a rock-solid, tamper-proof atomic adjustment backend.

---

## Phase 5: User Story 3 - Immediate User Interface Feedback with Optimistic Rollback (Priority: P2)

**Goal**: Connect `StockAdjustmentModal` to a Next.js Server Action invoking the Supabase RPC, updating the catalog badge immediately (<16ms) with automated rollback and danger alert toast if the transaction fails.

**Independent Test**: Confirm an adjustment in the UI and verify sub-16ms badge update; test an excessive reduction and verify instant rollback to previous stock with an error alert toast.

### Implementation for User Story 3

- [X] T013 [US3] Implement `adjustProductStockAction` Server Action with Supabase RPC invocation and graceful mock fallback in `lib/admin/product-actions.ts`
- [X] T014 [P] [US3] Enhance `adjustStock` in `InventoryStore` to record transaction snapshots and support atomic rollback mutations in `lib/store/inventory-store.ts`
- [X] T015 [US3] Wire `handleConfirmAdjustment` in `components/admin/inventory/inventory-catalog.tsx` to apply optimistic store updates, invoke `adjustProductStockAction`, and execute rollback on error
- [X] T016 [P] [US3] Update `StockAdjustmentModal` in `components/admin/inventory/stock-adjustment-modal.tsx` to handle submitting state, error feedback, and non-zero validation

**Checkpoint**: Complete end-to-end user experience functional with instant optimistic UI and safe rollback protection.

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Test coverage, static analysis verification, and end-to-end validation.

- [X] T017 [P] Create unit test suite for `adjustProductStockAction` and store rollback handling in `lib/inventory/__tests__/stock-adjustment-rpc.test.ts`
- [X] T018 Run TypeScript compilation check (`npx tsc --noEmit`) to verify zero type errors
- [X] T019 Run project linting (`npm run lint`) to ensure zero formatting or style regressions
- [X] T020 Validate end-to-end scenarios per `specs/013-atomic-stock-adjustment-rpc/quickstart.md`

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: Can start immediately — no prerequisites.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories.
- **User Story 1 (Phase 3 - P1)**: Depends on Phase 2 completion. Delivers core atomic stored procedure.
- **User Story 2 (Phase 4 - P1)**: Depends on Phase 2 & Phase 3. Adds immutability triggers, RLS, and `auth.uid()` attribution.
- **User Story 3 (Phase 5 - P2)**: Depends on Phase 3 & 4 backend contracts. Delivers Server Action, store rollback, and UI wiring.
- **Polish (Phase 6)**: Depends on all user story implementations being completed.

### Parallel Opportunities

- **Phase 1**: T001 (`types/stock-adjustment.ts`) and T002 (`prisma/schema.prisma`) can run in parallel.
- **Phase 2**: T004 (B-Tree indexes) can be written alongside T003 table definition.
- **Phase 4**: T011 (RLS policies) can run in parallel with T010 trigger function.
- **Phase 5**: T014 (`inventory-store.ts`) and T016 (`stock-adjustment-modal.tsx`) can be developed in parallel with T013 (`product-actions.ts`).
- **Phase 6**: T017 (Unit tests) can run in parallel with documentation checks.

---

## Implementation Strategy

### MVP First (User Story 1 & 2 Backend Engine)
1. Complete Phase 1 (Setup) & Phase 2 (Foundational Schema).
2. Complete Phase 3 (Atomic RPC Procedure) & Phase 4 (Immutability & RLS).
3. **STOP and VALIDATE**: Test RPC directly via SQL assertions in `quickstart.md`.

### Incremental Delivery (Full Stack Integration)
1. Layer on Phase 5 (Server Action, Optimistic UI, and Rollback).
2. Validate UI with both valid restocks and simulated insufficient stock scenarios.
3. Complete Phase 6 (Automated unit tests, TypeScript verification, linting).
