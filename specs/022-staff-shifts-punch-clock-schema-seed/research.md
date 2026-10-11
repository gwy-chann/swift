# Research: Supabase Staff Shifts & Punch Clock Schema

**Feature**: `022-staff-shifts-punch-clock-schema-seed`
**Jira**: [SIAA-60](https://the-three-devsketeers.atlassian.net/browse/SIAA-60)

## 1. Objective

Establish a durable relational schema for staff punch-clock records in Supabase PostgreSQL, matching the existing migration conventions of the SWIFT project, and expose a typed mapper so the staff terminal UI can consume database rows.

## 2. Prior Art & Precedent Patterns

The project already contains a near-identical migration pattern delivered by **SIAA-53 (STORY-4.6)** — the Supabase POS Transactions & Line Items schema. That migration was selected as the structural template for this feature.

### 2.1 Conventions extracted from SIAA-53

| Convention | Implementation in `20261011000000_staff_shifts.sql` |
|---|---|
| Timestamped migration filename | `20261011000000_staff_shifts.sql` |
| Idempotency | `CREATE TABLE IF NOT EXISTS`, `DROP POLICY IF EXISTS ... ` before re-`CREATE POLICY` |
| UUID primary key | `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` |
| UTC timestamps | `timezone('utc'::text, now())` rather than bare `now()` |
| Status CHECK | `CHECK (status IN ('on_shift', 'break', 'completed'))` |
| RLS enablement | `ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;` |
| Admin gate | `public.is_admin()` helper, shared with auth migration |
| Composite indexes | Explicit `CREATE INDEX IF NOT EXISTS` on hot query paths |

### 2.2 Role matrix precedent

The auth migration `20261008000000_auth_profiles.sql` established the RLS shape reused here: authenticated users see rows scoped to their own `auth.uid()`, admins bypass via `public.is_admin()`.

## 3. Design Decisions

### 3.1 Column design

Eleven columns, matching the ticket's `Table Structure` block verbatim. `duration_seconds` defaults to `0` and is maintained by downstream punch RPCs rather than a trigger, keeping this feature free of procedural logic.

**Decision**: Do NOT add a `clock_out > clock_in` CHECK constraint. Rationale: real-world terminal clock corrections and timezone edge cases are resolved by the RPC layer; adding it here would reject legitimate late corrections.

**Decision**: Do NOT add a partial unique index enforcing a single open `on_shift` row per profile. Rationale: STORY-5.7 owns concurrency guards. Duplicating a constraint here would block legitimate double-punch correction flows.

### 3.2 Index selection

Two composite B-tree indexes, both taken directly from the ticket:

1. `idx_staff_shifts_profile_clock_in ON public.staff_shifts(profile_id, clock_in DESC)`
   - Serves the "my recent shifts" query on the staff terminal, ordered newest-first.
2. `idx_staff_shifts_status_terminal ON public.staff_shifts(status, terminal_id)`
   - Serves the "who is currently on shift at this terminal" floor manager query.

Both are leading-column-indexed so single-column filters on the leading column remain usable.

### 3.3 RLS policy design

| Policy | Command | Target | Using/With Check |
|---|---|---|---|
| `staff_shifts_select_own` | SELECT | authenticated | `profile_id = (SELECT auth.uid())` |
| `staff_shifts_insert_own` | INSERT | authenticated | `profile_id = (SELECT auth.uid())` |
| `staff_shifts_select_admin` | SELECT | authenticated | `public.is_admin()` |
| `staff_shifts_update_admin` | UPDATE | authenticated | `public.is_admin()` |

Postgres RLS policies are additive (OR semantics), so separate admin `SELECT` policy layers full visibility on top of the self-scoped policy without needing a `TO admin` role trick that doesn't exist in this project.

### 3.4 Prisma model mapping

`StaffShift` model maps to `@@map("staff_shifts")`. `@db.Uuid` on `profile_id`, `@db.Timestamptz(6)` on the four timestamps, `@db.Text` on text columns. No relations defined on the Prisma side because `Profile` lives outside this schema's mapping and the ticket specifies only the model, not the relation.

## 4. Seed data

Three shifts mirroring the mock `PUNCH-101/102/103` entries, all bound to the seeded cashier `c0000000-0000-0000-0000-000000000002`. Inserted with `ON CONFLICT DO NOTHING` for idempotent re-runs. Terminal IDs and clock-in offsets match `../mockup/staff.html` exactly.

## 5. Typed mapper design

`lib/types/logs.ts` gains `DbStaffShift` and `mapStaffShiftRow(row: DbStaffShift): PunchLog`. The mapper:
- Normalizes `status` values: `on_shift` → `On Shift`, `break` → `On Break`, `completed` → `Completed`.
- Renders `clock_out === null` as the active-shift placeholder `"—"` in `timeOut`.
- Formats `duration_seconds` into `"HHh MMm"`.
- Formats `clock_in`/`clock_out` ISO strings into the display time format used by the existing `PunchLog` UI.

This mapper is the sole unit-testable surface in this feature; `npm test` runs `lib/**/__tests__/*.test.ts` via the Node built-in test runner with `--experimental-strip-types`.

## 6. Risks

| Risk | Mitigation |
|---|---|
| Prisma client not regenerated after schema change | `postinstall` script runs `prisma generate`; tests target the pure mapper and do not require a generated client or DB connection |
| Migration ordering vs. auth migration | Timestamp `20261011000000` sorts after `20261008000000_auth_profiles.sql`, guaranteeing `public.profiles` exists first |
| RLS blocking the seed | `supabase db reset` runs seed as the privileged `postgres` role, which bypasses RLS |

## 7. Alternatives considered

- **Generated column for `duration_seconds`** — Rejected: requires `clock_out` to be set in the same statement; RPC layer writes it explicitly.
- **Single `punch_events` append-only table** — Rejected: the ticket mandates the `staff_shifts` mutable-row shape, and the UI mock reads a shift-shaped record.
- **`pg_trgm` index for staff name search** — Rejected: not required by the ticket, and name search is scoped to admin drill-in delivered later.
