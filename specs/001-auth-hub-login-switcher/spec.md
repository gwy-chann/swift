# Feature Specification: Role-Based Authentication Hub & Login Switcher

**Feature Branch**: `feat/SIAA-8-auth-hub-login-switcher`

**Created**: 2026-10-06

**Status**: Draft

**Input**: User description: "STORY-1.1: Role-Based Authentication Hub & Login Switcher (Jira: SIAA-8). As a shop employee (Admin, Cashier, or Mechanic), I want to toggle between the Admin and Staff portal options on the login screen with quick credential fill, so that I am immediately routed to my appropriate operational interface without credential confusion or delay."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Administrator Portal Access (Priority: P1)

Shop administrators and managers need a dedicated, secure entry point to access high-level workshop analytics, inventory management, supplier relations, and employee records.

**Why this priority**: Essential administrative and managerial operations cannot take place without a secure, dedicated login pathway for store managers and owners.

**Independent Test**: Can be tested independently by navigating to the login hub, selecting the "Admin Portal" mode, submitting valid administrator credentials, and verifying immediate redirection to the `/admin` dashboard.

**Acceptance Scenarios**:

1. **Given** a user is on the `/login` hub, **When** they select the "Admin Portal" tab, enter valid administrator credentials, and submit the login form, **Then** the system establishes an authenticated administrator session and redirects to the `/admin` dashboard.
2. **Given** an administrator attempts login with incorrect credentials, **When** they submit the form, **Then** the system displays a clear, accessible error alert explaining the failure without clearing valid field inputs or causing page reloads.

---

### User Story 2 - Staff Shop Floor & Fast-Lane POS Access (Priority: P1)

Cashiers and mechanics working on the shop floor need quick, frictionless access to the Fast-Lane Point of Sale (POS) and workshop tools without navigating administrative views.

**Why this priority**: Fast-Lane POS operations directly generate revenue and service customer flow; cashiers and mechanics must log in without cognitive load or configuration friction.

**Independent Test**: Can be tested independently by selecting the "Staff Portal" mode, entering valid cashier/mechanic credentials, and verifying immediate routing to `/staff/pos`.

**Acceptance Scenarios**:

1. **Given** a shop floor worker is on the `/login` hub, **When** they select the "Staff Portal" tab and authenticate with valid staff credentials, **Then** the system establishes a staff session and routes directly to the `/staff/pos` Fast-Lane terminal interface.
2. **Given** a staff user is on the login page, **When** they switch between "Admin Portal" and "Staff Portal" tabs, **Then** the interface updates dynamic heading text, action button labels (e.g., "Access Staff Fast-Lane POS" vs. "Access Admin Portal"), and relevant demo cues instantly.

---

### User Story 3 - Rapid Evaluation & Demo One-Click Credential Autofill (Priority: P2)

Testers, evaluators, and onboarding employees need one-click demo credential filling to switch between test personas without manually typing emails and passwords.

**Why this priority**: Accelerates evaluation, stakeholder demos, automated E2E testing, and reduces onboarding friction across multiple simulated workshop roles.

**Independent Test**: Can be tested independently by clicking the "Use Admin" or "Use Staff" demo buttons and confirming that credentials auto-populate and the matching role tab activates immediately.

**Acceptance Scenarios**:

1. **Given** an evaluator is on the `/login` hub, **When** they click "Use Admin", **Then** the email input is populated with the demo administrator email, the password input is filled, and the active role tab switches to "Admin Portal".
2. **Given** an evaluator is on the `/login` hub, **When** they click "Use Staff", **Then** the email input is populated with the demo staff account, the password input is filled, and the active role tab switches to "Staff Portal".

---

### User Story 4 - Terminal Role Preference Persistence (Priority: P3)

Dedicated shop floor hardware terminals or back-office computers need to remember their primary operational mode across browser launches.

**Why this priority**: Prevents cashiers on POS terminals or managers in back offices from having to manually toggle their default portal role every morning.

**Independent Test**: Can be tested independently by enabling "Remember this terminal", logging in, reloading the page or returning in a new session, and verifying the chosen portal role is pre-selected by default.

**Acceptance Scenarios**:

1. **Given** a user enables the "Remember this terminal" checkbox and completes login as "Staff Portal", **When** the login page is loaded on subsequent visits on the same device, **Then** the "Staff Portal" role tab is active by default.

---

### Edge Cases

- **Network or Auth Service Failure**: When authentication services are temporarily unreachable, the system displays an informative connection error banner and keeps user inputs intact for retry.
- **Session Conflict / Role Mismatch**: If an active session already exists when visiting `/login`, the system detects the existing role and provides a one-click option to proceed directly to the portal or sign in as a different user.
- **Rapid Mode Toggling**: Fast switching between Admin and Staff tabs preserves the user's manual password entry if typed, while updating contextual hints cleanly without UI glitching.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide an interactive portal switcher on the `/login` interface allowing users to toggle between "Admin Portal" and "Staff Portal" modes.
- **FR-002**: System MUST dynamically adapt form action labels, visual badges, and helper text based on the currently selected portal mode.
- **FR-003**: System MUST provide accessible one-click demo credential buttons ("Use Admin" and "Use Staff") that populate form fields and switch to the corresponding role mode.
- **FR-004**: System MUST validate email and password inputs before submission, providing clear inline validation feedback for malformed entries.
- **FR-005**: System MUST authenticate valid credentials, establish an authenticated user session with role metadata (Admin or Staff), and execute deterministic redirect to `/admin` or `/staff/pos`.
- **FR-006**: System MUST persist the selected terminal role mode across browser reloads when the "Remember this terminal" option is selected.
- **FR-007**: System MUST render all visual components strictly using established SWIFT semantic design tokens and support seamless light and dark mode display without visual artifacts.
- **FR-008**: System MUST support full keyboard navigation (Tab, Enter, Space) and ARIA accessibility standards for all form inputs, role switchers, and demo buttons.

### Key Entities *(include if feature involves data)*

- **User Session**: Represents the active authenticated session containing user identity, email, display name, assigned role (`admin` | `staff`), and permissions.
- **Portal Mode**: Represents the active UI and routing target state (`ADMIN` targeting `/admin` vs. `STAFF` targeting `/staff/pos`).
- **Terminal Preference**: Local device configuration storing default role preference and last-used terminal settings.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Switching between Admin and Staff portal modes occurs instantly (under 100 milliseconds) with zero layout shifting.
- **SC-002**: 100% of successful administrator logins redirect directly to the `/admin` dashboard without manual URL entry.
- **SC-003**: 100% of successful staff logins redirect directly to the `/staff/pos` interface without intermediate prompts.
- **SC-004**: Demo credential one-click fill completes form population in a single interaction.
- **SC-005**: Login form achieves 100% compliance with WCAG AA contrast, keyboard focus visibility, and accessible form labeling standards.

## Assumptions

- **Authentication Engine**: Integrates with existing backend session infrastructure and Supabase authentication client.
- **Protected Routing**: Downstream shells ([SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9) and [SIAA-10](https://the-three-devsketeers.atlassian.net/browse/SIAA-10)) will consume the established session to render respective portal views.
- **Target Devices**: Operates responsively across shop floor touch terminals (1024x768 minimum) and standard desktop displays (1920x1080).
