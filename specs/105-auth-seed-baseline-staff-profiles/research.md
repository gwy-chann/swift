# Research & Architectural Decisions: Baseline Staff Profiles & Credentials

**Feature Branch**: `feat/SIAA-105-auth-seed-baseline-staff-profiles`  
**Created**: 2026-10-26  
**Jira Ticket**: [SIAA-105](https://the-three-devsketeers.atlassian.net/browse/SIAA-105)

---

## 1. Technical Context & Constraints

### 1.1 Supabase Auth & GoTrue Seeding Architecture
- In Supabase, standard email/password authentication relies on three synchronized tables:
  1. `auth.users`: Stores user identity, bcrypt/blowfish encrypted password, confirmation status (`email_confirmed_at`), and user metadata.
  2. `auth.identities`: Required by GoTrue for email identity lookups during `signInWithPassword`.
  3. `public.profiles`: Application-level table storing domain data (`full_name`, `role`, `status`, `pin_code`, `permissions`).
- **Constraint**: `seed.sql` must use `pgcrypto`'s `crypt('swift123', gen_salt('bf'))` for password hashes, and insert matching records into `auth.identities` and `public.profiles`.

### 1.2 Account UUID Mapping & Harmonization
- Existing mock and test data in `lib/mock-data/users.ts` and `lib/staff/constants.ts` use standardized zero-prefixed UUIDs:
  - Admin (Carlos Rodriguez): `00000000-0000-0000-0000-000000000001` (or `a0000000-0000-0000-0000-000000000001`)
  - Cashier (Mike Morales): `00000000-0000-0000-0000-000000000002` (or `c0000000-0000-0000-0000-000000000002`)
  - Mechanic (Dante Reyes): `00000000-0000-0000-0000-000000000003` (or `d0000000-0000-0000-0000-000000000003`)
  - Inventory Clerk (Rico Santos): `00000000-0000-0000-0000-000000000004` (or `d0000000-0000-0000-0000-000000000004`)
- **Decision**: In `seed.sql`, configure both UUID conventions or standardize on `c0000000-...` / `d0000000-...` while ensuring `DEFAULT_DEMO_PINS` in `lib/staff/constants.ts` and `ALL_DEMO_ACCOUNTS` in `lib/auth/constants.ts` resolve both keys cleanly.

### 1.3 Two-Step Authentication Flow
- **Step 1**: Username/email + password entry.
  - The user provides email and password.
  - In demo/development mode, clicking an account in `DemoCredentialsBox` triggers Step 2 directly or auto-fills credentials.
- **Step 2**: 4-Digit Employee PIN Entry.
  - Interactive PIN keypad modal (`StaffPinModal`) prompts the user for their 4-digit PIN (`1234`, `2222`, `3333`, or `8888`).
  - Upon successful PIN verification (verified via `verifyStaffPinAction` against `public.profiles.pin_code` or `DEFAULT_DEMO_PINS`), the session is confirmed and destination routing occurs.

---

## 2. Architectural Decisions & Alternatives Considered

| Decision | Chosen Approach | Alternative Considered | Rationale |
| :--- | :--- | :--- | :--- |
| **Baseline Personas** | 1 Cashier (Mike Morales), 1 Mechanic (Dante Reyes), 1 Inventory Clerk (Rico Santos) | Generic cashier only or duplicate mechanics | Directly satisfies Jira SIAA-105 acceptance criteria and mirrors physical workshop workstations. |
| **Password Storage** | Encrypted via `pgcrypto` (`crypt('swift123', gen_salt('bf'))`) | Plaintext or mock tokens | Complies with Supabase GoTrue authentication requirements and prevents plain credential leakage. |
| **PIN Storage** | Explicit `pin_code` column in `public.profiles` (`VARCHAR(10)`) | Unstructured JSON metadata | Column already provisioned in migration `20261021000000_staff_kiosk_auth_rpcs.sql`; explicit column provides faster indexing and cleaner constraints. |
| **Two-Step Login UX** | Reusable `StaffPinModal` dialog triggered from quick-fill / form verification | Separate `/login/pin` route | Keeps login compact, prevents complex route bouncing, and reuses tested kiosk components. |
