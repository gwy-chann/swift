# Implementation Plan: Supabase Workshop Labor Services Schema, Rates Matrix & Baseline Seed Data

**Feature Branch**: `feat/SIAA-49-supabase-labor-services-schema-rates`  
**Jira Issue**: [SIAA-49](https://the-three-devsketeers.atlassian.net/browse/SIAA-49) (STORY-3.6)  

---

## 1. Architectural Boundaries & Files

```
├── supabase/
│   ├── migrations/
│   │   └── 20261011000000_pos_labor_services.sql   # [NEW] Migration for labor_services, indexes, triggers, RLS
│   └── seed.sql                                     # [MODIFIED] Seed 6 baseline workshop services
├── prisma/
│   └── schema.prisma                                # [MODIFIED] Add LaborService model mapping to labor_services
├── lib/
│   ├── types/
│   │   └── service.ts                               # [MODIFIED] Extend LaborService interface with id, active
│   ├── pos/
│   │   ├── actions.ts                               # [NEW] getLaborServicesAction() server action
│   │   └── __tests__/
│   │       └── labor-services.test.ts               # [NEW] Unit & integration tests for actions and contracts
└── app/
    └── staff/
        └── pos/
            └── page.tsx                             # [MODIFIED] Hydrate 6 labor services dynamically via getLaborServicesAction
```

---

## 2. Step-by-Step Execution Plan

### Step 1: Database Migration & Seed (`feat(db): [SIAA-49] ...`)
- Create `supabase/migrations/20261011000000_pos_labor_services.sql`:
  - `CREATE TABLE IF NOT EXISTS public.labor_services (...)`
  - B-tree indexes for `code` and `active`
  - Trigger for `updated_at`
  - RLS policies: Public `SELECT`, admin full access (`is_admin()`)
- Update `supabase/seed.sql`:
  - Add Section 5: Insert all 6 baseline workshop services with `ON CONFLICT (code) DO UPDATE`.

### Step 2: Prisma ORM Synchronization (`feat(db): [SIAA-49] ...`)
- Add `LaborService` model to `prisma/schema.prisma`.
- Run `npx prisma validate` to confirm schema integrity.

### Step 3: Domain Types & Server Action (`feat(pos): [SIAA-49] ...`)
- Update `lib/types/service.ts` if needed for optional `id`, `active`.
- Create `lib/pos/actions.ts`:
  - `getLaborServicesAction(): Promise<LaborService[]>`
  - Graceful fallback to `MOCK_SERVICES` from `lib/mock-data/services.ts`.

### Step 4: Tests First (TDD) (`feat(pos): [SIAA-49] ...`)
- Create `lib/pos/__tests__/labor-services.test.ts`:
  - Verify Zod schema validation on all 6 mock services.
  - Test server action behavior when Supabase is queried or when fallback is active.
  - Verify rate calculations and flat-rate invariance.

### Step 5: Fast-Lane POS Hydration (`feat(pos): [SIAA-49] ...`)
- Update `app/staff/pos/page.tsx`:
  - Call `getLaborServicesAction()` on mount.
  - Store labor services in component state.
  - When category is "SERVICES", render the active labor services with code, bay, duration, and rate.
  - When service is clicked, add to cart with preserved flat rate.

### Step 6: Verification & Convergence
- Run `npx tsc --noEmit` / `npm run typecheck`
- Run `npm run lint`
- Run `npm test`
- Trigger `graphify . --update` (as per graphify rules)
- Atomic commit & push.
