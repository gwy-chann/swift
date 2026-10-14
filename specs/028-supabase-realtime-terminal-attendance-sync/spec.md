# Feature Specification: Supabase Realtime Terminal Attendance Sync & Multi-Station Shift Engine

**Feature Branch**: `feat/SIAA-63-supabase-realtime-terminal-attendance-sync`  
**Created**: 2026-10-14  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-63](https://the-three-devsketeers.atlassian.net/browse/SIAA-63) (STORY-5.8)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Supabase Realtime Replication & CDC Publication Enablement (Priority: P1)

As a System Administrator or Shop Floor Coordinator,  
I want the `public.staff_shifts` table registered in Supabase's `supabase_realtime` publication with `REPLICA IDENTITY FULL`,  
so that every shift punch-in, status toggle, and punch-out event produces instant Change Data Capture (CDC) events streamed across all active websocket subscribers.

**Why this priority**: Without CDC replication published on `public.staff_shifts`, client stations cannot receive live push events and would need polling, creating clock skew, stale terminal status, and excessive database load.

**Independent Test**: Can be tested by applying migration `20261018000000_staff_shifts_realtime.sql` and verifying `pg_publication_tables` confirms `staff_shifts` is in `supabase_realtime` with full replica identity.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Enabling realtime publication on staff_shifts
  Given a Supabase PostgreSQL instance with public.staff_shifts
  When migration 20261018000000_staff_shifts_realtime.sql is executed
  Then public.staff_shifts is present in publication supabase_realtime
  And table public.staff_shifts has REPLICA IDENTITY FULL configured
  And re-running the migration succeeds idempotently without error
```

---

### User Story 2 - Sub-500ms Multi-Terminal Broadcast & Floor Attendance Sync (Priority: P1)

As a Shop Manager or Terminal Attendant,  
I want punch transitions on any station (e.g., Terminal #01 Front Counter) to broadcast to peer terminals (e.g., Terminal #02 Service Bay) and the Admin Dashboard in under 500ms,  
so that staff presence badges, active attendee counts, and shift logs stay 100% synchronized across the shop floor.

**Why this priority**: When multiple technicians and cashiers clock in across distributed floor terminals, attendance indicators must accurately reflect who is on shift immediately to avoid shift assignment conflicts and punch confusion.

**Independent Test**: Can be tested by subscribing two simulated clients to `staff_shifts_changes`, emitting an `INSERT` or `UPDATE` payload, and asserting that the peer client receives and merges the new row within 500ms.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Multi-terminal punch-in broadcast
  Given Terminal #01 and Terminal #02 are actively listening to staff_shifts_changes
  When an employee punches in on Terminal #01
  Then Terminal #02 receives the CDC INSERT event within 500ms
  And Terminal #02 prepends the new shift to its active attendance log
  And the active floor attendance count increments synchronously

Scenario: Multi-terminal punch-out update
  Given an active shift exists for a staff member across connected stations
  When the employee clocks out on Terminal #01
  Then Terminal #02 receives the CDC UPDATE event with completed status and calculated duration
  And Terminal #02 marks the shift as Completed in its punch logs
  And the active floor attendance count decrements synchronously
```

---

### User Story 3 - Client Punch Store Rehydration & Drift-Free Elapsed Timer (Priority: P1)

As a Staff Member logging into a terminal or refreshing the browser,  
I want `punchStore` to automatically rehydrate the active shift from Supabase, recalculate elapsed time using server clock delta (`now() - clock_in`), and resume the 1-second interval timer without drift,  
so that my active shift counter displays the true elapsed work time regardless of page reloads, tab navigation, or terminal restarts.

**Why this priority**: If elapsed time were only tracked in browser memory (`shiftSeconds = 0`), refreshing the page or moving to another terminal would wipe out the shift duration timer or desynchronize it from payroll records.

**Independent Test**: Can be tested by invoking store rehydration with a shift clocked in 15 minutes prior, verifying that `shiftSeconds` calculates to ~900 seconds, status is `on_shift`, and subsequent `tickSecond()` increments from 900.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Rehydrating active shift with elapsed timer calculation
  Given an active shift in Supabase with clock_in timestamp 3600 seconds in the past
  When the staff terminal mounts and rehydrates punchStore
  Then isShiftActive is set to true
  And shiftStatus is set to 'on_shift'
  And shiftSeconds is initialized to 3600 (within 2 seconds tolerance)
  And the 1-second tick timer continues incrementing seamlessly

Scenario: Rehydrating when employee has no open shift
  Given an authenticated employee with only completed shifts in Supabase
  When punchStore rehydrates
  Then isShiftActive is false
  And shiftStatus is 'idle'
  And shiftSeconds is 0
  And the historical punch logs are populated with recent completed shifts
```

---

### User Story 4 - Resilient Offline Reconnection & Channel Lifecycle (Priority: P2)

As a Shop Floor Attendant in an environment with occasional Wi-Fi blips or tablet sleeps,  
I want the realtime connection to handle `TIMED_OUT`, `CHANNEL_ERROR`, and reconnection events gracefully without duplicate shift entries or resetting the running clock,  
so that terminal operations remain stable and self-healing under intermittent network conditions.

**Why this priority**: Motorcycle repair bays frequently experience Wi-Fi drops. The app must never drop user state, double-count shifts, or crash during reconnects.

**Independent Test**: Can be tested by simulating a network disconnect and reconnect event on the hook, verifying that `status` transitions from `SUBSCRIBED` to `CHANNEL_ERROR`/`CONNECTING` to `SUBSCRIBED`, shift timer maintains state, and shift rows are deduplicated by shift UUID.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Seamless recovery from momentary network drop
  Given an active terminal session with running shift timer at 1200 seconds
  When the websocket drops and emits CHANNEL_ERROR
  Then connection status updates to reflect reconnection attempts
  And running shiftSeconds continues without resetting to 0
  When websocket reconnects with SUBSCRIBED status
  Then latest shifts are reconciled by unique ID without creating duplicate log items
```

---

## Edge Cases

- **Duplicate CDC Event Delivery**: Supabase Realtime occasionally delivers duplicate events on reconnections. The client hook and store MUST deduplicate incoming shift updates by `id`.
- **Clock Skew Between Client & Server**: If the terminal device's local clock differs from the Supabase server UTC clock, calculating elapsed time must use the ISO 8601 UTC timestamp and fallback safely if device time is skewed into the future (`shiftSeconds = Math.max(0, calculated)`).
- **Simultaneous Multiple Terminal Punches**: If two terminals punch at the exact same moment, the database unique/atomic RPC constraints (from SIAA-61) reject the conflicting punch; the realtime subscription receives the authoritative final state and reflects it on both screens.
- **Break State Handling**: If a technician is in `'break'` status, the timer remains frozen at the accumulated duration until resumed or clocked out.
- **Missing / Unset Supabase Environment Variables**: In test and mock modes where `NEXT_PUBLIC_SUPABASE_URL` is unavailable, the hook must gracefully degrade to mock store behavior without throwing runtime unhandled exceptions.

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide an idempotent SQL migration (`20261018000000_staff_shifts_realtime.sql`) adding `public.staff_shifts` to publication `supabase_realtime` and setting `REPLICA IDENTITY FULL`.
- **FR-002**: System MUST implement a dedicated hook `useStaffRealtimeShifts` in `lib/hooks/use-staff-realtime-shifts.ts` subscribing to `supabase.channel('staff_shifts_changes')` for `postgres_changes` on `public.staff_shifts`.
- **FR-003**: `useStaffRealtimeShifts` MUST handle all event types (`INSERT`, `UPDATE`, `DELETE`) and dispatch corresponding updates to `punchStore`.
- **FR-004**: System MUST extend `punchStore` in `lib/store/punch-store.ts` with rehydration and sync methods:
  - `rehydrateShift(shift: DbStaffShift | null, recentLogs?: PunchLog[])`: sets active shift, status, and calculates initial elapsed seconds from UTC `clock_in`.
  - `handleRealtimeShiftInsert(row: DbStaffShift)`: prepends new shift log, deduplicating by ID, and activates shift if matching current staff.
  - `handleRealtimeShiftUpdate(row: DbStaffShift)`: updates existing shift log in-place by ID, adjusts active state/duration if current user's shift completed.
  - `getActiveStaffCount()`: returns the total count of staff members currently `'on_shift'` or on `'break'`.
- **FR-005**: All shift timestamp calculations MUST be normalized to UTC and handle time difference calculations cleanly.
- **FR-006**: Hook MUST expose connection status (`CONNECTING`, `SUBSCRIBED`, `TIMED_OUT`, `CHANNEL_ERROR`, `CLOSED`) and an `isConnected: boolean` flag.
- **FR-007**: Hook MUST cleanly unsubscribe and remove channels on unmount (`supabase.removeChannel(channel)`).
- **FR-008**: System MUST provide typed contract schemas in `specs/028-supabase-realtime-terminal-attendance-sync/contracts/realtime-attendance.contract.ts`.
- **FR-009**: All UI updates and attendance indicators MUST strictly consume SWIFT semantic design tokens (`bg-success`, `text-success`, `bg-accent`, `text-text-primary`, etc.) with zero hardcoded hex or default non-token Tailwind classes.
- **FR-010**: System MUST provide comprehensive unit and integration tests covering the realtime subscription hook, store rehydration, elapsed seconds calculation, event deduplication, and connection lifecycle.

---

## Key Entities & State Invariants

- **DbStaffShift**: Raw database representation with `id`, `profile_id`, `staff_name`, `terminal_id`, `clock_in`, `clock_out`, `duration_seconds`, `status` (`'on_shift'` | `'break'` | `'completed'`), `notes`, `created_at`, `updated_at`.
- **RealtimeShiftPayload**: CDC payload from Supabase containing `eventType: 'INSERT' | 'UPDATE' | 'DELETE'`, `new: DbStaffShift`, `old: Partial<DbStaffShift>`.
- **PunchStoreState**:
  - `isShiftActive`: `true` if current staff member has status `'on_shift'` or `'break'`.
  - `shiftStatus`: `'on_shift'` | `'break'` | `'completed'` | `'idle'`.
  - `shiftSeconds`: Elapsed seconds of active work; frozen during `'break'`.
  - `punchLogs`: Array of `PunchLog` display items, ordered by recency, deduplicated by `id`.
  - `activeStaffCount`: Derived count of shop floor employees currently on shift.

---

## Success Criteria

- **SC-001**: SQL migration registers `staff_shifts` in `supabase_realtime` and passes idempotency checks.
- **SC-002**: Realtime events (`INSERT`, `UPDATE`) dispatched to `staff_shifts_changes` reflect in `punchStore` within 500ms.
- **SC-003**: Store rehydration with an ongoing shift calculates `shiftSeconds` matching server elapsed time within 2 seconds.
- **SC-004**: Network disconnect and reconnect recovers without crashing or duplicating shift items.
- **SC-005**: `npx tsc --noEmit` passes with 0 errors.
- **SC-006**: `npm run lint` passes with 0 errors.
- **SC-007**: `npm test` passes all new and existing test suites (100% pass rate).
- **SC-008**: Zero hardcoded hex/RGB colors; all styling uses semantic SWIFT tokens.
