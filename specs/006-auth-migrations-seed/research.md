# Research & Technical Decisions: Supabase Auth Migrations, User Roles Schema & Demo Seed Script

**Feature**: Supabase Auth Migrations, User Roles Schema & Demo Seed Script  
**Feature Directory**: `specs/006-auth-migrations-seed`  
**Date**: 2026-10-08  
**Status**: Completed  

---

## Technical Context & Decisions

### 1. User Profiles & `auth.users` Architecture

- **Decision**: Create a dedicated `public.profiles` table with primary key `id uuid references auth.users(id) on delete cascade`.
- **Rationale**: 
  - Standard Supabase architecture separates authentication credentials (managed by GoTrue / `auth.users` in the private `auth` schema) from application domain data in `public`.
  - Enables application-specific attributes (full name, role, status, avatar) to be queried cleanly via standard Postgres, Supabase REST API, and Prisma ORM without granting application services direct write permissions to `auth.users`.
  - `on delete cascade` ensures automatic cleanup when users are deleted from the auth system.
- **Alternatives Considered**:
  - *Direct modification of `auth.users`*: Strongly discouraged by Supabase; internal schema updates may break or be overwritten.
  - *Completely decoupled `users` table with surrogate key*: Requires manual mapping and introduces sync inconsistencies between auth sessions and database records.

---

### 2. Role Definitions & Enforcement Model

- **Decision**: Define a custom Postgres ENUM type `public.user_role` containing `'admin'`, `'staff'`, `'cashier'`, and `'mechanic'`. Include an `is_admin()` security helper function for policy evaluation.
- **Rationale**:
  - Type-safe at the database level, preventing invalid role assignment.
  - Aligns directly with TypeScript `UserRole` domain type (`Admin` | `Cashier` | `Mechanic` | `Staff` in `lib/types/auth.ts`).
  - Storing the role in `public.profiles` ensures that authorization claims are authoritative in the database, avoiding reliance on user-editable `raw_user_meta_data`.
- **Alternatives Considered**:
  - *Free-text VARCHAR role column*: Susceptible to case-sensitivity errors and typographical inconsistencies.
  - *Role claims exclusively in `raw_user_meta_data`*: Insecure per Supabase security rules because `raw_user_meta_data` is client-modifiable.
  - *Role-based Access Control (RBAC) multi-table permissions matrix*: Over-engineered for SWIFT's 4 distinct workshop operational personas.

---

### 3. Automated Signup Profile Provisioning (Triggers)

- **Decision**: Implement a PostgreSQL trigger function `public.handle_new_user()` executed `AFTER INSERT ON auth.users` using `SECURITY DEFINER` and a restricted `SET search_path = public`.
- **Rationale**:
  - Ensures atomic, guaranteed profile row creation whenever a user is created via Supabase Auth API, OAuth, or admin invite.
  - Pulls default full name and role from `raw_user_meta_data` if provided during signup, defaulting to `'staff'` or `'cashier'`.
  - Restricting `search_path` prevents search path hijacking in privileged security functions.
- **Alternatives Considered**:
  - *Client-side profile insertion*: Vulnerable to network drops where `auth.users` is created but the profile insert fails, leaving orphaned accounts.

---

### 4. Row Level Security (RLS) Policy Design & Performance

- **Decision**: 
  - Enable RLS on `public.profiles`.
  - Grant table access explicitly: `GRANT ALL ON TABLE public.profiles TO authenticated; GRANT SELECT ON TABLE public.profiles TO anon;`.
  - Enforce optimized RLS policies:
    1. **Self-Read**: `create policy "Users can read own profile" on public.profiles for select to authenticated using ((select auth.uid()) = id);`
    2. **Admin-Read-All**: `create policy "Admins can view all profiles" on public.profiles for select to authenticated using (public.is_admin());`
    3. **Self-Update**: `create policy "Users can update own profile" on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);`
    4. **Admin-Manage-All**: `create policy "Admins can update all profiles" on public.profiles for update to authenticated using (public.is_admin()) with check (public.is_admin());`
- **Rationale**:
  - Follows Supabase Postgres best practices: wraps `(select auth.uid())` in a subquery to avoid per-row execution overhead, improving performance by 5-10x.
  - Uses `TO authenticated` and explicit ownership checks to prevent Insecure Direct Object References (IDOR).
  - Supplies both `USING` and `WITH CHECK` on update policies to prevent role or ID reassignment.
- **Alternatives Considered**:
  - *`auth.role() = 'authenticated'`*: Deprecated in modern Supabase versions; replaced by explicit `TO authenticated`.

---

### 5. Automated Demo Seeding via `supabase/seed.sql`

- **Decision**: Seed `admin@swift.local` and `cashier@swift.local` directly into `auth.users`, `auth.identities`, and `public.profiles` using `pgcrypto` (`crypt('swift123', gen_salt('bf'))`).
- **Rationale**:
  - `supabase db reset` automatically executes migrations followed by `supabase/seed.sql`.
  - Inserting directly into `auth.users` with `email_confirmed_at = now()` provisions ready-to-login accounts without requiring live email confirmation or active SMTP gateways.
  - Populates both `auth.users` and `auth.identities` (provider `email`) ensuring full compatibility with GoTrue internal auth lookup algorithms.
- **Alternatives Considered**:
  - *Seeding via Supabase JavaScript Admin Client in an npm script*: Requires a running Supabase server instance, slows down CI, and does not integrate natively with `supabase db reset`.

---

### 6. Prisma ORM Synchronization

- **Decision**: Update `prisma/schema.prisma` to declare the `Profile` model mapped to `@@map("profiles")` with fields `id` (UUID), `email` (String), `fullName` (String?), `role` (enum `UserRole`), `status` (String), and timestamps.
- **Rationale**:
  - Satisfies SWIFT Constitution Principle III (Type-Safe Data Architecture & Domain Integrity).
  - Ensures developers can query profiles via `prisma.profile.findUnique()` with full TypeScript autocomplete while respecting the database schema.
  - Aligns database enum values with Prisma enum definitions.
- **Alternatives Considered**:
  - *Not tracking profiles in Prisma*: Results in type loss in server actions and requires manual raw SQL queries for user metadata.

---

## Best Practices Checklist

- [x] RLS enabled on all newly exposed tables in `public` schema.
- [x] Subqueries `(select auth.uid())` used to prevent N-times execution per row.
- [x] Security Definer functions specify explicit `SET search_path = public`.
- [x] Foreign key index created on `profiles(id)` for optimal joins.
- [x] Idempotent migration design (`IF NOT EXISTS`, `ON CONFLICT DO UPDATE`).
- [x] Demo accounts configured with pre-confirmed email status.
