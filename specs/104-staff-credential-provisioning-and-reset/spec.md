# Feature Specification: Admin: Provision Email, Password, and PIN for Staff with Credential Reset Capability

**Feature Branch**: `feat/SIAA-104-admin-staff-credentials-provisioning-reset`  
**Created**: 2026-10-26  
**Status**: Ready for Implementation  
**Jira Ticket**: [SIAA-104](https://the-three-devsketeers.atlassian.net/browse/SIAA-104)  
**Parent Epic**: [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (System Admin, Labor Rates Matrix & Auditing)  
**Prerequisites**: [SIAA-102](https://the-three-devsketeers.atlassian.net/browse/SIAA-102) (Restrict Staff Provisioning Permissions), [SIAA-103](https://the-three-devsketeers.atlassian.net/browse/SIAA-103) (Auth: Inactive Staff Blocking & Session Revocation), [SIAA-105](https://the-three-devsketeers.atlassian.net/browse/SIAA-105) (Baseline Staff Profile Seeding)  
**Target Scope**: Admin Portal Staff Management (`app/admin/users/*`, `components/admin/users/*`, `lib/admin/user-actions.ts`, `swift-backend`)

---

## Executive Summary & Business Intent

In SWIFT, workshop staff (Cashiers, Mechanics, and Inventory Clerks) authenticate at physical shop terminals using a multi-factor credential triad: email, password, and a dedicated 4 to 6 digit numeric PIN. While baseline profiles were seeded (SIAA-105) and role provisioning restricted to approved workstation roles (SIAA-102), workshop administrators previously could not configure a new employee's initial temporary password and numeric PIN directly in the "Add Staff Member" modal. Furthermore, when employees forget their credentials during day-to-day workshop shifts, administrators had no self-service user-interface capability to reset them, necessitating risky direct database interventions or engineering support.

This feature introduces complete credential configuration at onboarding and a self-service credential reset capability for workshop administrators:
1. **Full Credential Provisioning in Add Staff Modal**: Administrators configure Full Name, Email, Temporary Password, and a 4-6 digit numeric PIN upon creating an employee.
2. **Dedicated Credential Reset Action**: A new "Reset Credentials" action in the User Ledger Table opens a secure modal allowing administrators to set a new password and new 4-6 digit numeric PIN for any existing staff member.
3. **Strict PIN Validation**: Enforces that all staff PINs are strictly 4 to 6 numeric digits (`/^\d{4,6}$/`). Submitting alphabetical characters or out-of-range lengths displays the standard error: *"PIN must consist of 4 to 6 numeric digits."*
4. **Security Audit Trail**: All credential provisioning and credential reset operations log security audit events with the administrator's identity and target account metadata.

---

## User Scenarios & Testing

### User Story 1 - Provisioning a New Staff Member with Full Credentials (Priority: P1)

* **As a** Workshop Administrator,  
* **I want to** enter an employee's full name, email, temporary password, 4-6 digit numeric PIN, and role when provisioning a new staff member,  
* **so that** the account is immediately equipped with authentication credentials ready for terminal access.

**Why this priority**: Core provisioning requirement for new frontline staff onboarding.

**Independent Test**: Navigate to `/admin/users`, click "Add Staff Member", enter valid full name, email, password, 4-6 digit PIN, and select role. Click submit and verify the account appears in the user ledger table with active credentials.

**Acceptance Scenarios**:
```gherkin
Scenario: Provisioning a new staff member with full credentials
  Given I am on the Admin User Management ledger at "/admin/users"
  And I click "Add Staff Member"
  When I enter the staff member's Full Name, Email, Temporary Password, 4-6 digit numeric PIN, and assign a role
  Then the account is provisioned with hashed credentials and appears in the active staff directory.
```

---

### User Story 2 - Admin Resets Forgotten Password and PIN for Existing Staff (Priority: P1)

* **As a** Workshop Administrator,  
* **I want to** select "Reset Credentials" on any staff member's ledger record and specify a new password and new numeric PIN,  
* **so that** staff members who forget their credentials can quickly recover without database intervention or system downtime.

**Why this priority**: Operational uptime requirement; prevents employee lockout when passwords or PINs are lost.

**Independent Test**: On `/admin/users`, locate a staff member row in the table, click the "Reset Credentials" button, input a new password and 4-digit PIN, and submit. Verify success toast and confirm the credentials update in the database/mock store.

**Acceptance Scenarios**:
```gherkin
Scenario: Admin resets a forgotten password and PIN for an existing staff member
  Given a staff member has forgotten their credentials
  And I locate the staff member's record in the user ledger table at "/admin/users"
  When I select "Reset Credentials" and input a new password and new numeric PIN
  Then the staff member's password hash and PIN hash are updated in the database
  And the staff member can authenticate using the new credentials.
```

---

### User Story 3 - Strict PIN Formatting Validation (Priority: P1)

* **As a** Workshop Administrator or System Auditor,  
* **I want** the system to enforce that staff PINs consist exclusively of 4 to 6 numeric digits,  
* **so that** malformed or insecure PINs cannot be saved.

**Why this priority**: Core data integrity and terminal keypad compatibility invariant.

**Independent Test**: In either the "Add Staff Member" or "Reset Credentials" modal, input alphabetical characters, `< 4` digits, or `> 6` digits in the PIN field and attempt submission. Verify the exact validation error message is displayed.

**Acceptance Scenarios**:
```gherkin
Scenario: Validation on PIN formatting
  Given I am setting or resetting a staff member's PIN
  When I submit an alphabetical value or a value shorter than 4 digits or longer than 6 digits
  Then the form displays a validation error: "PIN must consist of 4 to 6 numeric digits."
```

---

## Functional Requirements & Constraints

- **FR-001 (Add Staff Modal Credential Inputs)**: The "Add Staff Member" modal MUST include required fields for `Temporary Password` (minimum 6 characters) and `Numeric PIN` (4 to 6 digits).
- **FR-002 (Reset Credentials Modal & Button)**: The User Ledger table row actions MUST include a dedicated "Reset Credentials" button (`data-testid="btn-reset-credentials-${user.id}"`, `aria-label="Reset credentials for ${user.fullName}"`) that opens a `ResetCredentialsModal`.
- **FR-003 (PIN Format Invariant)**: Both client-side Zod validation and server-side validation MUST enforce regex `/^\d{4,6}$/`. Any non-matching value MUST return the validation message: `"PIN must consist of 4 to 6 numeric digits."`
- **FR-004 (Password Invariant)**: Passwords MUST be at least 6 characters in length to conform with authentication security standards.
- **FR-005 (Credential Update Processing)**: `resetStaffCredentialsAction` MUST update the GoTrue user password via Supabase Admin Auth and update `pin_code` in `public.profiles` (and matching memory store).
- **FR-006 (Role-Based Authorization)**: Only authenticated users with `admin` role are permitted to provision staff or reset staff credentials.
- **FR-007 (Audit Logging)**: All credential provisioning and reset actions MUST log security events via `logSecurityEventAction` with terminal IP, admin user email, and target metadata.
- **FR-008 (Spring Boot Parity)**: The Java Spring Boot backend MUST expose `POST /api/v1/admin/users/{id}/reset-credentials` accepting new password and PIN with equivalent validation and audit logging.

---

## Success Metrics

1. **100% Zero-Database-Intervention Recovery**: 100% of staff credential resets can be executed through the admin UI without SQL scripts.
2. **100% PIN Compliance**: 100% of newly provisioned or reset PINs adhere to the 4 to 6 numeric digit constraint.
3. **Audit Trail Completeness**: 100% of credential changes are recorded in the security audit log.
