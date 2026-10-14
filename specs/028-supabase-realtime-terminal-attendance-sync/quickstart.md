# Quickstart & Verification Guide: Supabase Realtime Terminal Attendance Sync

**Feature**: Supabase Realtime Terminal Attendance Sync & Multi-Station Shift Engine  
**Ticket**: [SIAA-63](https://the-three-devsketeers.atlassian.net/browse/SIAA-63) (STORY-5.8)  

---

## 1. Migration Verification

Apply the database migration to register `public.staff_shifts` into the `supabase_realtime` publication:

```bash
# Verify migration syntax and publication idempotency
supabase db reset
```

Or query PostgreSQL directly:
```sql
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'staff_shifts';
```
Expected output:
```text
  pubname           | schemaname | tablename
--------------------+------------+--------------
 supabase_realtime  | public     | staff_shifts
```

---

## 2. Automated Test Verification

Run all unit and integration test suites:

```bash
npm test
```

Specific test focus:
- `lib/store/__tests__/punch-store-realtime.test.ts`: Validates store rehydration, elapsed seconds calculation, CDC insert/update processing, and deduplication.
- `lib/hooks/__tests__/use-staff-realtime-shifts.test.ts`: Validates WebSocket channel lifecycle, subscription transitions, payload parsing, and unmount cleanup.

---

## 3. Multi-Terminal Sync Walkthrough Scenario

1. Open two browser windows / terminals:
   - Window A: Staff Portal Time Clock (`/staff`)
   - Window B: Admin Analytics / Live Attendance (`/admin/analytics` or second `/staff` session)
2. In Window A, click **Clock In** as "Mike Morales".
3. Verify that within 500ms, Window B displays the new active shift record and the active attendance counter increments by 1.
4. Refresh Window A:
   - Verify the shift does not reset to 00:00:00.
   - Verify the shift elapsed seconds resume smoothly from the true server timestamp.
5. In Window A, toggle **Break**:
   - Window B updates status badge to "Break" in under 500ms.
6. In Window A, click **Clock Out**:
   - Window B updates to "Completed" with formatted work duration.
