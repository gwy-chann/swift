# Research & Technical Architecture Decisions: Supabase Atomic Shift Punch RPCs

**Feature**: `027-atomic-shift-punch-rpcs`  
**Jira Ticket**: [SIAA-61](https://the-three-devsketeers.atlassian.net/browse/SIAA-61) (STORY-5.7)  

---

## Technical Context & Decisions

### 1. Database-Level Concurrency Guard & Unique Partial Index

**Context**: In a busy motorcycle dealership and repair shop, staff members may click the "Clock In" button multiple times, or open multiple browser tabs on shop floor terminals. Network jitter could lead to concurrent `clock_in_shift` executions.

**Decision**:
1. Within `public.clock_in_shift()`, we perform an active shift check with `PERFORM 1 FROM public.staff_shifts WHERE profile_id = v_profile_id AND status IN ('on_shift', 'break')`.
2. If found, we immediately raise an exception `ACTIVE_SHIFT_EXISTS` with SQLSTATE `P0409`.
3. To provide defense-in-depth against concurrent transaction race conditions (where two transactions run the check simultaneously before either inserts), we provision a unique partial index on `staff_shifts`:
   ```sql
   CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_shifts_one_active_per_employee
   ON public.staff_shifts (profile_id)
   WHERE (status IN ('on_shift', 'break'));
   ```
   If a race condition occurs, PostgreSQL's index engine rejects the second insert with a unique constraint violation, which the RPC catches and translates into `ACTIVE_SHIFT_EXISTS`.

---

### 2. Time Authority & Duration Computation

**Context**: Clients run on terminal tablets, mobile devices, and desktop browsers whose system clocks may be skewed, unsynchronized, or intentionally tampered with.

**Decision**:
- All timestamps (`clock_in`, `clock_out`, `created_at`) are generated strictly by PostgreSQL's server clock: `timezone('utc'::text, now())`.
- On `clock_out_shift`, duration in seconds is computed as:
  ```sql
  v_duration_seconds := EXTRACT(EPOCH FROM (v_now - v_shift.clock_in))::INTEGER;
  ```
- The formatted duration string (e.g. `08h 59m`) is derived using:
  ```sql
  v_hours := v_duration_seconds / 3600;
  v_minutes := (v_duration_seconds % 3600) / 60;
  v_duration_formatted := format('%sh %sm', lpad(v_hours::text, 2, '0'), lpad(v_minutes::text, 2, '0'));
  ```

---

### 3. Immutable Attendance Audit Ledger (`staff_shift_audit_logs`)

**Context**: SIAA-61 acceptance scenario 4 requires attendance audit logging on every shift transition. Audit records must be immutable (tamper-proof) to comply with labor audit standards, following the same pattern established in `service_rate_audit_logs` and `stock_adjustment_logs`.

**Decision**:
- Create `public.staff_shift_audit_logs` table:
  - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
  - `shift_id UUID NOT NULL REFERENCES public.staff_shifts(id) ON DELETE CASCADE`
  - `profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE`
  - `terminal_id TEXT NOT NULL`
  - `action TEXT NOT NULL CHECK (action IN ('clock_in', 'clock_out', 'break_start', 'break_end'))`
  - `notes TEXT NULL`
  - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
- Attach an anti-tamper trigger function `prevent_staff_shift_audit_tampering()` executing `BEFORE UPDATE OR DELETE` that raises `TAMPER_FORBIDDEN (55000)`.
- Configure RLS policies allowing authenticated users to read audit logs and insert their own events.

---

### 4. Privilege Elevation & Ownership Verification

**Context**: Staff members should only be able to clock out or toggle breaks on their own shifts. Store managers (administrators) must be able to manage shifts or clock out an employee who forgot to clock out at the end of the day.

**Decision**:
- For `clock_out_shift` and `toggle_shift_break`:
  ```sql
  IF v_caller_id != v_shift.profile_id AND NOT public.is_admin() THEN
      RAISE EXCEPTION 'UNAUTHORIZED' USING ERRCODE = '42501', DETAIL = 'Cannot modify another staff member shift without admin privileges.';
  END IF;
  ```

---

### 5. Client Store Guard Integration (`lib/store/punch-store.ts`)

**Context**: In `lib/store/punch-store.ts`, the mock/reactive store currently increments local seconds and updates local state. When wired to server actions or RPC calls, `clockIn` or `clockOut` must catch errors like `ACTIVE_SHIFT_EXISTS` and surface user-friendly toast messages.

**Decision**:
- Define a dedicated error class `ShiftError` with code `'ACTIVE_SHIFT_EXISTS' | 'UNAUTHORIZED' | 'SHIFT_NOT_ACTIVE'`.
- Provide error listener / dispatch in `punchStore` so terminal components (like `punch-clock.tsx`) can trigger toast notifications when an error is caught.
