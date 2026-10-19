# Feature Specification: Shift Rehydration (Persist Active Shift & Elapsed Duration Across Browser Refresh)

**Feature Branch**: `feat/SIAA-79-shift-rehydration`  
**Created**: 2026-10-20  
**Status**: Ready for Clarification / Planning  
**Jira Issue**: [SIAA-79](https://the-three-devsketeers.atlassian.net/browse/SIAA-79)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (Staff Shop Floor Terminal & Time Clock)  
**Target View**: Staff Shop Floor Terminal Punch Clock (`/staff/clock` and `mockup/staff.html#view-staff-clock`)

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts retail and repair workshops, shop floor terminals (`Terminal #01`) are actively utilized by staff throughout the working day. Cashiers and technicians frequently navigate between the **Staff Punch Clock** (`/staff/clock`) and **Fast-Lane POS** (`/staff/pos`), or reload the web application (`F5` / Ctrl+R) during long shifts.

Currently, when an employee clocks in and subsequently refreshes the page or navigates back:
1. **In-Memory Volatility**: The client-side `PunchStore` resets to default values (`isShiftActive: false`, `shiftSeconds: 0`, `activeShiftId: null`).
2. **Destructive Hydration Wipe**: `StaffClockPage` (`app/staff/clock/page.tsx`) queries `getStaffAttendanceHistoryAction()` on mount. If the server query returns `activeShift: null` (e.g., due to network delay, offline mode, or profile scoping mismatch), `rehydrateShift(null)` is invoked, which forcefully resets the active shift to `idle`, wiping any ongoing local shift.
3. **Timer Drift & Reset**: When an active shift is restored, elapsed seconds were previously vulnerable to starting over from zero rather than computing true delta from the authoritative `clock_in` timestamp.
4. **Placeholder UUID on Clock Out / Break**: `PunchClockPanel` (`handleClockOut` and `handleToggleBreak`) fell back to a hardcoded placeholder UUID (`00000000-0000-0000-0000-000000000000`) if `activeShiftId` was lost or unset, causing clock-out RPCs to fail or hit mock fallbacks.
5. **Staff Session Desynchronization**: While `punchStore` tracks multi-staff sessions in `staffSessions[profileId]`, `rehydrateShift` omitted updating `staffSessions[currentProfileId]`, causing `clockOut` to throw an error (`Shift has already been clocked out or is not active`) because `staffSessions[currentProfileId].isShiftActive` remained `false`.

This specification defines the solution for **Shift Rehydration**:
1. **Authoritative Shift Rehydration**: Query and restore the active shift row from `public.staff_shifts` on mount or page reload, scoped to the current terminal operator.
2. **Authoritative UTC Elapsed Duration Engine**: Dynamically calculate elapsed seconds as `Math.floor((Date.now() - clockInMs) / 1000)` upon rehydration, ensuring the digital stopwatch resumes seamlessly without drift or reset.
3. **Non-Destructive Hydration Guard**: Prevent null/empty server responses from destructively clobbering an already active local shift state.
4. **Authoritative Shift ID Forwarding**: Ensure the genuine active shift UUID is retained in `activeShiftId` and passed to `clockOutShiftAction` and `toggleShiftBreakAction`.
5. **Multi-Staff Session State Synchronization**: Update both root store state and `staffSessions[profileId]` upon rehydration, maintaining session coherence across operator switches.
6. **SWIFT Design Tokens & Zero Hardcoded Colors**: Adhere strictly to semantic tokens in `app/globals.css` and `lib/tokens.ts`.

---

## 1.1 Clarifications

### Session 2026-10-20
- Q: How should elapsed duration be calculated for paused break shifts versus running shifts? → A: For `on_shift`, duration is dynamic: `Math.max(0, Math.floor((now - clockInMs) / 1000))`. For `break`, duration is frozen at the saved `duration_seconds` from the shift record.
- Q: What happens if an initial query returns `activeShift: null` but `localStorage` or local state indicates a shift is running? → A: Guard against destructive wipe: if local state is active and server returns `null` (such as in offline mode or during query resolution), retain local active state.
- Q: When multiple staff members use the same terminal kiosk, which shift is rehydrated? → A: `getStaffAttendanceHistoryAction` should scope the query by `profileId` (or return the active shift corresponding to `currentProfileId`), ensuring the selected operator sees their own shift.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-79)

* **As an** on-duty shop floor staff member,  
* **I want** my active shift status and live duration timer to automatically persist whenever the browser page is refreshed (F5) or navigated away from,  
* **So that** my tracked shift hours continue accurately without being reset to zero or idle.

---

### Scenario 1: Authoritative shift rehydration on page reload (Priority: P1)

* **Given** an employee has an active shift (`on_shift` or `break`) in `public.staff_shifts`
* **When** the employee reloads the browser (`F5`), navigates back from `/staff/pos`, or re-opens the tab
* **Then** `getStaffAttendanceHistoryAction()` retrieves the active shift from the database
* **And** `rehydrateShift` restores `isShiftActive: true`, the correct `activeShiftId`, and the status (`on_shift` or `break`)
* **And** `staffSessions[profileId]` is updated to match the active shift state.

---

### Scenario 2: Dynamic elapsed duration calculation (Priority: P1)

* **Given** an employee clocked in at `10:00:00 AM UTC`
* **When** the employee refreshes the page at `10:15:30 AM UTC`
* **Then** the shift duration timer automatically resumes ticking from `00:15:30` (calculated from `now - clock_in`) without losing time or starting over from zero.

---

### Scenario 3: Non-destructive hydration guard (Priority: P1)

* **Given** a locally active shift exists in the terminal store
* **When** the initial server query returns `activeShift: null` due to temporary network delay, offline mode, or unauthenticated fallback
* **Then** the local active shift state must NOT be wiped or reset to `idle`.

---

### Scenario 4: Finalization on Clock Out (Priority: P1)

* **Given** an active shift is running and has been rehydrated
* **When** the employee clicks "TIME OUT (SHIFT END)"
* **Then** `clockOutShiftAction` is called with the actual active `shiftId` (not `00000000-0000-0000-0000-000000000000`)
* **And** status transitions to `completed`, the timer halts, and the shift is marked finalized.

---

### Scenario 5: Multi-Staff Operator Shift Rehydration (Priority: P2)

* **Given** Staff A (Mike Morales) is `on_shift` and Staff B (Dante Reyes) is `idle`
* **When** switching to Staff B via `StaffProfileSwitcher`
* **Then** the terminal displays Staff B's idle status and zeroed timer
* **When** switching back to Staff A
* **Then** Staff A's running shift, correct shift ID, and live elapsed duration are immediately restored without data collision.

---

## 3. Edge Cases & Boundary Conditions

1. **Client Clock Skew**:
   If the client's local system clock is skewed behind the database `clock_in` timestamp (`now < clockInMs`), clamp elapsed duration to `0` (`Math.max(0, ...)`), preventing negative seconds.
2. **Break State Resume**:
   When rehydrating a shift with status `break`, the stopwatch must remain paused at the accumulated pre-break duration (`shift.duration_seconds`) until the employee toggles back to `on_shift`.
3. **Database Unavailable / Offline Kiosk**:
   When offline or Supabase environment variables are missing, `localStorage` fallback caches the active shift details so refreshing offline still preserves the active shift state.
4. **Invalid or Deleted Shift Record**:
   If a shift was explicitly finalized or deleted on another station, the CDC realtime subscriber (`handleRealtimeShiftUpdate`) or an authoritative rehydration with explicit `status: 'completed'` safely transitions the local state to `completed`.

---

## 4. Requirements & Non-Functional Constraints

- **Accessibility**: WCAG 2.1 AA compliant status announcements (`aria-live="assertive"`, `aria-label` on timer and status badges).
- **Design Tokens**: 100% adherence to SWIFT semantic tokens (`bg-bg-surface`, `text-success`, `text-accent`, etc.). Zero hardcoded hex/rgb.
- **Performance**: Rehydration calculation executes synchronously in <5ms; server action completes within <200ms.
- **Automated Verification**: Complete unit test coverage in `lib/store/__tests__/punch-store-realtime.test.ts` verifying rehydration, duration computation, non-destructive guard, and clock-out finalization.
