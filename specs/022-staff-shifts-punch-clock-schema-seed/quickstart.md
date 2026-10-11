# Quickstart: Supabase Staff Shifts & Punch Clock Schema

**Feature**: `022-staff-shifts-punch-clock-schema-seed`
**Jira**: [SIAA-60](https://the-three-devsketeers.atlassian.net/browse/SIAA-60)

## Prerequisites

- Supabase CLI installed and linked to the project
- Environment variables set: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `public.profiles` already migrated (SIAA-43) — do not proceed if absent
- Node 20+ and npm dependencies installed (`npm install`)

## 1. Apply the migration

```bash
npx supabase db reset        # applies all migrations + seed from scratch
```

Expected result: `public.staff_shifts` exists with 11 columns, 1 CHECK constraint,
2 indexes, RLS enabled, 4 policies, and 3 baseline rows.

## 2. Verify the schema

```bash
npx supabase db reset --dry-run    # or open the Supabase SQL editor
```

```sql
-- All eleven columns
select column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public' and table_name = 'staff_shifts'
order by ordinal_position;

-- Both indexes present
select indexname, indexdef from pg_indexes
where tablename = 'staff_shifts';

-- RLS enabled
select relname, relrowsecurity from pg_class
where relname = 'staff_shifts';

-- Baseline seed rows
select staff_name, terminal_id, status from public.staff_shifts order by clock_in;
```

Expected: `relrowsecurity = true`; three rows for Maria Santos (`2 × completed`, `1 × on_shift`).

## 3. Verify RLS boundaries

Authenticate as `cashier@swift.local` and run:

```sql
select count(*) from public.staff_shifts;   -- returns 3 (own rows only)
```

Authenticate as an admin and run the same query — returns all rows, and `UPDATE` succeeds.

Attempting to `SELECT` another cashier's row as a non-admin returns an empty set, not an error.

## 4. Regenerate the Prisma client

```bash
npx prisma generate
npx prisma validate      # expect "The schema at prisma/schema.prisma is valid"
```

## 5. Run the mapper unit tests

```bash
npm test
```

Expected: `lib/pos/__tests__/staff-shift-mapper.test.ts` suite passes, covering status
normalization, null `clock_out`, duration formatting, and full-field mapping.

## 6. Full verification gate

```bash
npm run typecheck
npm run lint
npm test
npx prisma validate
```

All four must report zero errors before opening a PR.

## Troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| Migration fails: relation `profiles` does not exist | SIAA-43 migration not applied | Apply `20261008000000_auth_profiles.sql` first |
| Seed returns 0 rows as the service role | RLS blocking the seed | Seeds run as `postgres`; use `npx supabase db reset`, not a client query |
| `npm test` cannot resolve `lib/types/logs` | Prisma client stale | Re-run `npx prisma generate` (mapper itself needs no DB) |
