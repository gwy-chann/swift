# Implementation Tasks: Supabase New Product Registration Server Action & SKU Uniqueness

**Feature**: Supabase New Product Registration Server Action & SKU Uniqueness ([SIAA-47](https://the-three-devsketeers.atlassian.net/browse/SIAA-47))  
**Branch**: `feat/SIAA-47-supabase-new-product-registration` | **Date**: 2026-10-11  
**Specification**: [`specs/014-supabase-new-product-registration/spec.md`](spec.md) | **Plan**: [`specs/014-supabase-new-product-registration/plan.md`](plan.md)  

---

## Phase 1: Setup & Foundational (Blocking Prerequisites)

**Purpose**: Database schema enhancement for case-insensitive SKU uniqueness and TypeScript contract definitions.

- [x] T001 [P] Create database migration `supabase/migrations/20261012000000_product_sku_unique_ci.sql` defining case-insensitive functional unique index `idx_products_sku_lower` on `public.products(LOWER(sku))`
- [x] T002 [P] Export `CreateProductPayload`, `CreateProductResult`, and `CreateProductErrorCode` types in `lib/admin/product-actions.ts` and ensure compatibility with domain `Product` types

---

## Phase 2: User Story 1 - Duplicate SKU Collision Guard & Validation (Priority: P1) 🎯 MVP

**Goal**: Implement `createProductAction` in `lib/admin/product-actions.ts` with strict field validation, SKU normalization, and case-insensitive duplicate SKU collision checks returning `SKU_ALREADY_EXISTS`.

**Independent Test**: Invoke `createProductAction` with existing SKU (in uppercase or lowercase); verify it rejects with `SKU_ALREADY_EXISTS` without altering the database.

- [x] T003 [US1] Implement input boundary validation in `createProductAction` (positive cost, positive wholesale/retail prices, integer stock, non-empty text fields) in `lib/admin/product-actions.ts`
- [x] T004 [US1] Implement case-insensitive duplicate SKU lookup against Supabase `products` and Prisma fallback in `lib/admin/product-actions.ts`
- [x] T005 [US1] Return structured `{ success: false, error: 'Product with SKU "..." already exists in the catalog.', code: 'SKU_ALREADY_EXISTS' }` on duplicate detection in `lib/admin/product-actions.ts`

---

## Phase 3: User Story 2 - Atomic Creation with Initial Inbound Stock Log (Priority: P1)

**Goal**: Persist new product record to `public.products` and, if initial stock > 0, atomically insert an initial inbound audit record into `public.stock_adjustment_logs`.

**Independent Test**: Register a product with initial stock 10; verify both the product record and the initial inbound audit log (delta +10, prev 0, new 10, type 'restock') are written.

- [x] T006 [US2] Implement Supabase insertion into `public.products` with normalized fields, timestamps, and default markups in `lib/admin/product-actions.ts`
- [x] T007 [US2] Implement conditional insertion into `public.stock_adjustment_logs` when initial stock > 0 (setting `adjustment_type: 'restock'`, `quantity_delta: stock`, `previous_stock: 0`, `new_stock: stock`, `reason: 'Initial inventory registration'`) in `lib/admin/product-actions.ts`
- [x] T008 [US2] Implement Prisma fallback transaction in `lib/admin/product-actions.ts` for offline/local development ensuring identical atomic behavior

---

## Phase 4: User Story 3 - Server Action Revalidation & Real-Time Store Sync (Priority: P2)

**Goal**: Wire server action revalidation (`revalidatePath('/admin/inventory')`) and connect UI (`NewProductModal`, `InventoryCatalog`, and `app/admin/inventory/page.tsx`) to prepend the new product into `InventoryStore`.

**Independent Test**: Click `+ Add Part` in inventory view, submit a new product, observe instant store prepending, success toast, and modal closing.

- [x] T009 [US3] Add `revalidatePath('/admin/inventory')` invocation inside `createProductAction` upon successful creation in `lib/admin/product-actions.ts`
- [x] T010 [P] [US3] Export `NewProductModal` as named alias in `components/admin/inventory/product-registration-modal.tsx` and wire submission loading state and error handling
- [x] T011 [US3] Update `InventoryCatalog` in `components/admin/inventory/inventory-catalog.tsx` to invoke `createProductAction`, prepend the created product to `useInventoryStore`, and display feedback toasts
- [x] T012 [P] [US3] Ensure `+ Add Part` button in `app/admin/inventory/page.tsx` and `CatalogFilterBar` seamlessly opens `NewProductModal`

---

## Phase 5: Verification, Tests & Polish

**Purpose**: Automated test suite, type checking, linting, and constitution validation.

- [x] T013 Create unit and integration test suite `__tests__/lib/admin/product-actions.test.ts` validating duplicate collision guard, atomic inbound log, and validation errors
- [x] T014 Run TypeScript compilation (`npm run typecheck`) to verify zero type regressions
- [x] T015 Run ESLint (`npm run lint`) to ensure clean code standards and no lint errors
- [x] T016 Run Jest test suite (`npm test`) to guarantee all tests pass
