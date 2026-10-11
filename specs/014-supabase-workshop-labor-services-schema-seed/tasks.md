# Tasks: Supabase Workshop Labor Services Schema, Rates Matrix & Baseline Seed Data

**Feature Branch**: `feat/SIAA-49-supabase-labor-services-schema-rates`  
**Jira Issue**: [SIAA-49](https://the-three-devsketeers.atlassian.net/browse/SIAA-49) (STORY-3.6)  

---

## Phase 1: Database Migration & Baseline Seed Data
- [x] **Task 1.1**: Create Supabase migration `supabase/migrations/20261011000000_pos_labor_services.sql` with table `public.labor_services`, check constraints, B-tree indexes on `code` and `active`, `updated_at` trigger, and RLS policies for public `SELECT` and admin-only mutation.
- [x] **Task 1.2**: Update `supabase/seed.sql` with Section 5 inserting all 6 baseline workshop services from `mockup/app.js` with `ON CONFLICT (code) DO UPDATE`.
- [x] **Task 1.3**: Update `prisma/schema.prisma` with `LaborService` model and run `npx prisma validate`.

## Phase 2: Domain Types & Server Actions
- [x] **Task 2.1**: Update `lib/types/service.ts` to include optional `id`, `active`, `created_at`, `updated_at` fields matching the DB schema.
- [x] **Task 2.2**: Implement `getLaborServicesAction()` in `lib/pos/actions.ts` querying Supabase with automatic fallback to `MOCK_SERVICES`.
- [x] **Task 2.3**: Write unit and integration tests in `lib/pos/__tests__/labor-services.test.ts`.

## Phase 3: Fast-Lane POS Terminal Hydration
- [x] **Task 3.1**: Update `app/staff/pos/page.tsx` to replace hardcoded dummy items with dynamic hydration from `getLaborServicesAction()`.
- [x] **Task 3.2**: Verify service card rendering under "SERVICES" tab, flat-rate pricing invariance, and cart addition.

## Phase 4: Verification, Convergence & Atomic Commits
- [x] **Task 4.1**: Execute `npx tsc --noEmit` and `npm test` inside the worktree.
- [x] **Task 4.2**: Execute `npm run lint`.
- [x] **Task 4.3**: Sync knowledge graph via `graphify . --update`.
- [x] **Task 4.4**: Create atomic commits following `.agents/rules/atomic-commit.md`.
- [x] **Task 4.5**: Push branch and create Pull Request via `gh pr create`.
