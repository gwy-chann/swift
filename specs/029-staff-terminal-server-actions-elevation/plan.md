# Implementation Plan: Staff Terminal Server Actions, Secure Elevation Auth & UI Wiring

**Feature**: `029-staff-terminal-server-actions-elevation`  
**Jira Ticket**: [SIAA-64](https://the-three-devsketeers.atlassian.net/browse/SIAA-64)  
**Date**: 2026-10-14  

---

## 1. Technical Architecture & Boundaries

```mermaid
flowchart TD
    subgraph UI_Leaves [Interactive Client Views]
        ClockView[app/staff/clock/page.tsx]
        PriceCheckView[app/staff/pricecheck/page.tsx]
        AdminModal[components/staff/admin-switch-modal.tsx]
        PosView[app/staff/pos/page.tsx]
    end

    subgraph Server_Actions [lib/staff/actions.ts]
        ActionClockIn[clockInShiftAction]
        ActionClockOut[clockOutShiftAction]
        ActionToggleBreak[toggleShiftBreakAction]
        ActionHistory[getStaffAttendanceHistoryAction]
        ActionPriceCheck[lookupProductPriceAction]
        ActionElevation[verifyAdminElevationAction]
    end

    subgraph Backend_Services [Persistence & Auth]
        SupabaseRpc[Supabase RPCs & Tables]
        SessionGuards[lib/auth/session-guards.ts]
        CookiesStore[Next.js cookies() swift_admin_elevated]
        PunchStore[lib/store/punch-store.ts]
        RealtimeHook[lib/hooks/use-staff-realtime-shifts.ts]
    end

    ClockView --> ActionClockIn
    ClockView --> ActionClockOut
    ClockView --> ActionToggleBreak
    ClockView --> ActionHistory
    ClockView --> PunchStore
    ClockView --> RealtimeHook

    PriceCheckView --> ActionPriceCheck
    AdminModal --> ActionElevation
    ActionElevation --> CookiesStore
    CookiesStore --> SessionGuards
    PosView --> ActionPriceCheck
```

---

## 2. File Modification & Creation Blueprint

1. **`lib/staff/actions.ts`** (NEW):
   - Export `clockInShiftAction`, `clockOutShiftAction`, `toggleShiftBreakAction`, `getStaffAttendanceHistoryAction`, `lookupProductPriceAction`, `verifyAdminElevationAction`.
   - Incorporate Supabase calls with offline/mock fallback, Next.js cache revalidation (`['staff-shifts']`), and cookie generation for elevation.

2. **`lib/auth/session-guards.ts`** (UPDATE):
   - Enhance `resolveSession` to check `cookies?.get('swift_admin_elevated')?.value === 'true'`.
   - In `evaluateRouteAccess`, allow access to `ADMIN_PORTAL` when session has elevated admin flag.

3. **`app/staff/clock/page.tsx`** (UPDATE):
   - Refactor to consume `usePunchStore()` and `useStaffRealtimeShifts()`.
   - Wire clock in/out/break buttons to Server Actions with reactive feedback.
   - Wire attendance history table to `getStaffAttendanceHistoryAction()`.

4. **`app/staff/pricecheck/page.tsx`** (UPDATE):
   - Add id `priceScanInput` to the SKU input.
   - Wire input to `lookupProductPriceAction` with debounced/instant execution in <200ms.
   - Display SRP, Wholesale, and SC/PWD (20% off) with live stock and shelf coordinates.

5. **`components/staff/admin-switch-modal.tsx`** (UPDATE):
   - Wire form submission to `verifyAdminElevationAction(pin)`.
   - Handle invalid PIN error message, redirecting to `/admin` upon success.

6. **`app/staff/pos/page.tsx`** (VERIFY & POLISH):
   - Ensure F12 keydown hotkey triggers checkout modal wired to `processCheckoutAction()`.
   - Verify active products hydrate cleanly.

7. **Automated Unit & Integration Tests**:
   - `lib/staff/__tests__/staff-actions.test.ts`
   - `components/staff/__tests__/admin-switch-modal.test.tsx` (or tests for actions)
