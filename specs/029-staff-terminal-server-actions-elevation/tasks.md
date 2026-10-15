# Tasks: Staff Terminal Server Actions, Secure Elevation Auth & UI Wiring

**Feature**: `029-staff-terminal-server-actions-elevation`  
**Jira Ticket**: [SIAA-64](https://the-three-devsketeers.atlassian.net/browse/SIAA-64)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5)  
**Branch**: `feat/SIAA-64-staff-terminal-server-actions-elevation`  

---

## Phase 1: Contracts & Server Actions Core

- [x] **TASK-1.1**: Implement `lib/staff/actions.ts` with type-safe Server Actions:
  - `clockInShiftAction(terminalId?: string, notes?: string)`
  - `clockOutShiftAction(shiftId: string, notes?: string)`
  - `toggleShiftBreakAction(shiftId: string)`
  - `getStaffAttendanceHistoryAction(limit?: number)`
  - `lookupProductPriceAction(query: string)`
  - `verifyAdminElevationAction(pin: string)`
  - Ensure cache revalidation on tag `'staff-shifts'` and graceful fallback for offline/mock mode.
- [x] **TASK-1.2**: Author comprehensive unit tests in `lib/staff/__tests__/staff-actions.test.ts` verifying all action behaviors, calculation accuracy, and error handling.

---

## Phase 2: Route Guard Elevation Support

- [x] **TASK-2.1**: Update `lib/auth/session-guards.ts` and middleware:
  - Enhance `resolveSession` to detect `swift_admin_elevated` cookie.
  - Update `evaluateRouteAccess` so elevated sessions can access `/admin` portal routes without redirect loop.
- [x] **TASK-2.2**: Add test cases in `lib/auth/__tests__/session-guards.test.ts` (or equivalent) verifying elevation route access.

---

## Phase 3: UI Wiring & Component Refactors

- [x] **TASK-3.1**: Refactor `app/staff/clock/page.tsx`:
  - Wire shift buttons to `clockInShiftAction`, `clockOutShiftAction`, `toggleShiftBreakAction`.
  - Connect attendance history table to `getStaffAttendanceHistoryAction()`.
  - Integrate with `usePunchStore` and `useStaffRealtimeShifts` for drift-free real-time attendance sync.
- [x] **TASK-3.2**: Refactor `app/staff/pricecheck/page.tsx`:
  - Ensure input has id `#priceScanInput`.
  - Wire query to `lookupProductPriceAction(query)` with sub-200ms reactive display of Retail, Wholesale, and SC/PWD 20% discount.
- [x] **TASK-3.3**: Refactor `components/staff/admin-switch-modal.tsx`:
  - Wire PIN form submission to `verifyAdminElevationAction(pin)`.
  - Handle loading, invalid credentials error, and successful router push to `/admin`.
- [x] **TASK-3.4**: Verify `app/staff/pos/page.tsx`:
  - Ensure F12 hotkey opens checkout modal wired to `processCheckoutAction()`.
  - Verify active products hydrate from Supabase catalog.

---

## Phase 4: Convergence & Verification

- [x] **TASK-4.1**: Execute typecheck (`npx tsc --noEmit`), lint (`npm run lint`), and automated tests (`npm test`).
- [x] **TASK-4.2**: Verify SWIFT semantic design tokens compliance (zero hardcoded colors).
- [x] **TASK-4.3**: Commit changes following `.agents/rules/atomic-commit.md`.
