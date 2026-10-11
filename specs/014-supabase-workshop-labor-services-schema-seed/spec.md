# Feature Specification: Supabase Workshop Labor Services Schema, Rates Matrix & Baseline Seed Data

**Feature Branch**: `feat/SIAA-49-supabase-labor-services-schema-rates`  
**Created**: 2026-10-11  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-49](https://the-three-devsketeers.atlassian.net/browse/SIAA-49) (STORY-3.6)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) (EPIC-3: Point of Sale & Hybrid Service Billing)  

---

## 1. Executive Summary & Objective

In a hybrid motorcycle parts and service shop, counter staff and cashier terminals must be able to add standard repair bay services (e.g. Oil & Gear Oil Change, CVT Cleaning & Regreasing, Tubeless Tire Mounting, Brake Caliper Flush, FI Throttle Body Cleaning, Front Shock Re-oil & Seal Replacement) directly into customer work orders alongside physical retail/wholesale parts.

This feature establishes the authoritative database layer in Supabase PostgreSQL (`public.labor_services`), populates the 6 baseline workshop services matching `mockup/app.js` and `lib/mock-data/services.ts`, applies strict Row-Level Security (RLS) policies, synchronizes the schema 1:1 with Prisma ORM, implements the cached server action `getLaborServicesAction()` in `lib/pos/actions.ts`, and wires the Fast-Lane POS terminal (`/staff/pos`) to hydrate live repair bay service cards with flat rates.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Idempotent Workshop Labor Services Schema Provisioning (Priority: P1)

* **As a** Database Administrator or System Operator,
* **I want** a dedicated `public.labor_services` table with constraints and performance indexes,
* **so that** workshop labor services, standardized service codes, repair bays, and flat rates are reliably persisted.

**Acceptance Criteria**:
1. **Given** a Supabase PostgreSQL instance, **When** migration `20261011000000_pos_labor_services.sql` is executed, **Then** the table `public.labor_services` is created with:
   - `id`: UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
   - `code`: TEXT NOT NULL UNIQUE (e.g., `'SRV-OIL-01'`)
   - `name`: TEXT NOT NULL
   - `bay`: TEXT NOT NULL (e.g., `'Bay 1 / Quick Bay'`)
   - `rate`: NUMERIC(10, 2) NOT NULL CHECK (`rate >= 0`)
   - `duration`: TEXT NOT NULL (e.g., `'15 mins'`, `'45 mins'`)
   - `description`: TEXT NULL
   - `active`: BOOLEAN NOT NULL DEFAULT true
   - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT `timezone('utc'::text, now())`
   - `updated_at`: TIMESTAMPTZ NOT NULL DEFAULT `timezone('utc'::text, now())`
2. **Given** table creation, **When** examining database indexes, **Then** B-tree indexes exist for `code` (`idx_labor_services_code`) and `active` (`idx_labor_services_active`) for sub-10ms lookup times.
3. **Given** record modifications, **When** an existing labor service is updated, **Then** the `trigger_labor_services_updated_at` trigger automatically updates `updated_at`.

---

### User Story 2 - Canonical Baseline Workshop Services Seeding (Priority: P1)

* **As a** Service Desk Advisor or Cashier,
* **I want** the 6 canonical motorcycle workshop services pre-seeded upon system setup,
* **so that** the repair bay catalog is immediately available in the POS terminal with standardized pricing.

**Acceptance Criteria**:
1. **Given** a migrated database environment, **When** `supabase/seed.sql` is executed, **Then** all 6 canonical repair bay services from `mockup/app.js` are inserted idempotently (`ON CONFLICT (code) DO UPDATE`):
   - `SRV-OIL-01`: Standard Oil & Gear Oil Change | Bay 1 / Quick Bay | ₱100.00 | 15 mins
   - `SRV-CVT-01`: CVT Cleaning & Regreasing | Bay 2 / Scooter Bay | ₱350.00 | 45 mins
   - `SRV-TIRE-01`: Tubeless Tire Mounting & Bead Sealing | Bay 1 / Quick Bay | ₱150.00 | 20 mins
   - `SRV-BRK-01`: Brake Caliper Flush & Bleeding | Bay 3 / Mechanical Bay | ₱250.00 | 30 mins
   - `SRV-TUNE-01`: Full FI Throttle Body Cleaning & Reset | Bay 3 / Mechanical Bay | ₱650.00 | 60 mins
   - `SRV-FORK-01`: Front Shock Re-oil & Seal Replacement | Bay 4 / Heavy Repair | ₱800.00 | 90 mins
2. **Given** subsequent runs of `seed.sql`, **When** executed again, **Then** no duplicate rows or constraint violations occur.

---

### User Story 3 - Role-Based Row-Level Security Boundaries (Priority: P1)

* **As a** Security Compliance Auditor,
* **I want** RLS policies guarding `public.labor_services`,
* **so that** staff members can read services while unauthorized mutations are prevented.

**Acceptance Criteria**:
1. **Given** staff members, cashiers, or public terminal clients, **When** querying active labor services, **Then** `SELECT` operations are permitted (`USING (true)`).
2. **Given** authenticated non-admin staff or anonymous users, **When** attempting to `INSERT`, `UPDATE`, or `DELETE` labor service rates or bay definitions, **Then** the database rejects the operation with an authorization error.
3. **Given** authenticated administrators with `admin` role, **When** updating labor rates or creating new services, **Then** the operations succeed (`USING (public.is_admin()) WITH CHECK (public.is_admin())`).

---

### User Story 4 - Prisma ORM Model Synchronization (Priority: P2)

* **As a** Full-Stack Developer,
* **I want** the `LaborService` model declared in `prisma/schema.prisma`,
* **so that** type-safe ORM access and schema validation pass cleanly.

**Acceptance Criteria**:
1. **Given** `prisma/schema.prisma`, **When** `LaborService` model is defined, **Then** fields match `public.labor_services` 1:1:
   - `id`: String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
   - `code`: String @unique
   - `name`: String
   - `bay`: String
   - `rate`: Decimal @db.Decimal(10, 2)
   - `duration`: String
   - `description`: String?
   - `active`: Boolean @default(true)
   - `createdAt`: DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
   - `updatedAt`: DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)
   - `@@map("labor_services")`
2. **Given** schema changes, **When** `npx prisma validate` is executed, **Then** validation exits with code 0 without errors.

---

### User Story 5 - POS Server Action & Terminal UI Hydration (Priority: P1)

* **As a** Cashier operating the Fast-Lane POS terminal,
* **I want** the "SERVICES" tab in `/staff/pos` to dynamically fetch and display live labor services from Supabase,
* **so that** I can add flat-rate workshop services with bay assignments directly to customer carts.

**Acceptance Criteria**:
1. **Given** `lib/pos/actions.ts`, **When** `getLaborServicesAction()` is called, **Then** it queries `public.labor_services` (ordering by `code` ASC, filtering `active = true`), gracefully falls back to `MOCK_SERVICES` if the database is unreachable, and returns typed `LaborService[]`.
2. **Given** the POS page `/staff/pos`, **When** the page loads, **Then** `getLaborServicesAction()` hydrates the services list.
3. **Given** the catalog category filter, **When** clicking "SERVICES", **Then** all 6 active workshop labor cards render with service code, name, bay badge, duration, and flat rate (₱).
4. **Given** a labor service card, **When** clicking "Add", **Then** the service item is added to the POS cart with flat rate pricing that remains invariant across retail/wholesale pricing mode switches.

---

## 3. Non-Functional Requirements & Design Tokens
- **Design Tokens Compliance**: All badge, card, and button colors MUST strictly use semantic tokens (`bg-bg-card`, `border-border`, `text-primary`, `bg-primary`, `bg-bg-muted`, `text-text-secondary`). Zero hardcoded hex/rgb.
- **Performance**: Service query response time < 50ms with B-tree index on `active` and `code`.
- **Offline / Standalone Resilience**: Server action gracefully falls back to `MOCK_SERVICES` when database credentials are not connected or during isolated mock development.
