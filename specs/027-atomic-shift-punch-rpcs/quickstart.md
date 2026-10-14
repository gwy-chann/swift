# Quickstart & Verification Guide: Supabase Atomic Shift Punch RPCs

**Feature**: `027-atomic-shift-punch-rpcs`  
**Jira Ticket**: [SIAA-61](https://the-three-devsketeers.atlassian.net/browse/SIAA-61) (STORY-5.7)  

---

## Prerequisites

1. PostgreSQL database running with Supabase migrations applied up through `20261015000000_staff_shifts.sql`.
2. Active user session or simulated authenticated profile.

---

## Verification Scenarios

### Scenario 1: Migration Execution
Run the migration script:
```sql
-- Apply migration 20261017000000_staff_shift_punch_rpcs.sql
\i supabase/migrations/20261017000000_staff_shift_punch_rpcs.sql
```
**Expected Outcome**:
- Table `public.staff_shift_audit_logs` created with RLS enabled.
- Anti-tamper trigger `trigger_prevent_staff_shift_audit_tampering` registered.
- Unique partial index `idx_staff_shifts_one_active_per_employee` created on `public.staff_shifts`.
- Stored procedures `clock_in_shift`, `clock_out_shift`, and `toggle_shift_break` created.

---

### Scenario 2: Atomic Clock-In RPC
Execute clock-in for the current authenticated user:
```sql
SELECT public.clock_in_shift('Terminal #01', 'Morning shop opening');
```
**Expected Outcome**:
- Returns JSONB payload:
  ```json
  {
    "success": true,
    "shift": {
      "terminal_id": "Terminal #01",
      "status": "on_shift"
    },
    "audit_log_id": "<uuid>"
  }
  ```
- A new row exists in `public.staff_shifts` with `status = 'on_shift'`.
- A new row exists in `public.staff_shift_audit_logs` with `action = 'clock_in'`.

---

### Scenario 3: Concurrency Guard (Double Punch Prevention)
Immediately execute `clock_in_shift` again without clocking out:
```sql
SELECT public.clock_in_shift('Terminal #01', 'Double punch attempt');
```
**Expected Outcome**:
- Query fails with Postgres exception:
  `ERROR: ACTIVE_SHIFT_EXISTS (SQLSTATE P0409) - Active shift already in progress for this profile.`
- No additional row is inserted into `staff_shifts`.

---

### Scenario 4: Break Toggle State Transition
Toggle break on the active shift:
```sql
SELECT public.toggle_shift_break('<shift_id>');
```
**Expected Outcome**:
- First invocation: Status switches from `'on_shift'` to `'break'`, audit action `'break_start'`.
- Second invocation: Status switches from `'break'` to `'on_shift'`, audit action `'break_end'`.

---

### Scenario 5: Clock-Out & Duration Computation
Clock out the active shift:
```sql
SELECT public.clock_out_shift('<shift_id>', 'End of workday');
```
**Expected Outcome**:
- Status switches to `'completed'`.
- `clock_out` timestamp populated.
- `duration_seconds` calculated.
- `duration_formatted` returns formatted string (e.g. `08h 59m` or elapsed time).
- Audit log row created with `action = 'clock_out'`.

---

### Scenario 6: Audit Log Anti-Tamper Enforcement
Attempt to delete or update an audit record:
```sql
DELETE FROM public.staff_shift_audit_logs WHERE id = '<audit_log_id>';
```
**Expected Outcome**:
- Fails with error:
  `ERROR: TAMPER_FORBIDDEN (SQLSTATE 55000) - Audit records in staff_shift_audit_logs are immutable and cannot be updated or deleted.`

---

### Scenario 7: Client Store Error Interception
Run Jest/Vitest unit tests:
```bash
npm test -- test/punch-store-guard.test.ts
```
**Expected Outcome**:
- `punchStore` intercepts `ACTIVE_SHIFT_EXISTS` and returns/emits descriptive error for toast display.
- All test assertions pass.
