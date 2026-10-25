# Feature Specification: Auth: Seed 3 Baseline Staff Profiles with Dedicated Email, Password, and PIN Credentials

**Feature Branch**: `feat/SIAA-105-auth-seed-baseline-staff-profiles`  
**Created**: 2026-10-26  
**Status**: Ready for Review  
**Jira Ticket**: [SIAA-105](https://the-three-devsketeers.atlassian.net/browse/SIAA-105)  
**Parent Epic**: [SIAA-8](https://the-three-devsketeers.atlassian.net/browse/SIAA-8) (Authentication & Role-Based Access Control)  
**Prerequisites**: [SIAA-43](https://the-three-devsketeers.atlassian.net/browse/SIAA-43) (Auth Migrations & Seed), [SIAA-78](https://the-three-devsketeers.atlassian.net/browse/SIAA-78) (Staff Kiosk Auth), [SIAA-102](https://the-three-devsketeers.atlassian.net/browse/SIAA-102) (Restrict Staff Provisioning Permissions)  
**Target Scope**: Authentication & Database Seeding (`supabase/seed.sql`, `lib/auth/*`, `components/auth/*`, `lib/mock-data/users.ts`)

---

## Executive Summary & Business Intent

In a modern motorcycle parts and workshop service facility, workshop personnel operate across distinct physical stations: the front-counter point-of-sale terminal, the service repair bays, and the parts stockroom. To ensure rigorous accounting, shift traceability, and access security without relying on shared generic credentials, each frontline employee must possess personal, authenticable credentials.

Previously, the default database seed script (`supabase/seed.sql`) only populated an administrator and generic cashier account, while secondary mechanic accounts lacked complete email/password GoTrue identities and the third essential workstation role—Inventory Clerk—was absent from database seeding. Furthermore, the login workflow lacked unified multi-factor credential entry (email + password followed by PIN authorization) for all baseline staff roles.

This specification guarantees that when the workshop environment is initialized via `supabase/seed.sql`:
1. **Three Baseline Staff Personas**: Exactly three frontline staff accounts exist covering the core workshop operations:
   - **1 Cashier**: `cashier@swift.local` / Mike Morales (role: `cashier`, PIN: `1234`)
   - **1 Mechanic**: `mechanic1@swift.local` / Dante Reyes (role: `mechanic`, PIN: `2222`)
   - **1 Inventory Clerk**: `warehouse@swift.local` / Rico Santos (role: `inventory_clerk`, PIN: `3333`)
2. **Dedicated Credential Triad**: Every baseline staff account is initialized with a confirmed email, an active encrypted password (`swift123` / `staff123`), and a dedicated 4-digit numeric PIN in profile metadata.
3. **Unified Two-Step Login Capability**: All baseline staff members can authenticate through `/login` with Step 1 (email and password) followed by Step 2 (interactive 4-digit PIN verification) before gaining portal entry.

---

## User Scenarios & Testing

### User Story 1 - Verifying the 3 Baseline Staff Seed Records (Priority: P1)

* **As a** System Administrator,  
* **I want to** execute the database seed script and obtain three baseline staff accounts,  
* **so that** the workshop has ready-to-use accounts for Cashier, Mechanic, and Inventory Clerk operations.

**Why this priority**: Core initialization invariant required for fresh development, testing, and workshop deployment.

**Independent Test**: Execute `supabase/seed.sql` on a clean database and query `public.profiles` for active staff accounts. Verify exactly 3 staff records exist with correct roles, names, and emails.

**Acceptance Scenarios**:
```gherkin
Scenario: Verifying the 3 baseline staff seed records
  Given the workshop database seed is executed via seed.sql
  When querying active staff profiles in public.profiles
  Then exactly three baseline staff accounts exist with their corresponding roles:
    | Email                 | Full Name    | Role            | Status |
    | cashier@swift.local   | Mike Morales | cashier         | Active |
    | mechanic1@swift.local | Dante Reyes  | mechanic        | Active |
    | warehouse@swift.local | Rico Santos  | inventory_clerk | Active |
```

---

### User Story 2 - Dedicated Email, Password, and PIN Configuration (Priority: P1)

* **As a** Security & Workshop Auditor,  
* **I want** every baseline staff account to possess confirmed email, encrypted password, and numeric PIN in the database,  
* **so that** staff identities cannot be spoofed, shared, or bypassed during terminal authentication.

**Why this priority**: Guarantees zero unconfirmed accounts, missing password hashes, or unassigned PINs.

**Independent Test**: Inspect `auth.users`, `auth.identities`, and `public.profiles` for all 3 baseline accounts. Verify `email_confirmed_at` is set, `encrypted_password` is valid bcrypt, and `pin_code` is a 4-digit string.

**Acceptance Scenarios**:
```gherkin
Scenario: All baseline staff have dedicated email, password, and PIN configured
  Given the baseline accounts for Cashier, Mechanic, and Inventory Clerk
  When inspecting authentication credentials in auth.users, auth.identities, and public.profiles
  Then every staff account (Cashier, Mechanic, and Inventory Clerk) has:
    | Field              | Expected State                      |
    | email_confirmed_at | Valid UTC timestamp (non-null)       |
    | encrypted_password | Active Blowfish/Bcrypt hash         |
    | pin_code           | Valid 4-digit numeric string        |
    | provider           | "email" identity in auth.identities |
```

---

### User Story 3 - Unified Credential Capability for Two-Step Authentication (Priority: P2)

* **As a** Frontline Staff Member (Cashier, Mechanic, or Inventory Clerk),  
* **I want to** authenticate at `/login` using my dedicated email and password at Step 1, then confirm my 4-digit PIN at Step 2,  
* **so that** my terminal session is uniquely attributed to my physical profile.

**Why this priority**: Delivers end-to-end verification of the staff login experience across both authentication steps.

**Independent Test**: Navigate to `/login`, enter `cashier@swift.local`, `mechanic1@swift.local`, or `warehouse@swift.local` with their password, submit, then complete the PIN verification prompt. Verify redirect to the appropriate portal view.

**Acceptance Scenarios**:
```gherkin
Scenario: Unified credential capability for two-step authentication
  Given any baseline staff member (Cashier, Mechanic, or Inventory Clerk)
  When the staff member initiates login at "/login"
  Then the system accepts their dedicated email and password at Step 1
  And subsequently prompts for their dedicated PIN at Step 2 before granting portal access.

Scenario Outline: Role-based landing redirection after successful two-step authentication
  Given a staff member enters <email> and valid password at Step 1
  When they enter the matching <pin> at Step 2
  Then the system successfully authenticates and redirects to <targetUrl>

  Examples:
    | email                 | pin  | targetUrl       |
    | cashier@swift.local   | 1234 | /staff/pos      |
    | mechanic1@swift.local | 2222 | /staff/compat   |
    | warehouse@swift.local | 3333 | /staff/search   |
```

---

## Edge Cases

1. **Incorrect PIN entry at Step 2**: When a staff member passes Step 1 but enters the wrong 4-digit PIN, the system MUST display "Invalid employee PIN. Please try again." and prevent session creation.
2. **Inactive staff profile**: If a baseline staff member's status is toggled to `Inactive` or `Suspended`, Step 1 or Step 2 MUST block authentication with error "Account is inactive. Please contact your workshop administrator."
3. **PIN Modal Dismissal**: If a staff member closes or cancels the Step 2 PIN modal, credentials must remain unconfirmed and the user stays on `/login` without redirection.
4. **Idempotent Re-seeding**: Running `supabase/seed.sql` repeatedly MUST NOT duplicate accounts, corrupt existing password hashes, or reset active PIN codes unexpectedly (`ON CONFLICT (id) DO UPDATE`).

---

## Functional Requirements

- **FR-001**: Database seed script `supabase/seed.sql` MUST seed exactly 3 baseline staff accounts in `auth.users`, `auth.identities`, and `public.profiles`:
  - Cashier: `cashier@swift.local` / Mike Morales / `cashier`
  - Mechanic: `mechanic1@swift.local` / Dante Reyes / `mechanic`
  - Inventory Clerk: `warehouse@swift.local` / Rico Santos / `inventory_clerk`
- **FR-002**: Every baseline staff account in `public.profiles` MUST include a valid `pin_code`:
  - `cashier@swift.local`: `1234`
  - `mechanic1@swift.local`: `2222`
  - `warehouse@swift.local`: `3333`
  - Admin (`admin@swift.local`): `8888`
- **FR-003**: In `lib/auth/constants.ts`, `ALL_DEMO_ACCOUNTS` and `DEMO_STAFF_ACCOUNTS` MUST define all 3 staff personas with matching emails, names, roles, target URLs, and PINs.
- **FR-004**: Quick-fill Demo Credentials Box in `/login` (`components/auth/demo-credentials-box.tsx`) MUST list all 3 staff roles (Cashier, Mechanic, Clerk) alongside Admin, and initiate the interactive 4-digit PIN prompt on quick-fill selection.
- **FR-005**: Authentication actions (`lib/auth/actions.ts`) MUST recognize and resolve all 3 baseline staff accounts with their respective destination routes.

---

## Success Criteria

1. **SC-001**: Executing `seed.sql` provisions 100% of the 3 baseline staff accounts with zero errors or unhandled unique key collisions.
2. **SC-002**: 100% of seeded staff accounts have non-null `email_confirmed_at`, non-null `encrypted_password`, and valid 4-digit `pin_code`.
3. **SC-003**: Automated test suite (`demo-staff-credentials.test.ts`) verifies credentials, PINs, and PIN validation RPCs with a 100% pass rate.
4. **SC-004**: Users can successfully log in with any of the 3 baseline staff accounts through `/login` with 2-step credential verification in under 3 seconds.
