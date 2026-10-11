# Feature Specification: Supabase Staff Shifts & Punch Clock Schema, Indexes, RLS & Baseline Seed Data

**Feature Branch**: `feat/SIAA-60-staff-shifts-schema-seed`
**Created**: 2026-10-12
**Status**: Ready for Planning
**Jira Ticket**: [SIAA-60](https://the-three-devsketeers.atlassian.net/browse/SIAA-60) (STORY-5.6)
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Relational Staff Shifts & Punch Clock Schema Provisioning (Priority: P1)

As a Shop Administrator or Store Manager,
I want a dedicated relational database schema for staff shift time-in/time-out records persisted in Supabase PostgreSQL with strict foreign keys, status check constraints, B-tree indexes, and Row-Level Security,
so that employee work hours, daily time-in/out records, and terminal assignments are immutably persisted and queryable with strict role-based access control.

**Why this priority**: The `staff_shifts` table is the relational foundation for EPIC-5 attendance and payroll traceability. Every downstream punch clock feature — the atomic punch RPCs, attendance history, and the timesheet analytics feed — depends on a durable, constraint-enforced shift record rather than a volatile in-memory `punchLogs` array.

**Independent Test**: Can be tested by executing SQL migration `20261011000000_staff_shifts.sql` against the database and confirming the table, foreign key, status check constraint, and both B-tree indexes exist with zero syntax or constraint errors.

**Acceptance Scenarios**:

1. **Given** a Supabase PostgreSQL instance with existing `public.profiles`,
   **When** migration `20261011000000_staff_shifts.sql` is executed,
   **Then** the `public.staff_shifts` table is created with:
     - `id` (UUID PRIMARY KEY DEFAULT gen_random_uuid())
     - `profile_id` (UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE)
     - `staff_name` (TEXT NOT NULL)
     - `terminal_id` (TEXT NOT NULL DEFAULT 'Terminal #01')
     - `clock_in` (TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()))
     - `clock_out` (TIMESTAMPTZ NULLABLE)
     - `duration_seconds` (INTEGER DEFAULT 0)
     - `status` (TEXT NOT NULL DEFAULT 'on_shift' CHECK (status IN ('on_shift', 'break', 'completed')))
     - `notes` (TEXT NULLABLE)
     - `created_at` (TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()))
     - `updated_at` (TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()))
2. **And** Prisma schema `prisma/schema.prisma` is synchronized with model `StaffShift`.
3. **Given** the migration executed once,
   **When** executed again during re-runs or resets,
   **Then** the script completes idempotently (`IF NOT EXISTS` guards) without errors.

---

### User Story 2 - High-Performance Shift Lookup Indexes (Priority: P1)

As a Floor Mechanic or Shop Staff member,
I want shift queries ordered by staff profile and active status to be served by composite B-tree indexes,
so that punch clock and attendance history screens resolve in under 50ms across thousands of historical shift records.

**Why this priority**: The staff terminal shift counter and attendance history run a query per mount; without composite indexes these degrade to sequential scans as shift history grows.

**Independent Test**: Can be tested by inspecting `pg_indexes` after migration and confirming both composite indexes exist with the exact column ordering and sort direction specified.

**Acceptance Scenarios**:

1. **Given** the `staff_shifts` table,
   **When** queried by staff profile and clock-in recency,
   **Then** the lookup utilizes composite index `idx_staff_shifts_profile_clock_in ON public.staff_shifts(profile_id, clock_in DESC)`.
2. **And** when queried by active shift status scoped to a terminal,
   **Then** the lookup utilizes composite index `idx_staff_shifts_status_terminal ON public.staff_shifts(status, terminal_id)`.

---

### User Story 3 - Row-Level Security Access Boundaries (Priority: P1)

As a Counter Cashier or Shop Floor Mechanic,
I want Row Level Security on `staff_shifts` so that I can only read and punch my own shift records while administrators can audit every employee's attendance,
so that coworkers cannot fabricate, alter, or inspect another person's payroll-relevant work hours.

**Why this priority**: Attendance records are payroll-relevant. Without RLS, any authenticated session could read or spoof another employee's hours — a compliance and trust failure.

**Independent Test**: Can be tested by authenticating as the seeded cashier and confirming the returned row set is scoped to that profile only, then authenticating as admin and confirming full visibility and update rights.

**Acceptance Scenarios**:

1. **Given** RLS enabled on `public.staff_shifts`,
   **When** an authenticated staff member executes a query,
   **Then** they can only `SELECT` and `INSERT` shift logs where `profile_id = (SELECT auth.uid())`.

---

### User Story 4 - Authoritative Baseline Demo Seed Execution (Priority: P2)

As a Demo Operator or Onboarding Trainer,
I want baseline shift records seeded that exactly mirror the UI mock `MOCK_PUNCH_LOGS`,
so that the staff time-clock screen shows identical data whether the store runs against the mock engine or a freshly reset Supabase database.

**Why this priority**: Demo and acceptance-test parity. Stakeholder walkthroughs and E2E assertions compare rendered rows against the documented mock fixtures.

**Independent Test**: Can be tested by running `supabase db reset` and confirming three shift rows exist for the cashier profile with the expected terminal, clock-in times, and statuses.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Seeding baseline demo shifts matching MOCK_PUNCH_LOGS
  Given supabase/seed.sql
  When supabase db reset executes
  Then demo shifts matching MOCK_PUNCH_LOGS (PUNCH-101, PUNCH-102, PUNCH-103)
    are seeded for cashier account cashier@swift.local (c0000000-0000-0000-0000-000000000002)

Scenario: Idempotent seed re-execution
  Given the three baseline shifts already exist
  When supabase db reset executes a second time
  Then exactly three baseline shift rows exist, with no duplicates
```

---

### User Story 5 - Punch Clock Domain Contract & Typed Row Mapper (Priority: P2)

As a Frontend Developer,
I want `lib/types/logs.ts` to expose a `DbStaffShift` contract matching the database schema and a typed mapper converting rows into UI `PunchLog` items,
so that terminal components consume database rows without leaking `snake_case` fields or untyped `any` payloads into the presentation layer.

**Why this priority**: Prevents schema drift between the migration and the UI. The mapper is the single translation boundary and is the only unit-testable surface of this feature.

**Independent Test**: Can be tested by invoking the mapper with a representative raw row and asserting every `PunchLog` field, including duration formatting and status normalization.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Mapping a completed shift row to a PunchLog display item
  Given a DbStaffShift row with status 'completed', clock_in 08:02:10, clock_out 17:01:45
  When the mapper converts the row
  Then the resulting PunchLog has status 'Completed' and duration formatted as "08h 59m"

Scenario: Mapping an active shift row without clock_out
  Given a DbStaffShift row with status 'on_shift' and a null clock_out
  When the mapper converts the row
  Then timeOut renders as the active-shift placeholder and status is 'On Shift'
```

---

## Edge Cases

- A staff member attempts to punch in while an existing `on_shift` row is open. The schema permits multiple rows; concurrency guarding is explicitly **out of scope** and deferred to STORY-5.7 (Supabase Atomic Shift Punch RPCs & Concurrency Guards). This feature MUST NOT attempt to enforce single-active-shift uniqueness.
- `clock_out` is set earlier than `clock_in` due to a terminal clock adjustment. The migration does not add a `clock_out > clock_in` check constraint, since real-world time corrections and timezone handling are managed by the punch RPC layer. Documented as a deliberate boundary, not an omission.
- A profile is deleted. `ON DELETE CASCADE` removes that employee's shift history, preserving referential integrity.
- `duration_seconds` is written as `0` by default and is maintained by the punch RPCs, not by a database trigger in this feature.

2. **And** users with `admin` role (`public.is_admin()`) can `SELECT`, `UPDATE`, and audit all shift records across all employees.
3. **And** an authenticated non-admin session attempting to `SELECT` a row owned by another profile receives an empty result set rather than an error.

## Requirements

### Functional Requirements

- **FR-001**: System MUST create `public.staff_shifts` with exactly the eleven columns enumerated in User Story 1, matching names, nullability, defaults, and the status CHECK constraint.
- **FR-002**: System MUST establish `profile_id` as a foreign key to `public.profiles(id)` with `ON DELETE CASCADE`.
- **FR-003**: System MUST create both composite B-tree indexes with the specified column ordering and sort direction.
- **FR-004**: System MUST enable Row Level Security and define policies granting non-admin sessions `SELECT`/`INSERT` restricted to their own `profile_id`, and granting admins full `SELECT`/`UPDATE` across all rows.
- **FR-005**: Migration MUST be idempotent via `IF NOT EXISTS` / `CREATE OR REPLACE` guards.
- **FR-006**: Prisma schema MUST gain a `StaffShift` model mapped to `staff_shifts` and consistent with the SQL column types.
- **FR-007**: `supabase/seed.sql` MUST insert three baseline shifts (`PUNCH-101`, `PUNCH-102`, `PUNCH-103`) for profile `c0000000-0000-0000-0000-000000000002`, idempotently.
- **FR-008**: `lib/types/logs.ts` MUST export a `DbStaffShift` interface mirroring the table columns.
- **FR-009**: System MUST export a typed mapper from `DbStaffShift` to the existing UI `PunchLog` interface, normalizing status labels and formatting duration.
- **FR-010**: Mapper MUST be covered by a unit test suite executed by `npm test`.

### Key Entities

- **StaffShift** — One attendance record per employee per shift. Attributes: `id`, `profile_id` (FK), `staff_name`, `terminal_id`, `clock_in`, `clock_out`, `duration_seconds`, `status` (`on_shift` | `break` | `completed`), `notes`, `created_at`, `updated_at`.
  - Relationships: belongs to `Profile` (many shifts to one profile).
  - State machine: `on_shift` → `break` → `on_shift`; `on_shift` | `break` → `completed`. Transitions are enforced by the punch RPC layer (STORY-5.7), not by this feature.

## Success Criteria

- **SC-001**: Migration applies cleanly against a fresh database and re-applies without error.
- **SC-002**: `\d public.staff_shifts` shows all eleven columns with correct types, defaults, and the status CHECK constraint.
- **SC-003**: Both composite indexes appear in `pg_indexes` for `public.staff_shifts`.
- **SC-004**: Authenticating as the seeded cashier returns exactly that profile's three shifts; an admin session returns all shifts and can `UPDATE` them.
- **SC-005**: `npm run typecheck` passes with zero errors.
- **SC-006**: `npm run lint` passes with zero errors.
- **SC-007**: `npm test` passes, including the new shift mapper suite.
- **SC-008**: `npx prisma validate` reports the schema as valid.

## Assumptions

- `public.profiles` and the `public.is_admin()` helper already exist from SIAA-43 (STORY-1.6), which is an explicit prerequisite of this ticket.
- The `pgcrypto` extension is available for `gen_random_uuid()`, consistent with the auth migration.
- Baseline seed data is fixed demo content, not business data; changing it requires an explicit product decision.
- Punch-in/punch-out RPCs, concurrency guards, and realtime propagation are delivered by downstream tickets STORY-5.7 and STORY-5.9 and are deliberately excluded here.

## Out of Scope

- Atomic punch RPCs and concurrency guards (STORY-5.7).
- Staff terminal server actions, secure elevation auth, and UI wiring of the punch clock screen (STORY-5.9).
- Realtime CDC broadcast of shift changes.
- Payroll export or timesheet aggregation logic.
- Any UI component, page, or route creation.

