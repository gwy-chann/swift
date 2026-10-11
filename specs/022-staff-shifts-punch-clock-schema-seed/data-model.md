# Data Model: Staff Shifts & Punch Clock

**Feature**: `022-staff-shifts-punch-clock-schema-seed`
**Jira**: [SIAA-60](https://the-three-devsketeers.atlassian.net/browse/SIAA-60)

## 1. Entity Relationship Diagram

```
┌──────────────────────────┐
│      public.profiles     │  (pre-existing, SIAA-43)
├──────────────────────────┤
│ PK  id            UUID   │◄──────┐
│     role          TEXT   │       │  ON DELETE CASCADE
│     ...                  │       │
└──────────────────────────┘       │
                                   │
┌──────────────────────────────────┴───────────┐
│            public.staff_shifts               │  (new, this feature)
├──────────────────────────────────────────────┤
│ PK  id              UUID     gen_random_uuid │
│ FK  profile_id      UUID     NOT NULL        │
│     staff_name      TEXT     NOT NULL        │
│     terminal_id     TEXT     NOT NULL 'Terminal #01'
│     clock_in        TIMESTAMPTZ NOT NULL     │
│     clock_out       TIMESTAMPTZ NULL         │
│     duration_seconds INTEGER   DEFAULT 0      │
│     status          TEXT     NOT NULL 'on_shift'
│                              CHECK (...)      │
│     notes           TEXT     NULL             │
│     created_at      TIMESTAMPTZ NOT NULL     │
│     updated_at      TIMESTAMPTZ NOT NULL     │
└──────────────────────────────────────────────┘
        ▲                              ▲
        │ (profile_id, clock_in DESC)  │ (status, terminal_id)
   idx_staff_shifts_profile_clock_in    idx_staff_shifts_status_terminal
```

## 2. Table Definition: `public.staff_shifts`

| Column | Type | Null | Default | Constraints |
|---|---|---|---|---|
| `id` | `uuid` | NO | `gen_random_uuid()` | PRIMARY KEY |
| `profile_id` | `uuid` | NO | — | FK → `public.profiles(id)` ON DELETE CASCADE |
| `staff_name` | `text` | NO | — | — |
| `terminal_id` | `text` | NO | `'Terminal #01'` | — |
| `clock_in` | `timestamptz` | NO | `timezone('utc'::text, now())` | — |
| `clock_out` | `timestamptz` | YES | `NULL` | — |
| `duration_seconds` | `integer` | YES | `0` | — |
| `status` | `text` | NO | `'on_shift'` | `CHECK (status IN ('on_shift','break','completed'))` |
| `notes` | `text` | YES | `NULL` | — |
| `created_at` | `timestamptz` | NO | `timezone('utc'::text, now())` | — |
| `updated_at` | `timestamptz` | NO | `timezone('utc'::text, now())` | — |

**Check constraint name**: `staff_shifts_status_check`

## 3. Indexes

| Index name | Definition | Serves |
|---|---|---|
| `idx_staff_shifts_profile_clock_in` | `(profile_id, clock_in DESC)` | "My recent shifts", staff terminal |
| `idx_staff_shifts_status_terminal` | `(status, terminal_id)` | "Currently on shift at terminal", floor manager |

## 4. RLS Policy Matrix

RLS enabled. Four policies:

| Policy | Command | Role | Expression |
|---|---|---|---|
| `staff_shifts_select_own` | SELECT | `authenticated` | `profile_id = (SELECT auth.uid())` |
| `staff_shifts_insert_own` | INSERT | `authenticated` | `profile_id = (SELECT auth.uid())` |
| `staff_shifts_select_admin` | SELECT | `authenticated` | `public.is_admin()` |
| `staff_shifts_update_admin` | UPDATE | `authenticated` | `public.is_admin()` |

Effective access summary:

| Actor | SELECT | INSERT | UPDATE | DELETE |
|---|---|---|---|---|
| Staff (own rows) | ✅ | ✅ own | ❌ | ❌ |
| Staff (others' rows) | ❌ (empty set) | ❌ | ❌ | ❌ |
| Admin (all rows) | ✅ | — | ✅ | — |

## 5. State Machine: `status`

```
            punch_break()          end_break()
  on_shift ──────────────► break ──────────────► on_shift
     │                        │
     │ punch_out()            │ punch_out()
     ▼                        ▼
  completed  ◄──────────── completed
```

| Transition | Enforced by |
|---|---|
| `on_shift` → `break` | STORY-5.7 punch RPC |
| `break` → `on_shift` | STORY-5.7 punch RPC |
| `on_shift`/`break` → `completed` | STORY-5.7 punch RPC |

This feature provides the storage and CHECK constraint only. No trigger, function, or stored procedure enforces transitions.

## 6. Prisma Model

```prisma
model StaffShift {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  profileId       String    @map("profile_id") @db.Uuid
  staffName       String    @map("staff_name")
  terminalId      String    @default("Terminal #01") @map("terminal_id") @db.Text
  clockIn         DateTime  @default(now()) @map("clock_in") @db.Timestamptz(6)
  clockOut        DateTime? @map("clock_out") @db.Timestamptz(6)
  durationSeconds Int?      @default(0) @map("duration_seconds")
  status          String    @default("on_shift") @db.Text
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt       DateTime  @default(now()) @map("updated_at") @db.Timestamptz(6)

  @@index([profileId, clockIn(sort: Desc)], map: "idx_staff_shifts_profile_clock_in")
  @@index([status, terminalId], map: "idx_staff_shifts_status_terminal")
  @@map("staff_shifts")
}
```

## 7. TypeScript Domain Contract

```ts
/** Raw database row shape for public.staff_shifts. */
export interface DbStaffShift {
  id: string;
  profile_id: string;
  staff_name: string;
  terminal_id: string;
  clock_in: string;        // ISO 8601
  clock_out: string | null;
  duration_seconds: number | null;
  status: 'on_shift' | 'break' | 'completed';
  notes: string | null;
  created_at: string;
  updated_at: string;
}
```

## 8. Seed Records

| id | staff_name | terminal_id | clock_in | clock_out | status |
|---|---|---|---|---|---|
| `PUNCH-101` (uuid) | Maria Santos | Terminal #01 | 2026-10-06 08:02:10Z | 2026-10-06 17:01:45Z | `completed` |
| `PUNCH-102` (uuid) | Maria Santos | Terminal #01 | 2026-10-07 07:58:40Z | 2026-10-07 16:45:12Z | `completed` |
| `PUNCH-103` (uuid) | Maria Santos | Terminal #02 | 2026-10-08 08:11:03Z | `NULL` | `on_shift` |

All bound to `profile_id = c0000000-0000-0000-0000-000000000002` (`cashier@swift.local`).
Inserted with `ON CONFLICT DO NOTHING` for idempotency.
