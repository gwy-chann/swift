# Implementation Tasks: Supabase Master Parts Catalog Schema, Indexes, RLS & Baseline Seed Data

**Feature**: Supabase Master Parts Catalog Schema, Indexes, RLS & Baseline Seed Data ([SIAA-45](https://the-three-devsketeers.atlassian.net/browse/SIAA-45))  
**Branch**: `feat/SIAA-45-parts-catalog-schema-seed` | **Date**: 2026-10-11  
**Specification**: [`specs/012-parts-catalog-schema-seed/spec.md`](spec.md) | **Plan**: [`specs/012-parts-catalog-schema-seed/plan.md`](plan.md)  

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project database migration directory initialization and TypeScript domain types baseline.

- [X] T001 Ensure Supabase configuration and migration directory structure exist in `supabase/config.toml`
- [X] T002 [P] Update domain product types and interfaces to support database timestamps and ID in `lib/types/product.ts`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core PostgreSQL types, products table definition, and updated_at trigger required by all user stories.

**⚠️ CRITICAL**: No user story tasks can begin until this foundational schema phase is complete.

- [X] T003 Create core database migration file establishing `public.products` table with UUID primary key and column constraints in `supabase/migrations/20261010000000_inventory_products.sql`
- [X] T004 [P] Implement automated timestamp trigger function `update_products_updated_at()` and bind `BEFORE UPDATE` trigger on `public.products` in `supabase/migrations/20261010000000_inventory_products.sql`

**Checkpoint**: Core database schema and automatic timestamp triggers ready — user story implementation can proceed.

---

## Phase 3: User Story 1 - Idempotent Master Parts Catalog Schema & Index Provisioning (Priority: P1) 🎯 MVP

**Goal**: Deliver idempotent, high-performance catalog schema with B-tree indexes across SKU, category, brand, model, and location.

**Independent Test**: Apply migration against Supabase database and verify table creation and index generation with sub-50ms query execution.

### Implementation for User Story 1

- [X] T005 [US1] Define B-tree indexes (`idx_products_sku`, `idx_products_category`, `idx_products_brand`, `idx_products_model`, `idx_products_location`) in `supabase/migrations/20261010000000_inventory_products.sql`
- [X] T006 [US1] Add table check constraints for non-negative values (`cost >= 0`, `wholesale >= 0`, `retail >= 0`, `stock >= 0`, `min_threshold >= 0`) in `supabase/migrations/20261010000000_inventory_products.sql`

**Checkpoint**: Database schema and B-tree indexes are established idempotently and testable independently.

---

## Phase 4: User Story 2 - Canonical Baseline Motorcycle Parts Seeding (Priority: P1)

**Goal**: Populate all 12 canonical motorcycle parts from `mockup/app.js` with exact physical rack/shelf locations and pricing markups.

**Independent Test**: Execute `supabase/seed.sql` and verify all 12 baseline items exist with 0 duplicate key errors on repeated runs.

### Implementation for User Story 2

- [X] T007 [US2] Implement idempotent seed script for the 12 canonical motorcycle parts using `INSERT INTO public.products ... ON CONFLICT (sku) DO NOTHING` in `supabase/seed.sql`
- [X] T008 [P] [US2] Verify attribute fidelity (shelf locators, prices, fitment models) for all 12 seed parts against `mockup/app.js` in `supabase/seed.sql`

**Checkpoint**: Canonical motorcycle parts exist with exact shelf locators and can be queried immediately.

---

## Phase 5: User Story 3 - Role-Based Row-Level Security & Tamper Protection (Priority: P2)

**Goal**: Enforce strict Row-Level Security permitting public read access while restricting update and deletion to users with `admin` role.

**Independent Test**: Query and mutate `public.products` as `anon`, `staff`, and `admin` roles, verifying that unauthorized writes are rejected.

### Implementation for User Story 3

- [X] T009 [US3] Enable Row-Level Security on `public.products` in `supabase/migrations/20261010000000_inventory_products.sql`
- [X] T010 [P] [US3] Configure public SELECT read policy (`Allow public read access on products`) in `supabase/migrations/20261010000000_inventory_products.sql`
- [X] T011 [US3] Configure admin-only ALL policy (`Allow admin full access on products`) using scalar subquery on `public.profiles` in `supabase/migrations/20261010000000_inventory_products.sql`

**Checkpoint**: RLS policies enforce public read and protect parts costs and SKUs from non-admin modification.

---

## Phase 6: User Story 4 - Object-Relational Model & Server-Side Data Hydration (Priority: P2)

**Goal**: Synchronize Prisma ORM schema and deliver pre-fetched catalog data via server component with client store hydration.

**Independent Test**: Validate schema with `npx prisma validate` and verify that the admin inventory page loads pre-rendered products with sub-100ms client search.

### Implementation for User Story 4

- [X] T012 [P] [US4] Add `Product` model to `prisma/schema.prisma` mapped to `public.products` with indexes and snake_case column mapping in `prisma/schema.prisma`
- [X] T013 [US4] Run Prisma schema validation (`npx prisma validate`) and generate updated client types (`npx prisma generate`) in `prisma/schema.prisma`
- [X] T014 [US4] Implement `getProductsAction()` server action querying catalog items with mock fallback in `lib/admin/product-actions.ts`
- [X] T015 [US4] Implement `hydrateProducts()` method in `InventoryStore` to initialize client state from server payload in `lib/store/inventory-store.ts`
- [X] T016 [US4] Update `app/admin/inventory/page.tsx` to pre-fetch products on server and pass `initialProducts` to `<InventoryCatalog />`
- [X] T017 [US4] Update `<InventoryCatalog />` in `components/admin/inventory/inventory-catalog.tsx` to accept `initialProducts` and hydrate `InventoryStore` on mount

**Checkpoint**: Prisma ORM schema aligns 1:1 with database, and Admin Inventory page hydrates with pre-fetched server catalog data.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Verification, linting, and end-to-end integration across all stories.

- [X] T018 [P] Verify documentation links and verification commands in `specs/012-parts-catalog-schema-seed/quickstart.md`
- [X] T019 Run TypeScript type verification (`npx tsc --noEmit`) to verify 0 type errors across all updated components
- [X] T020 Run linting (`npm run lint`) to ensure zero formatting or static analysis regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - starts immediately
- **Foundational (Phase 2)**: Depends on Phase 1 completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: Depend on Foundational phase completion
  - **US1 (Schema & Indexes)**: Foundational schema tasks
  - **US2 (Seed Data)**: Depends on US1 schema existing
  - **US3 (RLS Policies)**: Can be written concurrently in migration or right after US1
  - **US4 (ORM & Hydration)**: Depends on US1/US2 database definition and Prisma alignment
- **Polish (Phase 7)**: Depends on completion of all user story implementations

### Parallel Opportunities

- T002 (`lib/types/product.ts`) can run in parallel with T001
- T004 (`update_products_updated_at()`) can run in parallel with T003
- T008 (Seed verification) can run in parallel with T007
- T010 (Public read policy) can run in parallel with T009
- T012 (`prisma/schema.prisma`) can run in parallel with T010/T011
- T018 (`quickstart.md`) can run in parallel with Polish checks

---

## Implementation Strategy

### MVP First (User Story 1 & 2)
1. Complete Setup (Phase 1) and Foundational (Phase 2)
2. Complete User Story 1 (Schema, Constraints, Indexes)
3. Complete User Story 2 (12-item Baseline Seeding)
4. Verify database reset and seed population cleanly

### Incremental Delivery
1. Foundation + US1 + US2: Persistent, seeded catalog in PostgreSQL
2. Add US3: RLS security boundary protection
3. Add US4: Prisma ORM synchronization and Next.js Server Component hydration
4. Polish: Verify static typing, linting, and sub-100ms client search responsiveness
