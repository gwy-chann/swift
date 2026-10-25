# Feature Specification: Auth: Enforce Two-Step Login Sequence (Password then PIN) for All Staff Roles

**Feature Branch**: `feat/SIAA-106-two-step-login-staff-roles`  
**Created**: 2026-10-26  
**Status**: Ready for Implementation  
**Jira Ticket**: [SIAA-106](https://the-three-devsketeers.atlassian.net/browse/SIAA-106)  
**Parent Epic**: [SIAA-8](https://the-three-devsketeers.atlassian.net/browse/SIAA-8) (Authentication Hub & Role-Based Access Control)  
**Prerequisites**: [SIAA-104](https://the-three-devsketeers.atlassian.net/browse/SIAA-104) (Admin Staff Credential Provisioning & Reset), [SIAA-105](https://the-three-devsketeers.atlassian.net/browse/SIAA-105) (Baseline Staff Profiles & PIN Seeding), [SIAA-103](https://the-three-devsketeers.atlassian.net/browse/SIAA-103) (Inactive Staff Session Revocation)  
**Target Scope**: Authentication Hub (`app/page.tsx`, `app/(auth)/login/page.tsx`, `components/auth/*`, `lib/auth/*`, `lib/supabase/middleware.ts`)

---

## Executive Summary & Business Intent

SWIFT workshop terminals (Fast-Lane POS, Repair Bay Work Orders, Parts Inventory) are deployed in fast-paced retail and garage environments. Staff members (Cashiers, Mechanics, and Inventory Clerks) share workstation hardware while managing sensitive cash tenders, parts inventory decrements, and repair work order assignments. Previously, staff authentication in the primary Authentication Hub (`/login`) permitted immediate single-step session establishment via email and password, omitting the essential physical-presence verification of the staff member's numeric PIN.

This feature establishes a mandatory, sequential two-step authentication ceremony for all staff roles:
1. **Step 1 (Identity & Password Verification)**: Staff member submits their dedicated email and password. Upon successful verification of active credentials, the system enters an intermediate "PIN Challenge" state without establishing a full authorized session.
2. **Step 2 (Keypad PIN Challenge)**: The UI transitions dynamically to a dedicated numeric keypad view where the staff member inputs their 4-to-6 digit PIN.
3. **Session Completion**: Validating the correct PIN finalizes authentication, sets authoritative session cookies, and dispatches the staff member to their role-assigned portal destination.
4. **Direct URL Bypass Prevention**: Attempting to bypass Step 2 and navigate directly to protected staff routes (e.g. `/staff/pos`, `/staff/work-orders`) triggers session guard interception, immediately redirecting back to the authentication screen with the PIN challenge pending.

---

## User Scenarios & Acceptance Criteria (Mike Cohn Format)

### User Story 1 - Two-Step Sequential Staff Login (Priority: P1)

* **As a** Staff Member (Cashier, Mechanic, or Inventory Clerk),  
* **I want to** enter my dedicated email and password in Step 1 and subsequently be prompted to type my PIN in Step 2,  
* **so that** my staff account is verified through two distinct credential steps before I am granted access to my role-specific workshop portal.

**Why this priority**: Core security architecture invariant; prevents unauthorized terminal session takeover and guarantees physical operator presence.

**Independent Test**: Navigate to `/login` (or `/` with Staff role selected). Enter valid staff email (e.g., `cashier@swift.local`) and password. Click "Continue" / submit. Verify that the form transitions to the Step 2 "Enter PIN" keypad view without redirecting to `/staff/pos` yet.

**Acceptance Scenarios**:
```gherkin
Scenario: Successful completion of two-step staff login
  Given I am on the SWIFT Staff Login portal at "/login"
  And I enter my valid email and password in Step 1
  When I click "Continue" or submit the form
  Then the UI transitions to the Step 2 "Enter PIN" keypad view without redirecting to the dashboard yet.

Scenario: PIN entry completes session authorization
  Given I am on the Step 2 "Enter PIN" screen
  When I enter my matching 4-to-6 digit PIN and submit
  Then the session is authorized, cookies are set, and I am redirected to my assigned portal dashboard.
```

---

### User Story 2 - Incorrect PIN Terminal Lockdown (Priority: P1)

* **As a** Workshop Administrator or Terminal Operator,  
* **I want** the system to reject invalid PIN entries with a clear error prompt and refuse session issuance,  
* **so that** unauthorized individuals cannot guess or brute-force access into the staff terminal.

**Why this priority**: Fundamental terminal security barrier preventing session token issuance upon bad PIN.

**Independent Test**: Complete Step 1 with valid staff credentials. On Step 2, type an incorrect PIN (e.g., `9999`) and submit. Verify error message *"Invalid PIN. Please try again."* displays, PIN input resets, and no full session cookies (`swift-session-role`) are granted.

**Acceptance Scenarios**:
```gherkin
Scenario: Incorrect PIN prevents terminal access
  Given I have passed Step 1 (Password verified) and am on Step 2 (Enter PIN)
  When I enter an incorrect PIN
  Then access is denied, an error indicates "Invalid PIN. Please try again.", and no session token is granted.
```

---

### User Story 3 - Direct Route Access & Bypass Prevention (Priority: P1)

* **As a** System Auditor or Security Officer,  
* **I want** route session guards to intercept any attempt to access `/staff/*` routes with only Step 1 completed,  
* **so that** direct URL navigation cannot bypass the mandatory second-step PIN requirement.

**Why this priority**: Guard against client-side tampering, URL jumping, or premature session state elevation.

**Independent Test**: Initiate Step 1 for a staff user. Attempt to manually navigate to `/staff/pos`, `/staff/work-orders`, or `/staff/pricecheck`. Verify the request is rejected and redirected back to the authentication screen with the PIN challenge pending.

**Acceptance Scenarios**:
```gherkin
Scenario: Direct URL bypass prevention
  Given a client submits valid Step 1 credentials but attempts to navigate directly to staff routes without submitting the Step 2 PIN
  When route session guards evaluate the request
  Then the request is rejected and redirected back to the authentication screen with the PIN challenge pending.
```

---

### User Story 4 - Seamless Demo Account Switching with Two-Step Preserved (Priority: P2)

* **As a** Developer, QA Engineer, or Workshop Evaluator,  
* **I want** clicking a Demo Staff Account button (Cashier, Mechanic, Clerk) to prefill Step 1 credentials and advance through the standard Step 2 PIN verification flow,  
* **so that** demonstration workflows test the exact production two-step security path.

**Why this priority**: Guarantees zero bifurcation between demo mock paths and production authentication flows.

**Independent Test**: Click "Use Cashier" from the Demo Credentials box. Verify Step 1 fields are filled. Submit Step 1, verify Step 2 keypad appears with cashier name displayed, and entering `1234` logs into `/staff/pos`.

---

## Clarifications

### Session 2026-10-26
- Q: How does Admin login behave in the Authentication Hub? → A: Admin accounts log in via email and password directly to `/admin`; the two-step PIN requirement applies strictly to staff roles (Cashier, Mechanic, Inventory Clerk).
- Q: What digit lengths are accepted for staff PIN in Step 2? → A: PINs must be strictly 4 to 6 numeric digits (`/^\d{4,6}$/`), matching the canonical schema ratified in SIAA-104.
- Q: How should the user return to Step 1 if they entered the wrong email? → A: The Step 2 keypad view must provide a "Back / Switch User" button that cancels the pending challenge and returns to Step 1 with previous email preserved.

---

## Functional Requirements & Constraints

- **FR-001 (Step 1 Credential Verification)**: `initiateStaffLoginAction` MUST verify email and password against Supabase Auth (or authorized demo accounts) and verify the account is active. Upon success, it issues a signed/encrypted pending challenge token/cookie (`swift-pending-staff-auth`) containing `userId`, `email`, `role`, and `pendingPinChallenge: true`.
- **FR-002 (No Premature Session Grant)**: `initiateStaffLoginAction` MUST NOT set the authoritative `swift-session-role` cookie or grant staff dashboard authorization.
- **FR-003 (Step 2 PIN Verification Action)**: `completeStaffTwoStepLoginAction` MUST accept `pin` and the active challenge context, validate that `pin` conforms to `/^\d{4,6}$/`, and verify against `profiles.pin_code` (or demo profile PIN).
- **FR-004 (PIN Failure Response)**: If the PIN is incorrect, `completeStaffTwoStepLoginAction` MUST return `{ success: false, error: "Invalid PIN. Please try again.", code: "INVALID_PIN" }` without setting session cookies.
- **FR-005 (Successful Session Finalization)**: Upon valid PIN entry, `completeStaffTwoStepLoginAction` MUST delete `swift-pending-staff-auth`, set standard cookies (`swift-session-role`, `swift-user-name`, `swift-session-user-id`), and return the target role route (e.g. `/staff/pos` for Cashier, `/staff/work-orders` or `/staff/compat` for Mechanic, `/staff/pricecheck` or `/staff/search` for Inventory Clerk).
- **FR-006 (Route Session Guard Interception)**: `evaluateRouteAccess` and `resolveSession` in `lib/auth/session-guards.ts` MUST classify requests having only a pending challenge cookie as unauthenticated for `/staff/*` routes, returning `{ action: 'REDIRECT', destination: '/login?notice=pin_required' }`.
- **FR-007 (Step 2 UI Keypad Presentation)**: The UI in `components/auth/` MUST present an interactive numeric keypad (digits 0-9, backspace, clear) along with visual PIN dot indicators, conforming to SWIFT design tokens (`bg-bg-card`, `border-border`, `text-text-primary`, `bg-primary`, `bg-secondary`).
- **FR-008 (Audit Trail Logging)**: Successful and failed PIN verification attempts MUST trigger security audit logging via `logSecurityEventAction` with event type `AUTH_STEP2_VERIFY` or `AUTH_STEP2_FAILED`.

---

## Success Criteria & Measurable Outcomes

- **SC-001 (100% Staff Two-Step Enforcement)**: Zero staff logins can reach `/staff/*` without successfully submitting both password and PIN.
- **SC-002 (Bypass Protection)**: Direct HTTP requests to `/staff/*` with only Step 1 cookies are 100% intercepted and redirected to `/login`.
- **SC-003 (Keypad Responsiveness)**: Keypad inputs register with <50ms interaction latency on desktop and mobile touchscreens.
- **SC-004 (Error Messaging Precision)**: Exactly `"Invalid PIN. Please try again."` is rendered on incorrect PIN submission.
