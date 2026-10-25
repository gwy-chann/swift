# Feature Specification: Immediate Auth Blocking & Session Revocation for Inactive Staff Accounts

**Feature Branch**: `feat/SIAA-103-auth-block-login-revoke-sessions-inactive-staff`

**Created**: 2026-10-26

**Status**: Ready for Planning

**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-103 - Auth: Immediately block login attempts and revoke sessions for inactive staff accounts"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Block Login Attempts for Inactive Staff (Priority: P1)

As a Workshop Administrator, I want inactive staff members to be blocked from authenticating into SWIFT across all entry points (email/password login and PIN-based terminal kiosk), so that former or offboarded personnel cannot access workshop data, customer work orders, inventory registers, or the Point of Sale.

**Why this priority**: Core security invariant preventing unauthorized access from de-provisioned or suspended staff members.

**Independent Test**: Can be tested by marking an active staff member as `Inactive` in the user ledger, attempting credential and PIN submission, and verifying that authentication is rejected with the exact security notice and zero session cookies created.

**Acceptance Scenarios**:

1. **Given** a staff member's account status is set to `Inactive` in the user ledger,
   **And Given** the staff member navigates to the login screen,
   **When** the staff member submits their valid email, password, and role selection,
   **Then** authentication is rejected with error code `ACCOUNT_INACTIVE`,
   **And Then** the system displays the message: *"Account is inactive. Please contact your workshop administrator."*,
   **And Then** no session cookies (`swift-session-role`, `swift-user-name`, `swift-session-user-id`) are written.

2. **Given** a staff member's account status is set to `Inactive`,
   **And Given** the terminal digital clock or Fast-Lane POS displays the PIN keypad modal,
   **When** the inactive staff member inputs their previously valid 4-digit PIN,
   **Then** the verification action rejects the attempt with error code `ACCOUNT_INACTIVE`,
   **And Then** the modal displays: *"Account is inactive. Please contact your workshop administrator."*,
   **And Then** no shift punch clock or cashier elevation occurs.

---

### User Story 2 - Immediate Invalidation of Active Sessions Upon Deactivation (Priority: P1)

As a Workshop Administrator, I want active sessions on any terminal or browser to be invalidated immediately when I toggle an employee's status to `Inactive`, so that deactivated employees are evicted from active workflows without waiting for session expiry.

**Why this priority**: Prevents a window of unauthorized activity if an employee is dismissed while actively logged into a POS terminal, inventory scanner, or bay queue.

**Independent Test**: Can be tested by maintaining an active staff session in a client, updating the employee's status to `Inactive` from the Admin Portal, performing any page transition or server action on the staff terminal, and verifying immediate termination, cookie cleanup, and redirection.

**Acceptance Scenarios**:

1. **Given** a staff member currently has an active session on a workshop terminal,
   **And Given** the Workshop Administrator updates that staff member's status to `Inactive` in the Admin User Ledger,
   **When** the staff member triggers any subsequent action or page transition (e.g., navigating from POS to Shelf Locator, adding an item to the cart, or punching time clock),
   **Then** the request is intercepted by session route guards,
   **And Then** the session is terminated, all authentication and elevation cookies are purged,
   **And Then** the client is redirected to `/login?notice=inactive`,
   **And Then** the login screen renders the warning banner: *"Account is inactive. Please contact your workshop administrator."*

2. **Given** a staff member is actively logged in,
   **When** an administrator toggles their status to `Inactive`,
   **Then** Supabase Auth sessions for that user ID are revoked via administrative sign-out,
   **And Then** the security audit trail logs a high-severity `ACCOUNT_DEACTIVATED_SESSION_TERMINATED` event.

---

### User Story 3 - Self-Lockout & Elevation Safety Invariants (Priority: P2)

As a Workshop Administrator, I want safeguards that prevent deactivating the last active Admin account or terminating an active Admin session inadvertently, ensuring system continuity while enforcing role integrity.

**Why this priority**: Prevents administrative deadlocks where workshop management locks themselves out of the system.

**Independent Test**: Can be tested by attempting to deactivate the primary Administrator account through the User Ledger, verifying rejection with `SELF_LOCKOUT_PREVENTED`.

**Acceptance Scenarios**:

1. **Given** the logged-in Administrator is managing the User Ledger,
   **When** the Administrator attempts to set their own profile status to `Inactive`,
   **Then** the action is rejected with `SELF_LOCKOUT_PREVENTED`,
   **And Then** the message *"Admin self-lockout or deactivation is prohibited."* is displayed.

---

### Edge Cases

- **Offline / Local Fallback Mode**: If Supabase connectivity is interrupted, status checks fall back to the in-memory authoritative store (`MOCK_STAFF_PROFILES`), ensuring that deactivation rules and rejection messages remain enforced in isolated workshop environments.
- **Race Condition During Ongoing Checkout**: If an administrator deactivates a cashier mid-checkout, the checkout transaction RPC checks account active status before committing stock decrements or processing payment, preventing unverified transactions.
- **Re-activation Workflow**: If an administrator re-enables an employee by changing status back to `Active`, the employee can log in immediately with their existing credentials without manual database token remediation.
- **PIN Pad Brute Force / Timing Attacks**: When an inactive account submits a PIN, the system validates status prior to evaluating PIN hash or timing-sensitive secrets to minimize exposure.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST verify the employee's `status` field (`Active` vs `Inactive` / `Suspended`) during email/password authentication in `authenticateUserAction`.
- **FR-002**: System MUST reject login attempts for any account with status `Inactive` with the exact user-facing message: *"Account is inactive. Please contact your workshop administrator."* and error code `ACCOUNT_INACTIVE`.
- **FR-003**: System MUST verify account status during 4-digit PIN authentication in `verifyStaffPinAction` and reject inactive accounts with code `ACCOUNT_INACTIVE`.
- **FR-004**: System MUST verify account active status in `getServerSession()` and `evaluateRouteAccess()` when inspecting incoming requests across protected route domains (`/staff/*`, `/admin/*`).
- **FR-005**: When an inactive staff session is detected in route guards, system MUST clear all session cookies (`swift-session-role`, `swift-user-name`, `swift-session-user-id`, `swift_admin_elevated`, `swift_active_shift_id`).
- **FR-006**: When an inactive staff session is intercepted, system MUST redirect the client to `/login?notice=inactive` (or `/login?error=ACCOUNT_INACTIVE`).
- **FR-007**: Login views (`app/page.tsx`, `app/(auth)/login/page.tsx`, `components/auth/login-form.tsx`) MUST parse the `notice=inactive` query parameter and render an accessible alert banner styled with SWIFT semantic design tokens (`var(--destructive)` / `var(--destructive-muted)`).
- **FR-008**: System MUST revoke active Supabase Auth sessions via `auth.admin.signOut(userId, 'all')` or update `session_version` / `revoked_at` when `toggleUserStatusAction` sets status to `Inactive`.
- **FR-009**: System MUST log a security audit event in the forensic ledger whenever an inactive login is blocked or an active session is revoked.
- **FR-010**: System MUST enforce self-lockout prevention so administrators cannot deactivate their own active administrative profiles.

### Key Entities

- **StaffUserProfile**: Represents an employee in the workshop ledger, containing `id` (UUID), `email` (string), `name` (string), `role` (`admin` | `cashier` | `mechanic` | `inventory`), `status` (`Active` | `Inactive` | `Suspended`), `pinCode` (string), `updatedAt` (ISO timestamp).
- **SessionVerificationResult**: Evaluated during route guard checks and server actions, indicating `isValid` (boolean), `statusCode` (`VALID` | `ACCOUNT_INACTIVE` | `SESSION_EXPIRED` | `UNAUTHENTICATED`), and `reason` (string).
- **AuthActionResult**: Standardized return payload for login and PIN verification, returning `success` (boolean), `code` (`ACCOUNT_INACTIVE` | `INVALID_CREDENTIALS` | etc.), `error` (user-facing message), and optional `session` / `redirectTo`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of login attempts from accounts marked `Inactive` are rejected across both credential login and PIN kiosk authentication.
- **SC-002**: Active sessions belonging to deactivated staff members are terminated upon their very next request or page transition, with zero data leakage or unauthorized mutations.
- **SC-003**: Inactive rejection response displays the exact prescribed user-facing notification string in under 200ms.
- **SC-004**: Zero regressions across existing test suites (all 704 unit/integration tests passing).

## Assumptions

- Workshop user accounts are identified by UUID primary keys in `public.profiles` matching Supabase Auth `auth.users(id)`.
- The system supports both online Supabase mode and zero-dependency offline mock mode (`MOCK_STAFF_PROFILES`), and both implementations must enforce identical status check rules.
- Administrator accounts retain status `Active` and cannot be deactivated by the calling admin.
