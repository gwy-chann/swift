# Feature Specification: Supabase Service Bay Work Orders Schema, Indexes, RLS & Baseline Seed Data

**Feature Branch**: `feat/SIAA-66-supabase-service-bay-work-orders-schema-seed`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66) (STORY-6.6)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Prerequisites**: [SIAA-43](https://the-three-devsketeers.atlassian.net/browse/SIAA-43) (STORY-1.6: Supabase Auth Profiles, Roles & System Permissions Schema)  
**Downstream Dependents**: STORY-6.7 (Executive Analytics RPCs), STORY-6.8 (Realtime Operational Broadcast), STORY-6.9 (Server Actions & UI Wiring), [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35) (STORY-6.3: Live Service Bay Work Order Queue & Mechanic Utilization Monitor)

---

## Executive Summary & Business Intent

SWIFT operations combine retail motorcycle parts counter sales with active workshop repair bays. To deliver live shop-floor monitoring, technician allocation, and executive bay turnaround analytics, the application requires a persistent, constraint-enforced relational schema for physical service bays and repair work orders in Supabase PostgreSQL.

This specification formalizes the database tables (`public.service_bays` and `public.work_orders`), high-performance B-tree indexes, role-based Row-Level Security (RLS) policies, Prisma ORM schema synchronization, canonical TypeScript domain contracts, and authoritative baseline seed data mirroring the workshop UI mockups (`mockup/app.js` and `components/admin/service-bay-status.tsx`).

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Relational Service Bays & Work Orders Provisioning (Priority: P1)

As a Service Bay Manager or Shop Owner,  
I want a relational database schema for workshop service bays and active repair work orders with foreign key relationships, check constraints, and default timestamps,  
so that technician assignments, motorcycle service stages, and bay turnaround metrics are reliably persisted with relational integrity.

**Why this priority**: Core tables `service_bays` and `work_orders` are the single source of truth for all workshop repair activity in SWIFT. Downstream live queues, real-time broadcasts, and analytics calculations directly depend on this relational structure.

**Independent Test**: Execute SQL migration `20261020000000_service_bays_work_orders.sql` on Supabase PostgreSQL and verify `public.service_bays` and `public.work_orders` exist with specified columns, constraints, foreign keys, and default values.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Provisioning Service Bays & Work Orders Tables
  Given an executing PostgreSQL instance with public.profiles
  When database migration 20261020000000_service_bays_work_orders.sql is applied
  Then table public.service_bays is created with:
    | column        | type        | constraints                              |
    | id            | UUID        | PRIMARY KEY DEFAULT gen_random_uuid()    |
    | name          | TEXT        | NOT NULL UNIQUE                          |
    | bay_type      | TEXT        | NOT NULL                                 |
    | status        | TEXT        | NOT NULL DEFAULT 'AVAILABLE'             |
    | display_order | INT         | NOT NULL DEFAULT 0                       |
    | created_at    | TIMESTAMPTZ | NOT NULL DEFAULT timezone('utc', now())  |
    | updated_at    | TIMESTAMPTZ | NOT NULL DEFAULT timezone('utc', now())  |
  And table public.work_orders is created with:
    | column                     | type        | constraints                                                                                  |
    | id                         | UUID        | PRIMARY KEY DEFAULT gen_random_uuid()                                                        |
    | order_number               | TEXT        | NOT NULL UNIQUE                                                                              |
    | bay_id                     | UUID        | NULLABLE REFERENCES public.service_bays(id) ON DELETE SET NULL                               |
    | customer_name              | TEXT        | NOT NULL                                                                                     |
    | vehicle_model              | TEXT        | NOT NULL                                                                                     |
    | plate_number               | TEXT        | NOT NULL                                                                                     |
    | service_code               | TEXT        | NOT NULL                                                                                     |
    | service_name               | TEXT        | NOT NULL                                                                                     |
    | mechanic_id                | UUID        | NULLABLE REFERENCES public.profiles(id) ON DELETE SET NULL                                   |
    | status                     | TEXT        | NOT NULL CHECK (status IN ('QUEUED', 'IN PROGRESS', 'PENDING_PARTS', 'COMPLETED', 'CANCELLED'))|
    | estimated_duration_minutes | INT         | NOT NULL DEFAULT 30                                                                          |
    | started_at                 | TIMESTAMPTZ | NULLABLE                                                                                     |
    | completed_at               | TIMESTAMPTZ | NULLABLE                                                                                     |
    | notes                      | TEXT        | NULLABLE                                                                                     |
    | created_at                 | TIMESTAMPTZ | NOT NULL DEFAULT timezone('utc', now())                                                      |
    | updated_at                 | TIMESTAMPTZ | NOT NULL DEFAULT timezone('utc', now())                                                      |
  And Prisma schema prisma/schema.prisma includes synchronized ServiceBay and WorkOrder models.
```

---

### User Story 2 - Query Optimization B-Tree Indexes (Priority: P1)

As a Service Bay Technician or Admin Dashboard user,  
I want optimized B-tree indexes on bay assignment, mechanic assignment, work order status, and created recency,  
so that real-time workshop monitors and bay status cards render in under 50ms without table sequential scans.

**Why this priority**: Shop monitors poll or stream active work orders continuously. B-tree indexing prevents index degradation as historical work order volume scales.

**Independent Test**: Verify `pg_indexes` for `public.work_orders` and `public.service_bays` post-migration.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Verifying query optimization B-tree indexes
  Given migration 20261020000000_service_bays_work_orders.sql is executed
  When querying pg_indexes on public.work_orders
  Then indexes exist for:
    | index_name                        | columns                      |
    | idx_work_orders_bay_id            | bay_id                       |
    | idx_work_orders_mechanic_id       | mechanic_id                  |
    | idx_work_orders_status            | status                       |
    | idx_work_orders_status_created_at | status, created_at DESC      |
  And indexes on public.service_bays exist for:
    | index_name                        | columns                      |
    | idx_service_bays_status           | status                       |
    | idx_service_bays_display_order    | display_order ASC            |
```

---

### User Story 3 - Role-Based Row-Level Security (RLS) Boundaries (Priority: P1)

As a Shop Administrator,  
I want strict Row-Level Security policies enforced on `service_bays` and `work_orders`,  
so that shop mechanics can only modify work orders assigned to them, staff members can view bay status, and only admins have full mutating authority.

**Why this priority**: Protects against unauthorized tampering with labor durations, mechanic attribution, and bay allocations.

**Independent Test**: Execute queries across authenticated roles (`admin`, `mechanic`, `cashier`, `staff`) and verify permission bounds.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Admin role has full CRUD permissions
  Given an authenticated user session with role 'admin'
  When executing SELECT, INSERT, UPDATE, or DELETE on public.service_bays or public.work_orders
  Then all operations succeed without RLS violation.

Scenario: Mechanic role can view all bays/orders and update assigned work orders
  Given an authenticated user session with role 'mechanic'
  When executing SELECT on public.service_bays and public.work_orders
  Then all records are visible
  When executing UPDATE on public.work_orders where mechanic_id = auth.uid()
  Then the update is permitted
  When executing UPDATE on public.work_orders where mechanic_id != auth.uid()
  Then the update is rejected or affects zero rows.

Scenario: Cashier, Staff, and Inventory Clerk have read-only visibility
  Given an authenticated user session with role 'cashier', 'staff', or 'inventory_clerk'
  When executing SELECT on public.service_bays or public.work_orders
  Then records are returned
  When executing INSERT, UPDATE, or DELETE on public.service_bays or public.work_orders
  Then the mutation is rejected by RLS.
```

---

### User Story 4 - Authoritative Baseline Demonstration Seed Data (Priority: P2)

As a Developer or Workshop Manager,  
I want baseline seed data for 4 standard service bays and 3 active demonstration work orders populated idempotently in `supabase/seed.sql`,  
so that the Admin Service Bay Status card and Staff shop floor monitors reflect live sample data matching `mockup/app.js` and `components/admin/service-bay-status.tsx`.

**Why this priority**: Ensures seamless demo capabilities, UI component parity, and reproducible end-to-end testing environments.

**Independent Test**: Run `supabase db reset` or execute `supabase/seed.sql` twice, confirming four bays and three work orders exist without primary key or unique key collisions.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Idempotent seeding of service bays and work orders
  Given the execution of supabase/seed.sql
  When records are inserted into public.service_bays
  Then 4 standard bays are created:
    | id                                   | name                   | bay_type    | status    | display_order |
    | e0000000-0000-0000-0000-000000000001 | Bay 1 (Quick Bay)      | Express     | OCCUPIED  | 1             |
    | e0000000-0000-0000-0000-000000000002 | Bay 2 (Scooter Bay)    | Specialist  | OCCUPIED  | 2             |
    | e0000000-0000-0000-0000-000000000003 | Bay 3 (Mechanical Bay) | Diagnostic  | QUEUED    | 3             |
    | e0000000-0000-0000-0000-000000000004 | Bay 4 (Heavy Repair)   | Overhaul    | AVAILABLE | 4             |
  And 3 baseline work orders are seeded:
    | order_number | bay_id                               | vehicle_model          | service_name                   | status      |
    | WO-2026-0001 | e0000000-0000-0000-0000-000000000001 | Yamaha NMAX 155        | Oil Change + Brake Pads        | IN PROGRESS |
    | WO-2026-0002 | e0000000-0000-0000-0000-000000000002 | Honda Click 150i       | Full CVT Overhaul              | IN PROGRESS |
    | WO-2026-0003 | e0000000-0000-0000-0000-000000000003 | Suzuki Raider 150 Fi   | Clutch Replacement             | QUEUED      |
  And re-running the seed script updates records idempotently via ON CONFLICT.
```

---

### User Story 5 - Typed Interface & Component Alignment (Priority: P2)

As a Frontend Engineer,  
I want generated TypeScript interfaces in `lib/types/service.ts` aligned with Prisma and database models, and `components/admin/service-bay-status.tsx` updated to use these canonical types,  
so that UI components consume strict type-safe representations instead of hardcoded ad-hoc mock structures.

**Why this priority**: Eliminates disparate mock models, guarantees schema changes surface as TypeScript compile errors, and aligns frontend with backend contracts.

**Independent Test**: Run `npx tsc --noEmit` and confirm zero type errors across `lib/types/service.ts` and `components/admin/service-bay-status.tsx`.

---

## Invariants & Business Rules

1. **Unique Order Numbering**: `order_number` must follow the format `WO-YYYY-XXXX` and be strictly unique.
2. **Work Order Status Lifecycle**: Valid transitions:
   `QUEUED` ➔ `IN PROGRESS` ➔ `COMPLETED`  
   `IN PROGRESS` ➔ `PENDING_PARTS` ➔ `IN PROGRESS`  
   Any active state ➔ `CANCELLED`.
3. **Foreign Key Integrity**:
   - `work_orders.bay_id` references `service_bays(id)` with `ON DELETE SET NULL`.
   - `work_orders.mechanic_id` references `profiles(id)` with `ON DELETE SET NULL`.
4. **Zero Hardcoded Colors**: All UI components displaying work orders or bays must strictly use SWIFT semantic design tokens (`bg-bg-card`, `text-text-primary`, `bg-accent-light`, `text-accent`, `bg-success-light`, `text-success`).

---

## Assumptions & Dependencies

- Supabase profiles table (`public.profiles`) is already provisioned by `20261008000000_auth_profiles.sql` with user roles `admin`, `staff`, `cashier`, `mechanic`, `inventory_clerk`.
- Seed mechanic Dante Reyes is provisioned in `auth.users` and `public.profiles` (`d0000000-0000-0000-0000-000000000003`) or linked safely during seed execution.
- Work order numbers are unique human-readable identifiers for physical paperwork and digital receipts.
