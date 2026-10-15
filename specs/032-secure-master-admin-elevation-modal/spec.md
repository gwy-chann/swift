# Feature Specification: Secure Master Admin Elevation Modal & Shop Floor Session Guard

**Feature Branch**: `feat/SIAA-32-secure-master-admin-elevation-modal`  
**Created**: 2026-10-15  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-32](https://the-three-devsketeers.atlassian.net/browse/SIAA-32) - STORY-5.5: Secure Master Admin Elevation Modal & Shop Floor Session Guard  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) - EPIC-5: Staff Shop Floor Terminal & Time Clock  

---

## 1. Executive Summary & Value Proposition

In the SWIFT Motorcycle Parts POS & Inventory Management System, shop floor terminals are shared physical workstations operated by cashiers, mechanics, and sales staff. Because these terminals remain unlocked for rapid point-of-sale transactions and barcode lookups, administrative views—such as financial analytics, gross markup configuration, inventory write-offs, employee timesheet tampering, and user provisioning—must be secured against casual floor walk-ups and unauthorized tampering.

This feature implements the **Secure Master Admin Elevation Modal (`#switchPortalModal`)** and **Shop Floor Session Guard**. When floor personnel or managers on the Staff Terminal click "Admin Portal Access" in the topbar, the terminal intercepts navigation and presents an authorization modal requiring the Master Admin password. Upon successful verification, the session is granted an elevated security token/cookie (`swift_admin_elevated`), an immutable security audit event is logged, and the user is redirected immediately to `/admin`. If an invalid password is provided, access is strictly denied, an accessible high-visibility error alert is displayed, and the active staff terminal state (cart items, active punches, active scans) remains preserved without data loss.

---

## 2. User Scenarios & Acceptance Criteria *(Mandatory)*

### User Story 1 - Elevation Trigger from Staff Topbar & Modal Initialization (Priority: P1)

**As a** Store Manager or System Administrator operating on the shop floor,  
**I want to** click "Admin Portal Access" in the Staff Terminal topbar,  
**so that** an elevation authorization dialog (`#switchPortalModal`) opens immediately with autofocus on the password field and pre-filled target account.

#### Acceptance Criteria
- **Scenario 1.1: Elevation Trigger from Staff Topbar**
  - **Given** a user operating on any view of the Staff Shop Floor Terminal (`/staff/pos`, `/staff/motomatcher`, `/staff/clock`, `/staff/pricecheck`)
  - **When** they click "Admin Portal Access" (`#btnAdminPortalAccess` / `[data-testid="admin-portal-switch"]`) in the topbar
  - **Then** the `#switchPortalModal` modal dialog appears centered with smooth transition
  - **And** the modal displays:
    - Dialog Title: "Administrator Authorization Required"
    - Subtitle/Notice: "Administrative credentials are required to access management analytics, inventory adjustments, and system settings."
    - Target Account field: `#switchUsernameInput` (readonly, default `admin@swift.local`)
    - Master Admin Password input: `#switchPasswordInput` (type `password`, autofocus, placeholder "Enter Admin Password...")
    - Error container: `#switchAuthError` (initially hidden)
    - Demo Admin Credential box displaying demo password `admin123` with a 1-click "Autofill Admin Password" button (`#btnAutofillAdminPassword`)
    - Modal Actions: "Cancel" button (`#btnCancelElevation`) and "Verify & Access Admin Portal" button (`#btnVerifyElevation`).

---

### User Story 2 - Successful Master Admin Verification & Portal Transition (Priority: P1)

**As a** Store Manager,  
**I want to** enter the master admin password and submit authorization,  
**so that** my terminal session is elevated and I am routed directly to `/admin` without manual re-login.

#### Acceptance Criteria
- **Scenario 2.1: Master Admin Password Verification & Redirection**
  - **Given** the elevation modal `#switchPortalModal` is open
  - **When** the manager enters the valid master admin password (e.g., `admin123`, `admin`, `1234`, or configured `ADMIN_ELEVATION_PASSWORD` / `ADMIN_ELEVATION_PIN`) and clicks "Verify & Access Admin Portal" or presses Enter
  - **Then** the modal closes immediately
  - **And** the server action `verifyAdminElevationAction` issues an HTTP-only elevation cookie (`swift_admin_elevated=true`) with 1-hour expiry
  - **And** a forensic security audit record (`MASTER_ADMIN_ELEVATION`) is recorded in the audit trail
  - **And** the browser navigates immediately to the Administrative Portal (`/admin`).

- **Scenario 2.2: 1-Click Demo Credential Autofill**
  - **Given** `#switchPortalModal` is open with an empty password field
  - **When** the user clicks "Autofill Admin Password" (`#btnAutofillAdminPassword`)
  - **Then** the password input `#switchPasswordInput` is immediately populated with `admin123`
  - **And** any previous error message in `#switchAuthError` is cleared.

---

### User Story 3 - Failed Authentication, Lockout Interception & Error Handling (Priority: P1)

**As a** System Administrator,  
**I want** invalid or blank password submissions to be strictly blocked and clearly reported,  
**so that** unauthorized individuals cannot guess or bypass security on unattended floor terminals.

#### Acceptance Criteria
- **Scenario 3.1: Invalid Password Submission**
  - **Given** the elevation modal is open
  - **When** an invalid password (e.g., `wrongpass` or `0000`) is entered and submitted
  - **Then** navigation to `/admin` is completely blocked
  - **And** the modal remains open with `#switchPasswordInput` kept active/focused
  - **And** a high-visibility error message appears in `#switchAuthError` reading: `"Invalid administrator password."`
  - **And** a security audit warning event (`ELEVATION_FAILED`) is logged to the forensic audit trail.

- **Scenario 3.2: Empty Password Submission**
  - **Given** the elevation modal is open with an empty or whitespace password
  - **When** submission is attempted
  - **Then** form submission is prevented
  - **And** `#switchAuthError` displays: `"Please enter the administrator password."`
  - **And** no network dispatch is executed unnecessarily.

---

### User Story 4 - Modal Dismissal & Terminal State Preservation (Priority: P2)

**As a** Shop Floor Attendant,  
**I want to** dismiss the elevation modal without altering my current work,  
**so that** active POS cart items, customer selections, or active shift timers are not lost.

#### Acceptance Criteria
- **Scenario 4.1: Dismissal via Cancel Button or Close Icon**
  - **Given** the elevation modal is open over an active staff view (e.g., `/staff/pos` with items in the cart)
  - **When** the user clicks "Cancel" (`#btnCancelElevation`), the close icon `✕` (`#btnCloseElevationModal`), or clicks the backdrop outside the modal window
  - **Then** the modal dismisses smoothly
  - **And** the user remains on their current shop floor terminal view
  - **And** cart state, selected filters, and active shift duration counters remain 100% intact.

- **Scenario 4.2: Keyboard Escape Key Support**
  - **Given** the elevation modal is open
  - **When** the user presses the `Escape` key on their keyboard
  - **Then** the modal dismisses safely matching WCAG AA modal standards.

---

## 3. Business Invariants & Security Rules

1. **Zero Hardcoded Colors**: All modal UI elements, inputs, buttons, and error pills must strictly consume SWIFT semantic design tokens (`bg-bg-card`, `bg-bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `bg-primary`, `bg-primary-hover`, `text-danger`, `bg-danger-light`).
2. **Session Elevation Expiry**: The `swift_admin_elevated` session cookie must expire after 1 hour (3600 seconds) or when explicit logout occurs.
3. **Audit Trail Completeness**: Every elevation attempt (both successful authorizations and denied attempts) must be dispatched to the forensic security audit ledger (`audit_logs`) with IP/station identifier (`Terminal #01`).
4. **Mockup Blueprint Parity**: Layout, input IDs (`#switchPortalModal`, `#switchUsernameInput`, `#switchPasswordInput`, `#switchAuthError`), and text labels must strictly mirror `mockup/staff.html` (lines 382–420) and `mockup/app.js` (lines 880–928).
5. **No Terminal State Disruption**: Opening, typing into, or cancelling the elevation dialog must never mutate client state stores (`useCartStore`, `usePunchStore`, `inventoryStore`).

---

## 4. Non-Functional & Accessibility Standards

- **WCAG 2.1 AA Compliance**:
  - Semantic `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`.
  - Accessible focus trap retaining keyboard navigation within the dialog until dismissed or submitted.
  - Automatic autofocus on `#switchPasswordInput` upon modal mount.
- **Latency & Performance**:
  - Verification server action execution time < 100ms in offline/mock mode and < 300ms against PostgreSQL/Supabase.
- **Responsive Layout**:
  - Modal fits within mobile/tablet screens with padding and clean wrapping (`max-w-md w-full`).
