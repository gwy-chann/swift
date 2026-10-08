# Feature Specification: Supabase Auth Migrations, User Roles Schema & Demo Seed Script

**Feature Branch**: `feat/SIAA-43-auth-migrations-seed`

**Created**: 2026-10-08

**Status**: Draft

**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-43 - STORY-1.6: Supabase Auth Migrations, User Roles Schema & Demo Seed Script. Reproducible Supabase SQL migrations, user roles schema, and automated demo user seeding (admin@swift.local and cashier@swift.local) matching SWIFT authentication and authorization requirements."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Reproducible Database Schema & Role Provisioning (Priority: P1)

System administrators and developers deploying the SWIFT platform to local development environments or staging instances need an automated, reliable migration process that initializes user profiles, establishes role hierarchies, and secures user data boundaries.

**Why this priority**: Without a deterministic, repeatable database schema and role foundation, user accounts cannot be created, authenticated, or granted appropriate permissions.

**Independent Test**: Can be tested independently by running the migration execution against a clean database instance and verifying that the user profile schema, supported role definitions, and access security rules are established cleanly without errors.

**Acceptance Scenarios**:

1. **Given** a clean or newly provisioned database environment, **When** migration scripts are applied, **Then** the user profiles structure, role definitions (`admin`, `staff`, `cashier`, `mechanic`), and security access rules are created without warnings or failures.
2. **Given** existing schema migrations have been applied, **When** the migration process is re-run or validated, **Then** the system detects existing structures idempotently without data loss or duplicate schema creation.

---

### User Story 2 - Out-of-the-Box Demo Persona Provisioning (Priority: P1)

Onboarding developers, QA engineers, and workshop evaluators need pre-configured, instantly usable demo accounts (`admin@swift.local` for administrative oversight and `cashier@swift.local` for frontline terminal operations) with pre-verified status so they can test store workflows immediately.

**Why this priority**: Eliminates manual signup and email verification hurdles during local testing, automated integration runs, and stakeholder demonstrations.

**Independent Test**: Can be tested independently by executing the seed data routine on a migrated database and confirming that the administrative and cashier demo identities exist, are marked as email-confirmed, and can authenticate immediately.

**Acceptance Scenarios**:

1. **Given** an initialized database with schema migrations applied, **When** the seed routine is executed, **Then** an administrative account (`admin@swift.local`) and a cashier staff account (`cashier@swift.local`) are created with pre-confirmed email status and active profiles.
2. **Given** seeded demo user accounts, **When** an administrator or cashier submits their credentials on the `/login` portal, **Then** authentication succeeds and the user is granted a valid operational session with their designated role.

---

### User Story 3 - Role-Based Data Isolation & Profile Security (Priority: P2)

Staff members, cashiers, and mechanics must only access their own user profile data, while shop administrators must have authorization to manage employee profiles across the workshop.

**Why this priority**: Guarantees organizational data confidentiality, prevents unauthorized privilege escalation, and enforces the principle of least privilege across shop floor terminals.

**Independent Test**: Can be tested independently by querying profile records as an unauthenticated user, an authenticated staff member, and an administrator, verifying that data access boundaries strictly enforce privacy and permission rules.

**Acceptance Scenarios**:

1. **Given** an authenticated staff member or cashier, **When** they request user profile details, **Then** they can view only their own profile information and are blocked from reading or modifying other users' profile records.
2. **Given** an unauthenticated visitor, **When** an attempt is made to read or modify user profile tables directly, **Then** access is denied by security policies.
3. **Given** an authenticated administrator, **When** they query user profile records, **Then** they can inspect employee profiles across the workshop for management purposes.

---

### User Story 4 - Data Model Alignment & Application Contract Sync (Priority: P2)

Application developers and backend services need the application schema definition to mirror the database user profile structures and role types so that type checking and data access remain synchronized.

**Why this priority**: Prevents schema drift, runtime discrepancies, and type mismatches between database records and application-level queries.

**Independent Test**: Can be tested independently by running schema validation tools to verify that the application object-relational mapping aligns with the database profile structure.

**Acceptance Scenarios**:

1. **Given** the database user profiles schema and role types, **When** application schema validation is run, **Then** all user fields, relationships, and role types match without discrepancies or validation errors.

---

### Edge Cases

- **Re-seeding on Existing Accounts**: If seed scripts are executed when demo accounts already exist, the routine should update existing profiles or skip duplicates gracefully without crashing.
- **Malformed Profile Association**: If an authentication record is created without a corresponding profile record, automatic triggers or default routines ensure a default profile is created or clear integrity alerts are reported.
- **Deactivated or Suspended User Login**: If a user's profile status is marked inactive or suspended, login attempts must be rejected or session tokens invalidated.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide database migrations that create and manage a dedicated `profiles` table linked by unique identity reference to the authentication user entity.
- **FR-002**: System MUST define an enumerated role structure supporting at minimum `admin`, `staff`, `cashier`, and `mechanic`.
- **FR-003**: System MUST enforce Row Level Security (RLS) policies ensuring users can read their own profile, while granting administrative roles organizational profile access.
- **FR-004**: System MUST automatically synchronize new authentication signups to the user profiles table via a database trigger function.
- **FR-005**: System MUST provide an automated seeding routine that creates default demo credentials:
  - Administrator: `admin@swift.local` with `admin` role and confirmed email status.
  - Cashier / Staff: `cashier@swift.local` with `cashier` (or `staff`) role and confirmed email status.
- **FR-006**: System MUST ensure seeded passwords are encrypted and immediately verifiable upon login through the authentication hub.
- **FR-007**: System MUST synchronize the application ORM schema definition (`prisma/schema.prisma`) to reflect the user profiles table, role types, and identity relationships.
- **FR-008**: System MUST support repeatable and idempotent execution of migrations and seeds so that environment resets execute cleanly.

### Key Entities *(include if feature involves data)*

- **Auth Identity**: Represents the low-level authentication record containing unique user identifier, login email, encrypted password hash, confirmation status, and authentication timestamps.
- **User Profile**: Represents the application domain profile linked to the Auth Identity, storing full name, avatar/display information, assigned operational role (`admin`, `staff`, `cashier`, `mechanic`), active status, and audit timestamps.
- **Role Definition**: Represents the authorized access tier governing portal permissions (e.g., administrative dashboard access vs. Fast-Lane POS terminal operations).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Database reset and migration execution completes from start to finish with 100% success rate and zero manual SQL interventions.
- **SC-002**: Automated seeding script executes in under 5 seconds on a fresh environment.
- **SC-003**: 100% of seeded demo accounts (`admin@swift.local`, `cashier@swift.local`) can successfully authenticate and receive a valid session token on the `/login` portal.
- **SC-004**: 100% of unauthorized direct queries to user profile records from unauthenticated or non-permitted roles are rejected by row security policies.
- **SC-005**: Schema validation between application models and database profile definitions reports 0 errors or mismatches.

## Assumptions

- **Environment Baseline**: The project utilizes Supabase CLI / PostgreSQL for local database migrations and seed execution.
- **Demo Password Default**: Standard demo accounts use a consistent development password (e.g., `swift123` or `password123`) documented in the local development guidelines.
- **Prisma Schema Role**: `prisma/schema.prisma` acts as the primary application ORM schema and must accurately reflect the PostgreSQL user profile structure.
- **Authentication Service**: Next.js authentication flows interface with Supabase Auth client, utilizing the generated sessions for role-based portal routing.
