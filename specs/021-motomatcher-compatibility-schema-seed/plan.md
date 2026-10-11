# Implementation Plan: Motorcycle Models & Fitment Compatibility Matrix

**Feature**: `021-motomatcher-compatibility-schema-seed`  
**Jira Ticket**: [SIAA-53](https://the-three-devsketeers.atlassian.net/browse/SIAA-53) (STORY-4.6)  

---

## 1. Technical Objectives

1. **SQL Migration (`supabase/migrations/20261011000000_motomatcher_compatibility.sql`)**:
   - Create `public.motorcycle_models` with strict data constraints and unique key `(make, model, year_start)`.
   - Create `public.product_fitments` with foreign keys referencing `products(id)` and `motorcycle_models(id)` with `ON DELETE CASCADE`.
   - Create B-tree indexes for fast querying.
   - Implement RLS policies (open SELECT, admin-only write).
2. **Seed Data (`supabase/seed.sql`)**:
   - Seed the 5 canonical motorcycle models (Yamaha NMAX 155, Yamaha Aerox 155, Honda Click 125i/150i, Honda ADV 160, Suzuki Raider 150 Fi).
   - Seed the 12 compatibility rules into `public.product_fitments` matching `mockup/app.js` and `lib/mock-data/motorcycles.ts`.
3. **Prisma ORM Synchronization (`prisma/schema.prisma`)**:
   - Define `MotorcycleModel` and `ProductFitment`.
   - Add reverse relation `fitments ProductFitment[]` on `Product`.
   - Validate with `npx prisma validate`.
4. **Domain Types & Contracts (`lib/types/product.ts` & `contracts/motomatcher.contract.ts`)**:
   - Export `MotorcycleModelRecord` and `ProductFitmentRecord` in `lib/types/product.ts`.
5. **Server Actions & SSR Hydration (`lib/actions/motomatcher-actions.ts` / `lib/admin/product-actions.ts`)**:
   - Add `getMotorcycleModelsAction()` with Supabase query and fallback.
   - Wire server components in `app/admin/motomatcher/page.tsx` and `app/staff/compat/page.tsx`.
6. **Tests**:
   - Unit tests for validation, models, contracts, and server actions.

---

## 2. Component Boundaries & Data Flow

```text
PostgreSQL (public.motorcycle_models, public.product_fitments)
       │
       ├── Supabase Client / Prisma ORM
       │
       ▼
Server Action (getMotorcycleModelsAction)
       │
       ├── SSR Pre-fetch (app/admin/motomatcher/page.tsx, app/staff/compat/page.tsx)
       │
       ▼
Client UI (Model selector dropdowns & fitment results table)
```

---

## 3. Atomic Commit Plan

Following `.agents/rules/atomic-commit.md`:
1. **Unit 1: Specification & Design artifacts** (`docs(specs): [SIAA-53] ...`)
2. **Unit 2: Dependencies & Tooling configs** (if needed, otherwise skip)
3. **Unit 3: Database Schemas & Migrations** (`feat(db): [SIAA-53] create motorcycle models and product fitments migration with RLS`)
4. **Unit 4: Domain Models, Business Logic & Tests** (`feat(catalog): [SIAA-53] add motorcycle model records, fitment types, contracts and test suite`)
5. **Unit 5: UI Components & Route Views** (`feat(motomatcher): [SIAA-53] hydrate motorcycle models in admin and staff compatibility views`)
6. **Unit 6: Tasks Completion & Sync** (`docs(specs): [SIAA-53] mark all implementation tasks complete`)
