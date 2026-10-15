# Feature Specification: Supabase RBAC Extension, Granular Permission Flags Schema & Admin Provisioning Actions

**Feature Branch**: `feat/SIAA-56-supabase-rbac-extension-granular-permission-flags`

**Created**: 2026-10-15

**Status**: In Review

**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-56 - STORY-7.6: Supabase RBAC Extension, Granular Permission Flags Schema & Admin Provisioning Actions"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Role Enumeration Extension & Persistent Permission Flags (Priority: P1)

As a Store Owner or Master Administrator, I want the system's role definitions extended to formally support `inventory_clerk` alongside granular security permission flags (`can_adjust_stock`, `can_override_discount`, `can_manage_pricing`, `can_view_reports`) in PostgreSQL, so that store operations can distinguish warehouse staff responsibilities from front-counter and workshop activities under schema-enforced constraints.

**Why this priority**: Core prerequisite for role-based access control; without database enum alterations and structured permissions columns, staff cannot be assigned inventory-specific capabilities.

**Independent Test**: Can be tested independently by applying database migration `20261019000000_rbac_permissions.sql` to a PostgreSQL instance and verifying that the `user_role` type accepts `inventory_clerk` and `public.profiles` includes the default JSONB permissions.

**Acceptance Scenarios**:

1. **Given** a Supabase database instance with existing profiles, **When** migration `20261019000000_rbac_permissions.sql` is applied, **Then** the `public.user_role` enum is altered to include `'inventory_clerk'`.
2. **Given** an updated `public.profiles` table, **When** inspecting column definitions, **Then** `permissions` exists as `JSONB NOT NULL DEFAULT '{"can_adjust_stock": false, "can_override_discount": false, "can_manage_pricing": false, "can_view_reports": false}'::jsonb`.
3. **Given** application ORM definition in `prisma/schema.prisma`, **When** validated against the database, **Then** the `UserRole` enum and `Profile` model mirror the database schema without discrepancy.

---

### User Story 2 - Self-Lockout Prevention & Row Level Security Boundaries (Priority: P1)

As a Master Administrator, I need the database security policies to allow authorized administrators to manage employee roles and permission flags while preventing an admin from accidentally deactivating, demoting, or locking out their own administrative account.

**Why this priority**: Prevents irreparable administrative lockout where no active administrator remains to manage store permissions.

**Independent Test**: Can be tested independently by authenticating as an administrator, attempting to demote or deactivate their own profile (which must fail), and updating a separate staff member's profile (which must succeed).

**Acceptance Scenarios**:

1. **Given** an authenticated admin session, **When** attempting to update role, permissions, or active status for another staff profile, **Then** the database permits the update.
2. **Given** an authenticated admin session, **When** attempting to update their own profile to a non-admin role or mark status as 'Inactive'/'Suspended', **Then** the database security check rejects the operation with an error.

---

### User Story 3 - Administrative Staff Account Provisioning Action (Priority: P1)

As an Administrator, I need a secure server action to provision new employee user accounts—specifying email, full name, assigned role, and custom permission flags—with automated temporary credentials and an audit log trail.

**Why this priority**: Essential administrative capability for employee onboarding without requiring direct access to Supabase dashboard or database consoles.

**Independent Test**: Can be tested independently by executing `provisionStaffUserAction` with valid employee details and verifying that an `auth.users` identity and a corresponding `public.profiles` record are created with the designated permissions.

**Acceptance Scenarios**:

1. **Given** an administrator submitting new employee details (email, full name, role, permissions), **When** `provisionStaffUserAction` executes with service-role privileges, **Then** an `auth.users` record is created with an auto-generated temporary password/PIN.
2. **Given** the successful creation of the authentication identity, **When** inspecting `public.profiles`, **Then** the employee profile is populated with the specified role and granular permissions.
3. **Given** a successful user provisioning operation, **When** querying audit records, **Then** a security audit event ("Provisioned new staff user") is appended to the audit ledger.

---

### User Story 4 - Non-Admin Permission Escalation Rejection (Priority: P2)

As a Security Officer, I need non-administrative users (such as Cashiers and Mechanics) to be strictly blocked from modifying permission flags, altering roles, or creating accounts.

**Why this priority**: Protects against privilege escalation attacks and unauthorized access to restricted features such as inventory markups and pricing.

**Independent Test**: Can be tested independently by invoking `updateUserPermissionsAction` from a session with cashier or mechanic claims and asserting that the action returns a 403 Forbidden rejection.

**Acceptance Scenarios**:

1. **Given** an authenticated cashier or mechanic session, **When** attempting to call `updateUserPermissionsAction` or `provisionStaffUserAction`, **Then** the request is rejected with HTTP 403 Forbidden.
2. **Given** a direct PostgREST client request from a non-admin user, **When** attempting to update `permissions` or `role` on any profile, **Then** RLS policies reject the modification.

---

### User Story 5 - User Account Ledger & Provisioning Modal UI Wiring (Priority: P2)

As an Administrator navigating to `/admin/users`, I want to view an interactive ledger of all store employees (displaying name, role badge, status, and enabled permissions) and open an "Add Staff" modal that validates inputs and provides instant optimistic UI updates.

**Why this priority**: Delivers the visual interface matching SWIFT design tokens (`app/globals.css`, `lib/tokens.ts`) and Admin Portal mockups.

**Independent Test**: Can be tested independently by navigating to `/admin/users`, verifying that employee records hydrate with role tags and permission badges, and testing modal validation.

**Acceptance Scenarios**:

1. **Given** an administrator on `/admin/users`, **When** the page renders, **Then** `listStaffUsersAction` hydrates the employee ledger table with full names, emails, roles, status pills, and permission chips.
2. **Given** the "Add Staff" modal open, **When** an admin fills out required fields, selects permissions, and clicks "Create Staff Account", **Then** the new staff member appears in the ledger with success toast feedback.

---

## Edge Cases

- **Duplicate Email Provisioning**: Submitting an email that already exists in `auth.users` or `public.profiles` must return a clear, localized validation error ("An account with this email address already exists") without crashing or leaving orphaned rows.
- **Empty / Incomplete Permissions Object**: If `permissions` is null or missing specific keys during profile creation, the system must merge with default values (`{"can_adjust_stock": false, "can_override_discount": false, "can_manage_pricing": false, "can_view_reports": false}`).
- **Network / Service-Role Failure**: If the auth identity is created in GoTrue but profile creation fails, the transaction or error handler must ensure consistent rollback or report an explicit creation error.
- **Malformed Roles**: Submitting an unlisted role string must be rejected at the contract validation layer prior to database query execution.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide database migration `20261019000000_rbac_permissions.sql` altering `public.user_role` to include `inventory_clerk`.
- **FR-002**: System MUST alter `public.profiles` adding a `permissions` column with type `JSONB NOT NULL DEFAULT '{"can_adjust_stock": false, "can_override_discount": false, "can_manage_pricing": false, "can_view_reports": false}'::jsonb`.
- **FR-003**: System MUST update `prisma/schema.prisma` to include `inventory_clerk` in `enum UserRole` and `permissions Json` in `model Profile`.
- **FR-004**: System MUST enforce database-level self-lockout prevention preventing an administrator from demoting or inactivating their own profile.
- **FR-005**: System MUST provide a type-safe Server Action `listStaffUsersAction()` returning all registered staff profiles and their assigned roles and permissions.
- **FR-006**: System MUST provide a type-safe Server Action `provisionStaffUserAction(payload: ProvisionStaffUserPayload)` creating an auth identity and populating `public.profiles`.
- **FR-007**: System MUST provide a type-safe Server Action `updateUserPermissionsAction(userId: string, permissions: Partial<StaffPermissions>)` validating admin privileges before persisting updates.
- **FR-008**: System MUST provide a type-safe Server Action `toggleUserStatusAction(userId: string, status: 'Active' | 'Inactive')` with self-deactivation guard.
- **FR-009**: System MUST reject unauthorized calls to admin provisioning actions with 403 Forbidden.
- **FR-010**: System MUST wire `/admin/users` page with server-hydrated employee table and client modal `AddStaffModal` styled strictly with SWIFT semantic design tokens (zero hardcoded hex/rgb).

---

### Key Entities

- **User Profile (`public.profiles`)**:
  - `id`: UUID (Primary Key, references `auth.users(id)`)
  - `email`: TEXT UNIQUE
  - `full_name`: TEXT
  - `role`: `user_role` (`admin` | `staff` | `cashier` | `mechanic` | `inventory_clerk`)
  - `permissions`: JSONB (`can_adjust_stock`, `can_override_discount`, `can_manage_pricing`, `can_view_reports`)
  - `status`: TEXT ('Active' | 'Inactive' | 'Suspended')
  - `created_at`: TIMESTAMPTZ
  - `updated_at`: TIMESTAMPTZ

- **Staff Permissions (`StaffPermissions`)**:
  - `can_adjust_stock`: boolean (permits stock inventory adjustments without manager override)
  - `can_override_discount`: boolean (permits ad-hoc discount threshold overrides at POS)
  - `can_manage_pricing`: boolean (permits modifying parts retail/wholesale prices and labor hourly rates)
  - `can_view_reports`: boolean (permits access to daily sales audit and shift analytics reports)

---

## Success Criteria *(mandatory)*

1. **Database Schema Compliance**: Migration applies idempotently in Supabase PostgreSQL; `user_role` includes `inventory_clerk`; `public.profiles.permissions` is valid JSONB with default flags.
2. **Zero Hardcoded Colors**: 100% of user interface elements on `/admin/users` and `AddStaffModal` consume SWIFT tokens (`bg-bg-card`, `border-border`, `text-text-primary`, `bg-primary`, etc.).
3. **Security Invariant Verification**: All non-admin invocation attempts return HTTP 403 / unauthorized error; admin self-demotion is strictly prevented.
4. **Automated Test Coverage**: 100% pass rate on unit and integration tests covering provisioning contracts, permissions schemas, server actions, and self-lockout guards.
