# Feature Specification: Staff Terminal Server Actions, Secure Elevation Auth & UI Wiring

**Feature Branch**: `feat/SIAA-64-staff-terminal-server-actions-elevation`  
**Created**: 2026-10-14  
**Status**: Ready for Implementation  
**Jira Ticket**: [SIAA-64](https://the-three-devsketeers.atlassian.net/browse/SIAA-64) (STORY-5.9)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Type-Safe Server Actions Layer for Shift Punch Clocking (Priority: P1)

As a Shop Staff Member or Store Attendant,  
I want type-safe Next.js Server Actions for Shift Clock-In, Clock-Out, and Attendance Timesheet History retrieval,  
so that the terminal executes persistent database updates via Supabase RPCs with automatic tag revalidation (`['staff-shifts']`) and full offline resilience.

**Why this priority**: Staff shift clocking is the core attendance and payroll tracking mechanism on the shop floor. Server Actions bridge the client UI with backend RPCs while revalidating cached timesheets.

**Independent Test**: Can be tested by invoking `clockInShiftAction()`, `clockOutShiftAction()`, and `getStaffAttendanceHistoryAction()` against database/mock fallbacks and asserting successful records, duration calculations, and tag revalidations.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Staff Member Clocks In via Server Action
  Given an authenticated staff member on Terminal #01
  When clockInShiftAction("Terminal #01", "Morning Shift") is dispatched
  Then a new active shift is created in public.staff_shifts
  And an immutable audit entry is recorded in public.staff_shift_audit_logs
  And cache tag "staff-shifts" is revalidated

Scenario: Staff Member Clocks Out via Server Action
  Given an active shift with shiftId "UUID-1234"
  When clockOutShiftAction("UUID-1234", "Shift completed smoothly") is dispatched
  Then the shift status is updated to "completed" with authoritative duration
  And punch clock history reflects the completed duration
  And cache tag "staff-shifts" is revalidated

Scenario: Attendance History Retrieval
  Given recent shift records in public.staff_shifts
  When getStaffAttendanceHistoryAction(10) is invoked
  Then it returns up to 10 mapped PunchLog items ordered by clock_in descending
```

---

### User Story 2 - Sub-200ms Instant SKU / Barcode Price Checker Wiring (Priority: P1)

As a Cashier or Shop Floor Staff Member,  
I want an instant price lookup Server Action wired to `#priceScanInput` on `/staff/pricecheck`,  
so that scanning a barcode or typing a SKU returns retail price, wholesale price, 20% SC/PWD discount, stock count, and warehouse rack/shelf location in under 200ms without page reloads.

**Why this priority**: Customers regularly ask for item price inquiries on the shop floor. The lookup must be lightning fast (<200ms) and provide immediate clarity on retail, bulk wholesale, and senior citizen/PWD discounts.

**Independent Test**: Can be tested by querying `lookupProductPriceAction("YAM-NMAX-BL01")` and verifying the returned DTO contains all 3 pricing tiers, exact shelf coordinates, and completes within 200ms.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Instant SKU Price and Rack Location Lookup
  Given an input field with id "#priceScanInput" on app/staff/pricecheck/page.tsx
  When a barcode "YAM-NMAX-BL01" is scanned or entered
  Then lookupProductPriceAction("YAM-NMAX-BL01") is invoked
  And it returns retail price ₱380.00, wholesale price ₱320.00, and SC/PWD price ₱304.00
  And it returns stock quantity 42 and rack location "RACK-A1-04"
  And the result renders reactively without page reload in under 200ms

Scenario: Unknown SKU Scanned
  Given a barcode "UNKNOWN-9999" not in the catalog
  When lookupProductPriceAction("UNKNOWN-9999") is invoked
  Then it returns success: false with error "Product not found"
  And the UI displays a clean "No Part Found" message
```

---

### User Story 3 - Secure Master Admin Elevation Guard & Session Cookie (Priority: P1)

As a Store Manager or Administrator,  
I want a secure PIN elevation Server Action (`verifyAdminElevationAction`) in `components/staff/admin-switch-modal.tsx`,  
so that entering the master PIN validates against secure credentials, logs the elevation attempt to `audit_logs`, sets an HTTP-only session cookie (`swift_admin_elevated`), and seamlessly grants access to `/admin`.

**Why this priority**: Unattended shop floor terminals must prevent unauthorized staff or customers from navigating into sensitive admin settings and financial analytics. Elevation must be cryptographically protected and auditable.

**Independent Test**: Can be tested by submitting valid and invalid PINs to `verifyAdminElevationAction()`, verifying HTTP-only cookie setting and audit log entries, and testing `session-guards` route clearance for elevated sessions.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Successful Admin Elevation with Valid PIN
  Given a manager opening the Admin Portal Access modal from the staff terminal
  When the manager enters the correct admin PIN into the PIN input
  Then verifyAdminElevationAction(pin) returns success: true
  And a secure HTTP-only cookie "swift_admin_elevated" is set with appropriate Max-Age
  And an elevation event is appended to public.audit_logs
  And the browser redirects to "/admin" without route guard bounce-back

Scenario: Failed Admin Elevation with Invalid PIN
  Given an incorrect PIN entered into the elevation modal
  When verifyAdminElevationAction("0000") is dispatched
  Then it returns success: false with code "INVALID_CREDENTIALS"
  And an unauthorized elevation attempt is logged to public.audit_logs
  And the user remains on the staff portal with a high-contrast error message
```

---

### User Story 4 - Fast-Lane POS Hotkey Integration & Live Catalog Wiring (Priority: P1)

As a Cashier on the Fast-Lane POS,  
I want `/staff/pos` wired to active Supabase catalog records with `F12` hotkey triggering checkout through `processCheckoutAction()`,  
so that cashiers can complete transactions entirely via keyboard shortcuts without relying on mock inventory.

**Why this priority**: Fast-lane operations demand rapid physical checkout. Hotkey `F12` enables seamless cash drawer and modal triggering.

**Independent Test**: Can be tested by mounting `app/staff/pos/page.tsx`, simulating `F12` keydown, and verifying payment modal opens and dispatches `processCheckoutAction()`.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: F12 Hotkey triggers Fast-Lane POS Payment
  Given items loaded into the Fast-Lane POS cart
  When the cashier presses keyboard hotkey "F12"
  Then the CashTenderModal opens immediately
  And confirming payment invokes processCheckoutAction()
  And completed checkout updates stock and prints thermal receipt
```

---

## Requirements *(mandatory)*

### Functional Requirements

1. **Server Actions Module (`lib/staff/actions.ts`)**:
   - `clockInShiftAction(terminalId?: string, notes?: string)`: Invokes `public.clock_in_shift` RPC with fallback to local store/Prisma; revalidates tag `staff-shifts`.
   - `clockOutShiftAction(shiftId: string, notes?: string)`: Invokes `public.clock_out_shift` RPC; revalidates tag `staff-shifts`.
   - `toggleShiftBreakAction(shiftId: string)`: Invokes `public.toggle_shift_break` RPC; revalidates tag `staff-shifts`.
   - `getStaffAttendanceHistoryAction(limit?: number)`: Queries `public.staff_shifts` ordered by `clock_in DESC`; formats as `PunchLog[]`.
   - `lookupProductPriceAction(query: string)`: Queries `public.products` by exact SKU or barcode (case-insensitive) or partial name, computing retail, wholesale, and 20% SC/PWD price; executes in <200ms.
   - `verifyAdminElevationAction(pin: string)`: Validates PIN against admin credential; sets encrypted HTTP-only cookie `swift_admin_elevated`; records audit entry in `audit_logs`.

2. **Route Guard & Elevation Support (`lib/auth/session-guards.ts`)**:
   - Update `resolveSession` and `evaluateRouteAccess` to inspect `swift_admin_elevated` cookie.
   - When elevated, permit access to `/admin` routes even when logged in as staff role.

3. **Punch Clock UI Refactor (`app/staff/clock/page.tsx`)**:
   - Bind "Clock In", "Clock Out", and "Take Break" buttons to `clockInShiftAction`, `clockOutShiftAction`, and `toggleShiftBreakAction`.
   - Wire attendance history table to `getStaffAttendanceHistoryAction()` on mount and upon punch actions.
   - Integrate with `usePunchStore` and `useStaffRealtimeShifts` for drift-free timer and real-time CDC updates.

4. **Price Check UI Refactor (`app/staff/pricecheck/page.tsx`)**:
   - Ensure scan input has id `priceScanInput`.
   - Debounce / trigger query via `lookupProductPriceAction(skuOrBarcode)`.
   - Display retail, wholesale, SC/PWD 20% discount price, live stock quantity, and location coordinates.

5. **Master Admin Elevation Modal Refactor (`components/staff/admin-switch-modal.tsx`)**:
   - Replace simulated `setTimeout` entry with `verifyAdminElevationAction(pin)`.
   - Handle loading, error states, and router push to `/admin`.

6. **Fast-Lane POS Hotkey Integration (`app/staff/pos/page.tsx`)**:
   - Verify active products hydrate from Supabase catalog.
   - Ensure `F12` hotkey triggers payment modal wired to `processCheckoutAction()`.

### Success Criteria

- All Server Actions are 100% type-safe with explicit return types and no `any`.
- Instant SKU price lookup responds in under 200ms.
- Admin elevation sets secure HTTP-only cookie `swift_admin_elevated` and records audit entry.
- All UI colors strictly adhere to SWIFT semantic tokens (`bg-bg-surface`, `text-text-primary`, `bg-primary`, etc.). Zero hardcoded colors.
- Full TypeScript compilation passes with zero errors (`npx tsc --noEmit`).
