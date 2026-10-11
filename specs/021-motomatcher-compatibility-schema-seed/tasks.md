# Tasks: Motorcycle Models & Fitment Compatibility Matrix

**Feature**: `021-motomatcher-compatibility-schema-seed`  
**Jira Ticket**: [SIAA-53](https://the-three-devsketeers.atlassian.net/browse/SIAA-53) (STORY-4.6)  

---

## Phase 1: Database Migration & RLS Security

- [ ] **Task 1.1**: Create SQL migration `supabase/migrations/20261011000000_motomatcher_compatibility.sql` with tables `public.motorcycle_models`, `public.product_fitments`, constraints, foreign keys, B-tree indexes, and RLS policies.
- [ ] **Task 1.2**: Update `supabase/seed.sql` to populate 5 baseline motorcycle models and 12 canonical product fitment mappings idempotently.

---

## Phase 2: ORM Synchronization & TypeScript Domain Models

- [ ] **Task 2.1**: Update `prisma/schema.prisma` with `MotorcycleModel` and `ProductFitment` models and reverse relation on `Product`. Run `npx prisma validate`.
- [ ] **Task 2.2**: Export `MotorcycleModelRecord` and `ProductFitmentRecord` TypeScript interfaces from `lib/types/product.ts`.
- [ ] **Task 2.3**: Implement contracts and runtime Zod schemas in `specs/021-motomatcher-compatibility-schema-seed/contracts/motomatcher.contract.ts`.

---

## Phase 3: Server Actions & SSR Hydration

- [ ] **Task 3.1**: Create `getMotorcycleModelsAction` in `lib/actions/motomatcher-actions.ts` (with Supabase query and fallback to mock data).
- [ ] **Task 3.2**: Update `app/admin/motomatcher/page.tsx` and `app/staff/compat/page.tsx` to utilize `getMotorcycleModelsAction` for model fetching.

---

## Phase 4: Test Suite & Verification

- [ ] **Task 4.1**: Create unit and integration tests in `lib/admin/__tests__/motomatcher-actions.test.ts` verifying schema contracts, model retrieval, and fallback behavior.
- [ ] **Task 4.2**: Verify type checking (`npm run typecheck`) and linting (`npm run lint`).
- [ ] **Task 4.3**: Execute tests with Vitest (`npm test`).

---

## Phase 5: Atomic Commits & PR Synthesis

- [ ] **Task 5.1**: Stage and commit specification artifacts (`docs(specs): [SIAA-53] ...`).
- [ ] **Task 5.2**: Stage and commit database migration, seed, and Prisma schema (`feat(db): [SIAA-53] ...`).
- [ ] **Task 5.3**: Stage and commit domain types, server actions, and tests (`feat(catalog): [SIAA-53] ...`).
- [ ] **Task 5.4**: Stage and commit UI SSR hydration updates (`feat(motomatcher): [SIAA-53] ...`).
- [ ] **Task 5.5**: Stage and commit tasks completion (`docs(specs): [SIAA-53] ...`).
- [ ] **Task 5.6**: Push branch and create Pull Request (`gh pr create`).
