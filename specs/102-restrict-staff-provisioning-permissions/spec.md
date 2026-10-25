# Feature Specification: Restrict Staff Provisioning Permissions Strictly to Cashier, Mechanic, and Inventory Clerk

**Feature Branch**: `feat/SIAA-102-restrict-staff-provisioning-permissions`  
**Created**: 2026-10-26  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-102](https://the-three-devsketeers.atlassian.net/browse/SIAA-102) (STORY-3.4)  
**Parent Epic**: [SIAA-38](https://the-three-devsketeers.atlassian.net/browse/SIAA-38) / [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (User Account Provisioning & Admin RBAC)  
**Prerequisites**: [SIAA-30](https://the-three-devsketeers.atlassian.net/browse/SIAA-30) (Granular Permission Flags), [SIAA-31](https://the-three-devsketeers.atlassian.net/browse/SIAA-31) (User Account Provisioning & Management), [SIAA-94](https://the-three-devsketeers.atlassian.net/browse/SIAA-94) (Admin Provisioning & Security Audit Trail)  
**Target Scope**: Admin Portal (`app/admin/users/*`, `components/admin/users/*`, `lib/admin/*`, `swift-backend`)  

---

## Executive Summary & Business Intent

In automotive repair and retail inventory operations, the Principle of Least Privilege (PoLP) requires that newly provisioned staff accounts receive strictly bounded operational permissions matching their physical workstation assignments. Superfluous permissions or arbitrary custom overrides at onboarding increase the risk of accidental stock alterations, unauthorized discount grants, and administrative elevation.

Previously, the "Add Staff Member" modal at `/admin/users` allowed administrators to arbitrarily assign any role—including `Admin` and generic `Staff`—and presented manual toggles for individual permission flags (`can_adjust_stock`, `can_override_discount`, `can_manage_pricing`, `can_view_reports`). This allowed misconfigurations where staff received unneeded operational privileges, bypassing standardized role profiles.

This feature establishes strict role-bounded staff provisioning:
1. **Curated Operational Role Selection**: In the "Add Staff Member" modal, the role selection dropdown is restricted strictly to three approved workstation roles:
   - **Cashier Privilege** (`cashier`): Standard point-of-sale operations, tender processing, shift check-in.
   - **Mechanic** (`mechanic`): Work order inspection, repair queue management, labor tracking.
   - **Inventory Clerk** (`inventory_clerk`): Stock count logging, bin/shelf location updates, item adjustments.
2. **Elimination of Superfluous Permission Checkboxes**: Eliminates manual permission toggle checkboxes from the provisioning modal. Role selection deterministically dictates the baseline permission flags according to system-defined role defaults.
3. **Backend & Server Action Role Validation Gate**: The server action `provisionStaffUserAction` (and Spring Boot `UserAdminService`) validates incoming payloads to strictly reject any role outside the three approved staff roles. Any request attempting to provision an unapproved role (e.g. `admin`, `staff`, or arbitrary strings) fails immediately with a `400 Bad Request / Validation Error` and records a high-priority security audit entry in `security_audit_logs`.

---

## User Scenarios & Testing

### User Story 1 - Provision Staff Member with Valid Granular Role (Priority: P1)

* **As a** Workshop Administrator,  
* **I want to** select strictly from three granular permissions (Cashier Privilege, Mechanic, or Inventory Clerk) when adding a new staff account,  
* **so that** employees receive only the minimum necessary system access required for their physical workstation duties without arbitrary or superfluous privileges.

**Why this priority**: Core security invariant and governance gate for workforce account creation.

**Independent Test**: Navigate to `/admin/users`, open "Add Staff Member" modal, select "Cashier Privilege", enter employee details, and click Save. Verify that the staff profile is created with role `cashier` and default cashier permissions.

**Acceptance Scenarios**:
```gherkin
Scenario: Provisioning a staff member with Cashier Privilege
  Given I am authenticated as an Administrator on the User Management page at "/admin/users"
  And I open the "Add Staff Member" modal
  When I enter "Jane Doe" as full name and "jane.doe@swift.local" as email
  And I select "Cashier Privilege" from the operational role dropdown
  And I click "Create Staff Account"
  Then the staff profile is created with role "cashier"
  And the profile receives default cashier permissions ("can_override_discount: false", "can_adjust_stock: false", "can_manage_pricing: false", "can_view_reports: false")
  And a security audit event "USER_PROVISIONED" is recorded.

Scenario: Provisioning a staff member with Mechanic Role
  Given I am authenticated as an Administrator on "/admin/users"
  And I open the "Add Staff Member" modal
  When I enter "Mike Torres" and "mike.torres@swift.local"
  And I select "Mechanic" from the operational role dropdown and submit
  Then the staff profile is created with role "mechanic"
  And the profile receives default mechanic permissions.

Scenario: Provisioning a staff member with Inventory Clerk Role
  Given I am authenticated as an Administrator on "/admin/users"
  And I open the "Add Staff Member" modal
  When I enter "Carlos Vega" and "carlos.vega@swift.local"
  And I select "Inventory Clerk" from the operational role dropdown and submit
  Then the staff profile is created with role "inventory_clerk"
  And the profile receives default inventory clerk permissions ("can_adjust_stock: true", "can_manage_pricing: false", "can_view_reports: false").
```

---

### User Story 2 - Prevention of Arbitrary or Superfluous Permission Assignment (Priority: P1)

* **As a** Workshop Administrator,  
* **I want** the staff provisioning form to hide all arbitrary permission checkboxes and unapproved roles,  
* **so that** human error cannot introduce privilege creep during onboarding.

**Why this priority**: Eliminates UI attack surface and accidental elevation at account creation time.

**Independent Test**: Inspect the Add Staff Modal DOM elements to verify that only the three approved roles exist in the `<select>` element and zero permission toggle checkboxes exist.

**Acceptance Scenarios**:
```gherkin
Scenario: Prevention of arbitrary or superfluous permission assignment
  Given the staff provisioning form is displayed
  When I inspect the role options in the dropdown
  Then exactly three selectable staff roles are displayed:
    | Label             | Value           |
    | Cashier Privilege | cashier         |
    | Mechanic          | mechanic        |
    | Inventory Clerk   | inventory_clerk |
  And neither "Admin" nor "Staff" are selectable options
  And no custom or extraneous permission checkboxes are available in the modal.
```

---

### User Story 3 - Backend Rejection of Invalid Roles & Forensic Security Audit (Priority: P1)

* **As a** System Auditor,  
* **I want** the backend server action to reject any provisioning attempt using unapproved roles and log a security audit entry,  
* **so that** API tampering, automated attacks, or outdated clients cannot bypass the UI restriction.

**Why this priority**: Defense-in-depth security requirement ensuring invariants are enforced on the server.

**Independent Test**: Directly invoke `provisionStaffUserAction` with `{ role: 'admin' }` or `{ role: 'staff' }` or `{ role: 'super_user' }`. Verify that it returns `success: false`, `code: 'VALIDATION_ERROR'`, and logs an audit entry.

**Acceptance Scenarios**:
```gherkin
Scenario: Backend rejection of invalid roles
  Given a client request attempts to provision a staff member with an unapproved role ("admin", "staff", or arbitrary role)
  When the request is processed by the server action
  Then the mutation fails with a 400 Bad Request / Validation Error
  And the error message specifies that only Cashier, Mechanic, and Inventory Clerk are permitted
  And a security audit entry with severity "warning" is written to "security_audit_logs" recording the unauthorized attempt.
```

---

## Functional Requirements

- **FR-001**: The system MUST restrict selectable roles in `AddStaffModal` strictly to:
  - `Cashier Privilege` (`cashier`)
  - `Mechanic` (`mechanic`)
  - `Inventory Clerk` (`inventory_clerk`)
- **FR-002**: The `AddStaffModal` MUST NOT render any granular permission checkboxes or manual toggle controls during provisioning.
- **FR-003**: Upon successful role selection, the system MUST automatically assign the canonical default permissions for that role (`DEFAULT_ROLE_PERMISSIONS[role]`).
- **FR-004**: The server action `provisionStaffUserAction` MUST validate that `role` belongs strictly to `['cashier', 'mechanic', 'inventory_clerk']`.
- **FR-005**: If an unapproved role is submitted to `provisionStaffUserAction`, the action MUST reject the mutation with `code: 'VALIDATION_ERROR'` and log a security audit event with severity `warning` detailing the violation.
- **FR-006**: The Spring Boot backend `UserAdminService` MUST mirror this validation gate, rejecting unapproved roles with `HTTP 400 Bad Request` and logging a security audit event.
- **FR-007**: All UI changes MUST strictly use SWIFT semantic design tokens (`bg-bg-card`, `border-border`, `text-text-primary`, etc.) with zero hardcoded hex/RGB values.

---

## Success Criteria

1. **Role Restriction**: 100% of staff accounts provisioned through the Admin UI use one of the 3 approved roles: `cashier`, `mechanic`, or `inventory_clerk`.
2. **Zero Checkbox Overhead**: The Add Staff modal form is streamlined, reducing form completion time and eliminating manual permission checkbox misconfiguration.
3. **Server Gate Enforcement**: 100% of API/Server Action requests with unapproved roles are rejected with 400 Validation Error and produce a logged security audit record.
4. **Automated Test Coverage**: 100% pass rate on unit and integration tests verifying both valid provisioning and invalid role rejection.
