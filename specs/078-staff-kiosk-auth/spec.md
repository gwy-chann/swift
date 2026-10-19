# Feature Specification: Staff Kiosk Authentication (Link Terminal Clock-In to Employee Profiles)

**Feature Branch**: `feat/SIAA-78-staff-kiosk-auth`  
**Created**: 2026-10-20  
**Status**: Ready for Clarification / Planning  
**Jira Issue**: [SIAA-78](https://the-three-devsketeers.atlassian.net/browse/SIAA-78)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (Staff Shop Floor Terminal & Time Clock)  
**Target View**: Staff Shop Floor Terminal Punch Clock (`/staff/clock` and `mockup/staff.html#view-staff-clock`)

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts retail and repair workshops, shop floor terminals (`Terminal #01`) are shared among cashiers, parts clerks, and mechanics throughout operating hours. 

Currently, the Staff Portal (`/staff/clock`) renders with a default mock staff user (`Mike Morales`) without an active Supabase user session token (`auth.uid()` is null). When calling `clockInShiftAction()`, the Postgres RPC `clock_in_shift()` rejects the request with error code `28000` (`UNAUTHENTICATED`) because `auth.uid()` is null. The server action catches this error and returns a mock fallback, meaning no real row is ever inserted into `public.staff_shifts` or `public.staff_shift_audit_logs`. Furthermore, on shared physical terminals, different staff members cannot independently punch in/out without corrupting or overriding the current active terminal state.

This specification implements **Staff Kiosk Authentication**:
1. **Shared Terminal Staff Identification & PIN Verification**: Introduce a quick staff profile selector and 4-digit PIN verification modal on `/staff/clock` for cashier and mechanic accounts.
2. **Database-Persistent RPC Execution**: Adapt `clockInShiftAction`, `clockOutShiftAction`, `toggleShiftBreakAction`, and the Postgres stored procedures (`public.clock_in_shift`, `public.clock_out_shift`, `public.toggle_shift_break`) to support authenticated employee `profile_id` resolution from verified terminal credentials.
3. **Multi-Staff Shared Kiosk Resilience**: Support switching between staff profiles on the shared terminal while preserving each staff member's distinct shift status (`on_shift`, `break`, `completed`, `idle`), accurate accumulated elapsed seconds, and attendance audit logs in `public.staff_shifts`.
4. **Token & Mock Consistency**: Adhere strictly to SWIFT semantic design tokens (`lib/tokens.ts`, `app/globals.css`) with zero hardcoded colors.

---

## 1.1 Clarifications

### Session 2026-10-20
- Q: What credential format should be used for frontline kiosk authentication? → A: Standard 4-digit numeric PIN with touchscreen keypad support.
- Q: How should staff switch identities on a shared terminal? → A: Quick profile switcher displaying employee cards/pills; selecting an employee opens the PIN verification modal if not yet authenticated.
- Q: What happens to an ongoing shift when switching employees on the shared terminal? → A: The previous employee's shift and elapsed timer continue running uninterrupted in state and database; the newly authenticated employee sees their own dedicated timer and status.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-78)

* **As a** shop floor cashier or mechanic,  
* **I want** to authenticate at the shared terminal via a 4-digit PIN or staff profile selector,  
* **So that** my shift clock-in is securely recorded under my actual employee profile in the centralized database rather than falling back to in-memory mock data.

---

### Scenario 1: Staff Authentication via PIN or Profile Selection (Priority: P1)

* **Given** a staff member opens the Staff Punch Clock (`/staff/clock`) on a shared terminal
* **When** the staff member initiates clock-in or selects their employee profile
* **Then** the terminal prompts for employee identification (e.g., staff member selection and 4-digit PIN) if no staff session is currently active or when switching employees
* **And** validating the credentials securely resolves the corresponding employee `profile_id` from `public.profiles` or authoritative mock profiles.

---

### Scenario 2: Successful Database Persistence on Clock-In (Priority: P1)

* **Given** an authenticated staff member with a valid resolved `profile_id`
* **When** the staff member confirms "TIME IN (SHIFT START)"
* **Then** the Server Action executes `clock_in_shift` against Postgres
* **And** a new row is created in `public.staff_shifts` with `profile_id`, `status: 'on_shift'`, terminal attribution (`Terminal #01`), and server timestamp
* **And** an immutable audit record is logged in `public.staff_shift_audit_logs`.

---

### Scenario 3: Multi-Staff Terminal Switching (Priority: P1)

* **Given** an existing shift is active for Staff A (e.g., Mike Morales)
* **When** Staff B (e.g., Dante Reyes) logs in or punches in on the same physical terminal
* **Then** the terminal displays Staff B's individual shift status and running duration without corrupting Staff A's recorded hours or active shift record.

---

### Scenario 4: Shift Clock-Out and Break State Persistence (Priority: P2)

* **Given** an authenticated staff member on shift
* **When** the staff member toggles break or clocks out
* **Then** the corresponding action (`toggle_shift_break` or `clock_out_shift`) is persisted with their employee `profile_id` and shift ID
* **And** attendance history and cache tags (`staff-shifts`) are revalidated reactively.

---

### Scenario 5: Offline & Unconfigured Fallback Gracefulness (Priority: P2)

* **Given** Supabase environment variables are absent or the database is temporarily unreachable
* **When** a staff member enters their valid PIN
* **Then** the system falls back gracefully to local reactive store state (`usePunchStore`) with an informative notification
* **And** UI functionality is never crashed or frozen.

---

## 3. Edge Cases & Boundary Conditions

1. **Incorrect PIN Entered**:
   If an invalid 4-digit PIN is entered, clear the input, present an accessible error message ("Invalid employee PIN. Please try again."), and allow retry without locking out legitimate operators on the shared floor terminal.
2. **Duplicate Active Shift Prevention**:
   If Staff A is already `on_shift` and attempts to clock in again, reject with `ACTIVE_SHIFT_EXISTS` code and prevent duplicate row insertion.
3. **Switching Staff During Active Shift**:
   When Staff B authenticates while Staff A is clocked in, Staff A's shift continues running in the background and is not ended; switching back to Staff A restores their active timer.
4. **Fast POS Cashier Sync**:
   Once Staff A clocks in via terminal kiosk auth, the active cashier in Fast-Lane POS (`/staff/pos`) reflects Staff A's identity and active shift state.

---

## 4. Functional Requirements

- **FR-001**: Staff terminal MUST provide a PIN-protected staff switcher modal or credential selector allowing staff (cashiers, mechanics, inventory clerks) to authenticate at the terminal.
- **FR-002**: System MUST provide a server action (`verifyStaffPinAction`) verifying the entered 4-digit PIN against the staff profile.
- **FR-003**: System MUST adapt `clockInShiftAction`, `clockOutShiftAction`, and `toggleShiftBreakAction` to accept and pass `profileId` to the underlying database procedures.
- **FR-004**: Database migration MUST adapt stored procedure `public.clock_in_shift(p_terminal_id, p_notes, p_profile_id)` to accept an authorized employee profile ID when called from server actions with terminal authentication.
- **FR-005**: Database migration MUST adapt stored procedures `public.clock_out_shift` and `public.toggle_shift_break` to support profile-attributed shift termination and break toggling.
- **FR-006**: Client state in `usePunchStore` MUST support multi-staff shift tracking so switching profiles on the kiosk preserves individual elapsed timers and states.
- **FR-007**: `PunchClockPanel` MUST render an accessible staff switcher button/badge showing the active employee name with a "Switch Staff" trigger.
- **FR-008**: All UI elements MUST strictly utilize SWIFT semantic tokens (`bg-bg-surface`, `text-text-primary`, `border-border`, etc.) with zero hardcoded hex/RGB values.

---

## 5. Key Entities & Data Models

### Employee Profile (`public.profiles`)
- `id`: UUID (Primary Key)
- `full_name`: Text (e.g., "Mike Morales", "Dante Reyes", "Rico Santos")
- `email`: Text (e.g., "cashier@swift.local", "mechanic1@swift.local")
- `role`: `user_role` (`admin`, `staff`, `cashier`, `mechanic`)
- `pin`: Text or hash (4-digit kiosk PIN, e.g. "1234", "2222", "3333", "4444")

### Staff Shift (`public.staff_shifts`)
- `id`: UUID (Primary Key)
- `profile_id`: UUID (Foreign Key to `public.profiles.id`)
- `staff_name`: Text
- `terminal_id`: Text (e.g. "Terminal #01 - Shop Floor")
- `clock_in`: TIMESTAMPTZ
- `clock_out`: TIMESTAMPTZ (nullable)
- `duration_seconds`: Integer
- `status`: Shift status (`on_shift`, `break`, `completed`)
- `notes`: Text (nullable)

### Staff Shift Audit Log (`public.staff_shift_audit_logs`)
- `id`: UUID (Primary Key)
- `shift_id`: UUID
- `profile_id`: UUID
- `terminal_id`: Text
- `action`: Text (`clock_in`, `clock_out`, `break_start`, `break_end`)
- `created_at`: TIMESTAMPTZ

---

## 6. Success Criteria

### Measurable Outcomes
- **SC-001**: Staff can select their profile and authenticate with a 4-digit PIN in under 3 seconds.
- **SC-002**: 100% of clock-in actions for authenticated staff resolve a real `profile_id` and insert persistent rows into `public.staff_shifts` when connected to Supabase.
- **SC-003**: Multi-staff switching on a single terminal displays accurate, isolated shift statuses for Staff A and Staff B with zero state collision or timer corruption.
- **SC-004**: 100% test pass rate for staff authentication, shift persistence, and multi-staff store switching.
- **SC-005**: 100% compliance with SWIFT semantic design tokens and WCAG 2.1 AA accessibility guidelines.

---

## 7. Assumptions & Dependencies

- **Kiosk Terminal Model**: A physical shop floor terminal is treated as a shared kiosk workstation where multiple employees punch in and out during the workday.
- **Pre-Configured Staff Profiles**: Standard demo personas (`Mike Morales`, `Dante Reyes`, `Rico Santos`, `Carlos Rodriguez`) have default 4-digit PINs (`1234`, `2222`, `3333`, `8888`) for kiosk authentication.
- **Security Scope**: Kiosk PIN authentication is scoped to front-line attendance punching and terminal profile switching, while Master Admin elevation continues to require administrative credentials via `verifyAdminElevationAction`.
