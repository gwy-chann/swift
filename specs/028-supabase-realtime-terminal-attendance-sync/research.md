# Research & Technical Architecture: Realtime Terminal Attendance Sync & Multi-Station Shift Engine

**Feature**: Supabase Realtime Terminal Attendance Sync & Multi-Station Shift Engine  
**Ticket**: [SIAA-63](https://the-three-devsketeers.atlassian.net/browse/SIAA-63) (STORY-5.8)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5)  

---

## Technical Context & Architecture Decisions

### 1. Supabase Realtime Publication & Replica Identity

#### Context
Supabase Realtime listens to PostgreSQL WAL (Write-Ahead Logging) via `wal2json` or logical decoding and broadcasts table row mutations over WebSockets to subscribed clients. By default, PostgreSQL publishes only primary key columns on `UPDATE` events unless `REPLICA IDENTITY FULL` is configured.

#### Decision
- Execute migration `20261018000000_staff_shifts_realtime.sql`.
- Add `public.staff_shifts` to the `supabase_realtime` publication inside an idempotent `DO $$ BEGIN ... END $$;` block, checking `pg_publication_tables`.
- Execute `ALTER TABLE public.staff_shifts REPLICA IDENTITY FULL;` to ensure every `UPDATE` payload includes the full new record state (including updated `clock_out`, `duration_seconds`, and `status`).

---

### 2. Realtime Channel & Hook Pattern

#### Context
In Next.js App Router client components, WebSocket subscriptions must manage lifecycle properly (mounting, unmounting, fast refreshes, and reconnection) without leaking channels or duplicate subscriptions.

#### Decision
- Follow the established SWIFT pattern demonstrated in `lib/hooks/use-labor-services-realtime.ts` and `lib/hooks/use-pricing-rules-realtime.ts`.
- Create `lib/hooks/use-staff-realtime-shifts.ts`:
  - Hook signature: `useStaffRealtimeShifts(options?: UseStaffRealtimeShiftsOptions): UseStaffRealtimeShiftsResult`
  - Channel name: `staff_shifts_changes` (subscribing to `postgres_changes`, schema `public`, table `staff_shifts`).
  - Maintains `isConnected: boolean` and `status: RealtimeChannelStatus` (`'CONNECTING' | 'SUBSCRIBED' | 'TIMED_OUT' | 'CHANNEL_ERROR' | 'CLOSED'`).
  - Uses `useRef` for callbacks (`onInsert`, `onUpdate`, `onDelete`) to prevent stale closures and unnecessary re-subscriptions on re-render.
  - Returns cleanup callback invoking `supabase.removeChannel(channel)`.

---

### 3. Store Rehydration & Clock Drift Mitigation

#### Context
Client station clocks can drift, and refreshing a browser tab or switching between terminals should not reset the active shift counter to `00:00:00` or display an inaccurate duration.

#### Decision
- Extend `PunchStore` (`lib/store/punch-store.ts`) with:
  - `rehydrateShift(activeShift: DbStaffShift | null, recentLogs?: PunchLog[]): void`:
    - If `activeShift` exists:
      - Computes elapsed time from server `clock_in`:
        $$\text{elapsedSeconds} = \max\left(0, \left\lfloor \frac{\text{Date.now()} - \text{new Date}(\text{clock\_in}).\text{getTime()}}{1000} \right\rfloor\right)$$
      - If `status === 'break'`, sets `shiftStatus = 'break'` and freezes the timer.
      - If `status === 'on_shift'`, sets `shiftStatus = 'on_shift'` and resumes the 1-second interval timer from `elapsedSeconds`.
      - Sets `isShiftActive = true` and `currentStaff = activeShift.staff_name`.
    - If `activeShift` is `null`:
      - Sets `isShiftActive = false`, `shiftStatus = 'idle'`, `shiftSeconds = 0`.
    - Reconciles `punchLogs` by deduplicating existing logs with incoming logs via unique `id`.
  - `handleRealtimeShiftInsert(row: DbStaffShift): void`:
    - Maps database row to UI `PunchLog` item via `mapStaffShiftRow(row)`.
    - Prepends to `state.punchLogs`, ensuring no duplicate IDs exist.
    - If `row.profile_id` or `row.staff_name` matches current terminal staff, rehydrates active state.
  - `handleRealtimeShiftUpdate(row: DbStaffShift): void`:
    - Updates matching log in `state.punchLogs` in-place.
    - If matching current active shift and `row.status === 'completed'`, transitions store to `isShiftActive = false`, `shiftStatus = 'completed'`, and records duration.
    - If `row.status === 'break'`, transitions store status to `'break'`.
  - `getActiveStaffCount(): number`:
    - Computes count of unique staff with `'on_shift'` or `'break'` status.

---

### 4. Semantic Design Tokens & Accessibility

#### Context
SWIFT Project Constitution Principle I strictly mandates semantic design tokens (`app/globals.css`, `lib/tokens.ts`) and zero hardcoded hex/RGB values.

#### Decision
- Visual attendance indicators (e.g., active attendee badges, terminal status indicators) use:
  - Active: `bg-success-light text-success border-success`
  - Break: `bg-accent-light text-accent border-accent`
  - Inactive / Idle: `bg-bg-muted text-text-muted border-border`
- All interactive controls adhere to WCAG 2.1 AA with appropriate `aria-live="polite"` announcements for live status updates.
