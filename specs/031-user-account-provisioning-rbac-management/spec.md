# Feature Specification: User Account Provisioning & Role-Based Access Control (RBAC) Management

**Feature Branch**: `feat/SIAA-38-user-account-provisioning-rbac-management`  
**Created**: 2026-10-15  
**Status**: In Review  
**Jira Issue**: [SIAA-38](https://the-three-devsketeers.atlassian.net/browse/SIAA-38) - STORY-7.1: User Account Provisioning & Role-Based Access Control (RBAC) Management  

---

## 1. Executive Summary & Value Proposition

In the SWIFT Motorcycle Parts POS and Workshop ecosystem, secure operational boundaries are essential. Store owners and master administrators must be empowered to provision staff user accounts, configure system roles (Admin, Cashier, Mechanic, Inventory Clerk), and assign granular operational permissions (`can_adjust_stock`, `can_override_discount`, `can_manage_pricing`, `can_view_reports`). 

This capability prevents terminal collisions, curtails unauthorized administrative overrides, enforces least-privilege security on the shop floor, and guarantees strict audit traceability across all staff lifecycle operations without risking self-lockout by active administrators.

---

## 2. User Scenarios & Acceptance Criteria *(Mandatory)*

### User Story 1 - System Accounts & Role Enforcement Ledger Rendering (Priority: P1)

**As a** Store Owner or Master Administrator,  
**I want to** navigate to the User Management view (`#view-users`) and view a comprehensive ledger of all registered staff accounts,  
**so that** I can inspect role assignments, active account statuses, and operational permissions across all shop-floor personnel.

#### Acceptance Criteria
- **Scenario 1.1**: Initial View and Ledger Rendering
  - **Given** an authenticated administrator navigating to User Management (`#view-users`) at `/admin/users`
  - **When** the page loads
  - **Then** the user table (`#usersTableBody`) displays all registered staff accounts with:
    - Employee Full Name and avatar initials
    - Unique Login Email
    - System Role badge (`Admin`, `Cashier`, `Mechanic`, `Inventory Clerk`, `Staff`) styled with SWIFT semantic design tokens
    - Account Status pill (`Active` / `Inactive`) with visual status indicator
    - Assigned Permissions summary chips (`Stock In`, `Discount Override`, `Manage Pricing`, `Audit Reports`)
    - Interactive "Edit" action button (`data-testid="btn-edit-user-${id}"`) and "Toggle Status" action button.

- **Scenario 1.2**: Search and Filter Capabilities
  - **Given** the staff ledger table
  - **When** the administrator types a query into the search input or selects a role filter (e.g., "Cashiers")
  - **Then** the table immediately filters visible rows by employee name or email and role without full page reload.

---

### User Story 2 - New Staff Account Creation & Role Assignment (Priority: P1)

**As a** Store Owner or Master Administrator,  
**I want to** provision a new staff user account with specific job roles and temporary credentials,  
**so that** new hires can securely authenticate into their designated portal (Admin or Staff Terminal).

#### Acceptance Criteria
- **Scenario 2.1**: Opening Provisioning Modal
  - **Given** an administrator on `#view-users`
  - **When** the admin clicks "+ Add Staff User" (`#btnAddStaffUser` / `[data-testid="btn-add-staff"]`)
  - **Then** a modal opens presenting input fields for Full Name, Email, Temporary Password/PIN, Role selection dropdown, and Granular Permission toggles.

- **Scenario 2.2**: Successful User Provisioning & Audit Log
  - **Given** valid employee details entered in the modal
  - **When** the administrator confirms and submits the form
  - **Then** the new staff user is validated and saved into the reactive user store (Supabase auth/profiles with in-memory fallback)
  - **And** immediately prepends to `#usersTableBody` with `Active` status
  - **And** a security audit log event is recorded via `logSecurityEventAction` documenting account creation (e.g. `Created employee account for <email> (<role>)`).

---

### User Story 3 - Granular Permission Flag Modification & Edit Staff Modal (Priority: P1)

**As a** Store Owner or Master Administrator,  
**I want to** edit an existing employee's name, role, and granular permission flags via an Edit Modal,  
**so that** promotions, role reassignments, and operational rights updates take effect immediately.

#### Acceptance Criteria
- **Scenario 3.1**: Launching Edit Modal with Pre-populated Data
  - **Given** an existing staff member in `#usersTableBody`
  - **When** the administrator clicks the "Edit" action button (`data-testid="btn-edit-user-${id}"`)
  - **Then** an Edit Staff Modal opens pre-populated with the user's Full Name, Email (read-only), Role, and active Permission toggles.

- **Scenario 3.2**: Submitting Permission & Role Updates
  - **Given** the Edit Staff Modal open for an employee
  - **When** the admin alters permission flags (e.g., granting inventory adjustment rights to a senior cashier) or updates role and clicks "Save Changes"
  - **Then** the server action updates the persistent profile in Supabase/memory
  - **And** the updated role badge and permission chips reflect immediately in the ledger table without requiring a manual browser refresh
  - **And** a security audit log event is recorded documenting the update (e.g., `Updated permissions for <email>`)
  - **And** the affected user session adopts the updated permission matrix on subsequent route access.

---

### User Story 4 - Duplicate Email & Self-Lockout Prevention Guard (Priority: P1)

**As a** Master Administrator,  
**I need** strict validation guards against duplicate email registration and self-lockout or self-demotion,  
**so that** account uniqueness is maintained and store operations are never left without active administrative control.

#### Acceptance Criteria
- **Scenario 4.1**: Duplicate Email Rejection
  - **Given** an administrator attempting to provision a user with an already registered email address
  - **When** the form is submitted
  - **Then** the system rejects the submission with a clear, user-facing error message (`An account with this email address already exists`)
  - **And** no duplicate account or corrupt record is created.

- **Scenario 4.2**: Self-Lockout & Self-Demotion Guard
  - **Given** an active administrator logged in
  - **When** attempting to deactivate their own account or remove their own admin role
  - **Then** the action is blocked by the server guard with `Admin self-lockout or deactivation is prohibited` (`SELF_LOCKOUT_PREVENTED`)
  - **And** the admin profile retains active status and full administrative privileges.

---

## 3. Business Invariants & Operational Rules

1. **Mandatory Audit Trail**: Every account creation, role change, status toggle, and permission modification MUST produce an immutable security audit entry via `logSecurityEventAction` with timestamp, caller IP/identifier, and severity level.
2. **Strict Non-Empty Credentials**: Every provisioned staff user must possess a valid, RFC-compliant email address and temporary credential/PIN (minimum 6 characters).
3. **Role-Permission Cohesion**: Selecting a role automatically seeds recommended defaults:
   - `admin`: All flags enabled (`can_adjust_stock`, `can_override_discount`, `can_manage_pricing`, `can_view_reports`).
   - `cashier`: Front-of-house defaults (customizable `can_override_discount`).
   - `inventory_clerk`: Warehouse defaults (`can_adjust_stock: true`, `can_view_reports: true`).
   - `mechanic`: Workshop service focus.
   - Granular permissions can be explicitly toggled per employee.
4. **Zero Hardcoded Colors**: All UI elements (badges, buttons, status pills, permission chips, modal containers) MUST exclusively consume SWIFT semantic design tokens (`bg-bg-surface`, `text-text-primary`, `bg-primary`, `bg-success-light`, etc.).
