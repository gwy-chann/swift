# API Contract: Punch Clock Domain Mapper

**Feature**: `022-staff-shifts-punch-clock-schema-seed`
**Jira**: [SIAA-60](https://the-three-devsketeers.atlassian.net/browse/SIAA-60)

This feature ships **no HTTP endpoints, no server actions, and no RPCs**. Those arrive in
STORY-5.7 (RPCs) and STORY-5.9 (server actions & UI). The only programmatic surface delivered
here is the pure TypeScript domain mapper in `lib/types/logs.ts`.

---

## `mapStaffShiftRow`

Translates a raw `public.staff_shifts` row into the UI `PunchLog` display item.

```ts
export function mapStaffShiftRow(row: DbStaffShift): PunchLog;
```

### Input: `DbStaffShift`

| Field | Type | Notes |
|---|---|---|
| `id` | `string` | UUID |
| `profile_id` | `string` | UUID |
| `staff_name` | `string` | e.g. `"Maria Santos"` |
| `terminal_id` | `string` | e.g. `"Terminal #01"` |
| `clock_in` | `string` | ISO 8601 UTC |
| `clock_out` | `string \| null` | `null` while active |
| `duration_seconds` | `number \| null` | `null` treated as `0` |
| `status` | `'on_shift' \| 'break' \| 'completed'` | DB enum values |
| `notes` | `string \| null` | — |
| `created_at` | `string` | ISO 8601 UTC |
| `updated_at` | `string` | ISO 8601 UTC |

### Output: `PunchLog` (existing UI interface in `lib/types/logs.ts`)

| Field | Derived from |
|---|---|
| `id` | `row.id` |
| `date` | `row.clock_in` formatted as a human-readable date |
| `staff` | `row.staff_name` |
| `timeIn` | `row.clock_in` formatted `HH:mm` |
| `timeOut` | `row.clock_out` formatted `HH:mm`, or `"—"` when null |
| `status` | normalized label (see mapping below) |
| `terminal` | `row.terminal_id` |
| `duration` | formatted from `row.duration_seconds`, or elapsed when active |

> **Note**: `terminal` and `duration` are additive fields appended by the mapper. `PunchLog`
> in `lib/types/logs.ts` currently declares `id?`, `date`, `staff`, `timeIn`, `timeOut`,
> `duration`, `status`. The mapper's optional additions (`terminal`) require either extending
> `PunchLog` or keeping the mapper's return type as a documented superset. Decision recorded
> in T4: extend `PunchLog` with `terminal?: string` rather than invent a parallel type.

### Status normalization

| DB `status` | UI `PunchLog.status` |
|---|---|
| `on_shift` | `'On Shift'` |
| `break` | `'Break'` |
| `completed` | `'Completed'` |

> **Note**: `PunchLog.status` is declared as `'On Shift' | 'Completed' | 'Break' | string`.
> `'Break'` is the established label, not `'On Break'`. The mapper emits `'Break'`.


### Duration formatting

- Input `duration_seconds = 32_340` → `"08h 59m"`.
- Hours and minutes both rendered, minutes zero-padded to two digits.
- `null` / `0` → `"—"`.

### Time formatting

- `clock_in` and `clock_out` are ISO 8601 UTC strings; the mapper renders local wall-clock
  time as `HH:mm` (24-hour), consistent with the staff terminal UI in `../mockup/staff.html`.

---

## Invariants the mapper MUST guarantee

1. **Total function** — defined for every `DbStaffShift` value; never throws.
2. **No `any` leakage** — output is fully typed as `PunchLog`.
3. **No `snake_case` leakage** — every output key is camelCase.
4. **Null-safety** — `clock_out`, `notes`, and `duration_seconds` may each be `null`.

## Out of contract (downstream tickets)

| Surface | Delivered by |
|---|---|
| `punch_in` / `punch_out` / `punch_break` RPCs + concurrency guards | STORY-5.7 (SIAA-61) |
| Staff terminal server actions, elevation auth, UI wiring | STORY-5.9 (SIAA-63) |
