# Implementation Plan: Supabase Staff Shifts & Punch Clock Schema

**Feature**: `022-staff-shifts-punch-clock-schema-seed`
**Jira**: [SIAA-60](https://the-three-devsketeers.atlassian.net/browse/SIAA-60)
**Branch**: `feat/SIAA-60-staff-shifts-schema-seed`

## Technical Context

| Item | Value |
|---|---|
| Language / runtime | TypeScript 5, Node `--experimental-strip-types` |
| Framework | Next.js 16.3.8 (App Router) — no new routes in this feature |
| Database | Supabase PostgreSQL 17, migrations in `supabase/migrations/` |
| ORM | Prisma 7.10.0 |
| Test runner | Node built-in `node --test`, glob `lib/**/__tests__/*.test.ts` |
| Styling | Not applicable — no UI in this feature |

**Pre-existing prerequisites**: `public.profiles` and `public.is_admin()` from
`supabase/migrations/20261008000000_auth_profiles.sql` (SIAA-43).

## Constitution Check

Verified against `.agents/rules/atomic-commit.md` and project AGENTS.md:

- [x] **Zero hardcoded colors** — no UI is produced, so no color tokens are touched.
- [x] **Design token discipline** — not applicable (no styling).
- [x] **Single source of truth** — schema derived from `../mockup/app.js` `MOCK_PUNCH_LOGS` and `../docs/features.md`; no duplicated files copied into `swift/`.
- [x] **Atomic commits** — one commit per task, each independently green.
- [x] **TDD** — the mapper is developed test-first (Red → Green → Refactor).
- [x] **Type safety** — no `any`; `DbStaffShift` fully typed.

## Project Structure

```
swift/
├── supabase/
│   ├── migrations/
│   │   └── 20261011000000_staff_shifts.sql   # NEW
│   └── seed.sql                              # MODIFIED (append baseline shifts)
├── prisma/
│   └── schema.prisma                         # MODIFIED (add StaffShift model)
├── lib/
│   ├── types/
│   │   └── logs.ts                           # MODIFIED (DbStaffShift + mapper)
│   └── pos/
│       └── __tests__/
│           └── staff-shift-mapper.test.ts    # NEW
└── specs/
    └── 022-staff-shifts-punch-clock-schema-seed/   # NEW (8 artifacts)
```

## Phase 0: Research ✅

Completed. SIAA-53 migration adopted as structural precedent; conventions captured in
`research.md`.

## Phase 1: Design ✅

Completed. `data-model.md` and `contracts/punch-clock-domain.md` author the table, indexes,
RLS matrix, state machine, Prisma model, and the mapper signature.

## Phase 2: Implementation Tasks

| # | Task | Deliverable | Verify |
|---|---|---|---|
| T1 | SQL migration: table, CHECK, 2 indexes, RLS policies, idempotent | `supabase/migrations/20261011000000_staff_shifts.sql` | SQL applies; `\d` shows 11 cols |
| T2 | Prisma `StaffShift` model mapped to `staff_shifts` | `prisma/schema.prisma` | `npx prisma validate` |
| T3 | **Red**: failing mapper unit tests | `lib/pos/__tests__/staff-shift-mapper.test.ts` | `npm test` fails as expected |
| T4 | **Green**: `DbStaffShift` + `mapStaffShiftRow` | `lib/types/logs.ts` | `npm test` passes |
| T5 | **Refactor**: extract formatting helpers, no duplication | `lib/types/logs.ts` | `npm test` still green |
| T6 | Baseline seed rows, idempotent | `supabase/seed.sql` | SQL review |
| T7 | Docs graph sync | `docs/` | `graphify-auto-sync` |

## Verification Gates

All must pass before PR:

```bash
npm run typecheck   # zero errors
npm run lint        # zero errors
npm test            # all suites pass
npx prisma validate # schema valid
```

## Rollback

The migration is additive and idempotent; rollback is
`DROP TABLE IF EXISTS public.staff_shifts CASCADE;` plus reverting the four touched files.
No data migration or destructive change is introduced.
