# Task Breakdown: Supabase Staff Shifts & Punch Clock Schema

**Feature**: `022-staff-shifts-punch-clock-schema-seed`
**Jira**: [SIAA-60](https://the-three-devsketeers.atlassian.net/browse/SIAA-60)
**Branch**: `feat/SIAA-60-staff-shifts-schema-seed`

## Legend

- **TDD Phase**: 🔴 Red (failing test) → 🟢 Green (make it pass) → 🔵 Refactor (improve structure)
- **Commit**: one atomic commit per task, independently green
- **Dependencies**: listed per task; execute in order

---

## Phase A: Schema Foundation

### T1 — SQL Migration: `staff_shifts` Table, Constraints, Indexes & RLS 🔴→🟢

- **Depends on**: none
- **Files**: `supabase/migrations/20261015000000_staff_shifts.sql` (new)
- **Deliverable**:
  - `CREATE TABLE IF NOT EXISTS public.staff_shifts` with all 11 columns and correct types/defaults/nullability
  - `profile_id` FK → `public.profiles(id)` `ON DELETE CASCADE`
  - `staff_shifts_status_check` CHECK constraint on `status`
  - Indexes `idx_staff_shifts_profile_clock_in` and `idx_staff_shifts_status_terminal`
  - RLS enabled + 4 policies (select/insert own, select/update admin)
  - Idempotent: `IF NOT EXISTS`, `DROP POLICY IF EXISTS` before re-create
- **Commit**: `feat(SIAA-60): add staff_shifts table, indexes, RLS policies & constraints`
- **Verify**: SQL applies cleanly; re-apply is a no-op; `\d public.staff_shifts` shows 11 columns

### T2 — Prisma `StaffShift` Model

- **Depends on**: T1
- **Files**: `prisma/schema.prisma` (modified)
- **Deliverable**: `StaffShift` model per `data-model.md` §6, `@@map("staff_shifts")`, both `@@index` entries with matching index names
- **Commit**: `feat(SIAA-60): add Prisma StaffShift model mapped to staff_shifts table`
- **Verify**: `npx prisma validate` succeeds; generated client compiles

---

## Phase B: Domain Mapper (TDD)

### T3 — 🔴 Red: Failing Mapper Unit Tests

- **Depends on**: none (pure TS, no DB)
- **Files**: `lib/pos/__tests__/staff-shift-mapper.test.ts` (new)
- **Deliverable**: `node:test` suite covering:
  - `status` normalization: `on_shift` → `On Shift`, `break` → `Break`, `completed` → `Completed`
  - `clock_out === null` → `timeOut` renders `"—"` and duration placeholder
  - `duration_seconds = 32340` → `"08h 59m"`
  - `duration_seconds = null` / `0` → `"—"`
  - All 11 source fields mapped; no `snake_case` keys in output
  - Mapper never throws for valid input
- **Commit**: `test(SIAA-60): add failing tests for mapStaffShiftRow domain mapper`
- **Verify**: `npm test` fails with expected assertion errors (suite exists, mapper missing)

### T4 — 🟢 Green: `DbStaffShift` + `mapStaffShiftRow`

- **Depends on**: T3
- **Files**: `lib/types/logs.ts` (modified)
- **Deliverable**: `DbStaffShift` interface per `contracts/punch-clock-domain.md`; `mapStaffShiftRow(row): PunchLog` implementing the contract; no `any`
- **Commit**: `feat(SIAA-60): implement mapStaffShiftRow and DbStaffShift contract`
- **Verify**: `npm test` passes; `npm run typecheck` clean

### T5 — 🔵 Refactor: Extract Formatting Helpers

- **Depends on**: T4
- **Files**: `lib/types/logs.ts` (modified)
- **Deliverable**: extract `formatShiftDuration(seconds)` and `formatClockTime(iso)` helpers, reuse in mapper, no behavior change
- **Commit**: `refactor(SIAA-60): extract duration and clock-time formatting helpers`
- **Verify**: `npm test` still green; `npm run lint` clean

---

## Phase C: Baseline Seed & Docs

### T6 — Baseline Demo Seed Rows

- **Depends on**: T1
- **Files**: `supabase/seed.sql` (modified)
- **Deliverable**: append 3 shift rows (`PUNCH-101/102/103`) for profile `c0000000-0000-0000-0000-000000000002`, mirroring `MOCK_PUNCH_LOGS`; idempotent via `ON CONFLICT DO NOTHING`
- **Commit**: `feat(SIAA-60): seed baseline staff shift demo records`
- **Verify**: `npx supabase db reset` produces exactly 3 rows; re-run yields no duplicates

### T7 — Graphify Docs Sync

- **Depends on**: T1, T2, T4, T6
- **Files**: `docs/` graph artifacts
- **Deliverable**: run `graphify-auto-sync` so the knowledge graph reflects the new `StaffShift` entity, its `Profile` relation, and the mapper surface
- **Commit**: `docs(SIAA-60): sync docs graph for staff_shifts entity and mapper`
- **Verify**: graph files regenerated; no stale references

---

## Phase D: Verification Gate

### T8 — Full Verification

- **Depends on**: T1–T7
- **Deliverable**: run all four gates, all zero-error
- **Verify**:
  - `npm run typecheck` → 0 errors
  - `npm run lint` → 0 errors
  - `npm test` → all suites pass
  - `npx prisma validate` → valid
- **Commit**: none (gate only; no source changes)

## Phase E: PR

### T9 — Push & Open PR

- **Depends on**: T8
- **Deliverable**:
  - `git push -u origin feat/SIAA-60-staff-shifts-schema-seed`
  - `gh pr create` with body summarizing the migration, Prisma model, mapper, seed, and tests
  - Link to [SIAA-60](https://the-three-devsketeers.atlassian.net/browse/SIAA-60)
- **Verify**: PR opens against `main`; CI green

---

## Summary

| Phase | Tasks | Commits |
|---|---|---|
| A — Schema Foundation | T1, T2 | 2 |
| B — Domain Mapper (TDD) | T3, T4, T5 | 3 |
| C — Seed & Docs | T6, T7 | 2 |
| D — Verification | T8 | 0 |
| E — PR | T9 | 0 |
| **Total** | **9 tasks** | **7 commits** |
