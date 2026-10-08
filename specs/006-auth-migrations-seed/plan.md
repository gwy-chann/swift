# Implementation Plan: Supabase Auth Migrations, User Roles Schema & Demo Seed Script

**Branch**: `feat/SIAA-43-auth-migrations-seed` | **Date**: 2026-10-08 | **Spec**: [`specs/006-auth-migrations-seed/spec.md`](spec.md)

**Input**: Feature specification from `specs/006-auth-migrations-seed/spec.md`

## Summary

Implement reproducible Supabase SQL migrations, user roles schema, and automated demo user seeding for the SWIFT workshop management system:
1. **Supabase SQL Migration**: Create PostgreSQL migration script under `supabase/migrations/` defining the `user_role` enum (`admin`, `staff`, `cashier`, `mechanic`), the `public.profiles` table linked to `auth.users` (`ON DELETE CASCADE`), automated signup trigger function (`handle_new_user`), and high-performance Row Level Security (RLS) policies using subqueries and security helper functions.
2. **Automated Demo Seeding**: Implement `supabase/seed.sql` utilizing `pgcrypto` to provision standard pre-confirmed test personas (`admin@swift.local` and `cashier@swift.local` with password `swift123`) directly into `auth.users`, `auth.identities`, and `public.profiles`.
3. **Prisma ORM Synchronization**: Update `prisma/schema.prisma` with the `Profile` model and `UserRole` enum, ensuring type safety and alignment between PostgreSQL and application data queries.
4. **Validation & Quality**: Deliver comprehensive verification scenarios covering migration resets, RLS boundary tests, live login authentication, and Prisma schema validation.

## Technical Context

**Language/Version**: SQL (PostgreSQL 15+) / TypeScript 5.x / Next.js 16.3.8 App Router

**Primary Dependencies**: Supabase CLI, `@supabase/ssr` (v0.12.7), `@supabase/supabase-js` (v2.117.2), Prisma ORM (`@prisma/client`)

**Storage**: PostgreSQL (Supabase Auth and database tables in `auth` and `public` schemas)

**Testing**: Supabase SQL assertions, `supabase db reset` validation, `npx prisma validate`, end-to-end login flow verification

**Target Platform**: PostgreSQL Database (Supabase Cloud & local CLI environment)

**Project Type**: Database Schema, Migrations, Seed Scripts & ORM Definition

**Performance Goals**: Sub-5-second database reset and seed execution, <10ms RLS profile query evaluation via subquery caching

**Constraints**: Adherence to Supabase Postgres best practices (subquery wrapping for `auth.uid()`, explicit `search_path`, no `auth.role()` deprecations, no insecure `raw_user_meta_data` authorization); strict alignment with SWIFT Constitution.

**Scale/Scope**: Multi-user workshop operations (Admin, Staff, Cashier, Mechanic personas)

## Constitution Check

*GATE: Passed in Phase 0; re-evaluated post-design in Phase 1.*

| Principle | Requirement | Assessment | Status |
| :--- | :--- | :--- | :---: |
| **I. Semantic Design Tokens** | UI elements displaying roles, avatars, or statuses must consume semantic token utilities. | Verified. Domain models and status definitions output semantic category tokens. | **PASS** |
| **II. Single Source of Truth** | Roles, credentials, and seed schemas must mirror Jira SIAA-43 and `mockup/app.js`. | Verified. `admin@swift.local` and `cashier@swift.local` match Jira specifications. | **PASS** |
| **III. Type-Safe Data Architecture** | Strict schema validation with Prisma and Supabase; explicit types for user profiles and roles with zero `any`. | Verified. Full enum definition and Prisma model declared in `data-model.md`. | **PASS** |
| **IV. Test-First Quality** | Repeatable migration, automated seeding, and RLS isolation verified via test scenarios. | Verified. Step-by-step verification commands codified in `quickstart.md`. | **PASS** |
| **V. Server-First & Accessibility** | Profiles table accessible via server components and Prisma client with least privilege. | Verified. RLS policies and server-first queries enforce security boundaries. | **PASS** |

## Project Structure

### Documentation (this feature)

```text
specs/006-auth-migrations-seed/
├── plan.md              # Implementation plan (this file)
├── research.md          # Technical research & architectural decisions (Phase 0)
├── data-model.md        # Entity definitions, Prisma mappings & relationships (Phase 1)
├── quickstart.md        # Migration, seed, and RLS verification guide (Phase 1)
├── contracts/           # Database schema contract & seed specification (Phase 1)
│   └── auth-schema.sql
└── checklists/
    └── requirements.md  # Spec quality checklist
```

### Source Code (repository root)

```text
prisma/
└── schema.prisma                 # Updated with Profile model and UserRole enum

supabase/
├── migrations/
│   └── 20261008000000_auth_profiles.sql  # SQL migration for roles, profiles, triggers & RLS
└── seed.sql                      # Demo user seeding script (admin & cashier accounts)

lib/
└── types/
    └── auth.ts                   # Exporting UserRole and UserProfileRecord types
```

**Structure Decision**: Database migrations and seeding reside in standard `supabase/` directory managed by the Supabase CLI, while ORM contracts reside in `prisma/schema.prisma` and TypeScript domain models in `lib/types/auth.ts`.

## Complexity Tracking

> No constitution violations detected. Standard Supabase migrations, RLS patterns, and Prisma mappings applied.

| Violation | Why Needed | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| *None* | N/A | N/A |
