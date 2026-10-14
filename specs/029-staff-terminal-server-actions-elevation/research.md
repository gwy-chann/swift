# Research: Staff Terminal Server Actions, Secure Elevation Auth & UI Wiring

**Feature**: `029-staff-terminal-server-actions-elevation`  
**Jira Ticket**: [SIAA-64](https://the-three-devsketeers.atlassian.net/browse/SIAA-64)  
**Date**: 2026-10-14  

---

## 1. Architectural Context & Technology Stack

### Next.js App Router Server Actions
- Server actions defined with `'use server'` provide RPC invocation from client components without manual REST boilerplate.
- Built-in Next.js caching directives: `revalidateTag('staff-shifts')` and `updateTag('staff-shifts')` purge cache tags upon punch events.
- Cookie manipulation via `cookies()` in `next/headers` allows setting HTTP-only secure cookies (`swift_admin_elevated`) during elevation verification.

### Supabase Shift RPCs (SIAA-61)
- Stored procedures:
  - `public.clock_in_shift(p_terminal_id, p_notes)`
  - `public.clock_out_shift(p_shift_id, p_notes)`
  - `public.toggle_shift_break(p_shift_id)`
- Enforce pessimistic row locking (`FOR UPDATE`), duration calculation on clock out, and anti-tamper audit logging into `public.staff_shift_audit_logs`.

### Supabase Realtime Attendance Sync (SIAA-63)
- `useStaffRealtimeShifts` hook listens to `postgres_changes` on `public.staff_shifts` table.
- Client state maintained in `punchStore` (`usePunchStore`), supporting `rehydrateShift`, `clockIn`, `clockOut`, `toggleBreak`, `handleRealtimeShiftInsert`, and `handleRealtimeShiftUpdate`.

### Fast SKU / Barcode Price Query (<200ms)
- Direct PostgreSQL index lookup using `public.products.sku` or `public.products.barcode` with `ILIKE` or exact match.
- Return DTO includes:
  - `sku`, `name`, `brand`, `model`, `stock`, `minThreshold`, `location`
  - `retailPrice`
  - `wholesalePrice`
  - `discountPrice` (calculated at 20% off retail for Senior Citizen / PWD)

### Secure Master Admin Elevation
- PIN verification: Checks submitted PIN against environment configuration (`ADMIN_ELEVATION_PIN`, default `8888` or hashed credential).
- On success:
  - Writes audit record to `public.audit_logs` (or `public.staff_shift_audit_logs` / console audit logger).
  - Sets HTTP-only encrypted session cookie `swift_admin_elevated=true; Path=/; HttpOnly; SameSite=Lax; Max-Age=3600`.
  - `lib/auth/session-guards.ts` checks for `swift_admin_elevated` in `resolveSession`, upgrading access or allowing `/admin` access.

---

## 2. Decision Log

| Decision | Alternative Considered | Rationale |
|---|---|---|
| Server Actions (`lib/staff/actions.ts`) | Next.js API Routes (`/api/staff/*`) | Server Actions offer direct type safety, zero client bundle overhead for DB drivers, and seamless revalidation integration. |
| HTTP-only cookie for admin elevation | LocalStorage or client Zustand flag | Security: Unattended terminals could have client storage manipulated; HTTP-only cookies prevent XSS theft and integrate directly with middleware route guards. |
| Hybrid Fallback (Supabase ➔ Prisma ➔ In-Memory) | Supabase-only | Offline resilience: If database connectivity drops momentarily, terminals can continue operating gracefully with mock/offline stores. |
