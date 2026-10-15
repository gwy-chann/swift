# Research & Architecture Decisions: Supabase Service Bay Work Orders Schema, Indexes, RLS & Seed Data

**Feature**: `066-service-bay-work-orders-schema-seed`  
**Jira Issue**: [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66) (STORY-6.6)  

---

## 1. Objective & Scope

Design and implement a relational database schema for workshop service bays and active repair work orders in Supabase PostgreSQL, synchronize Prisma models, export TypeScript domain contracts, and seed baseline test fixtures matching the Admin and Staff portal UI requirements.

---

## 2. Existing System Precedents & Conventions

### 2.1 Schema Patterns in SWIFT
Review of previous migrations (`20261008000000_auth_profiles.sql`, `20261011000000_pos_labor_services.sql`, `20261014000000_pos_transactions.sql`, `20261019000000_rbac_permissions.sql`):
- **UUID Primary Keys**: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- **UTC Timestamps**: `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`
- **Idempotent DDL**: `CREATE TABLE IF NOT EXISTS`, `CREATE INDEX IF NOT EXISTS`, `DROP POLICY IF EXISTS ... CREATE POLICY`
- **Admin Privilege Helper**: `public.is_admin()` defined in auth migration as `SECURITY DEFINER`
- **Granular Role Checking**: Checking `role = 'mechanic'::public.user_role` against `public.profiles` for mechanic-specific updates
- **Prisma Synchronization**: Mirroring Postgres types, `@map` column names, foreign keys, and indexes in `prisma/schema.prisma`

### 2.2 UI Data Contract Parity
From `components/admin/service-bay-status.tsx` and `mockup/app.js`:
- Standard 4 bays:
  - Bay 1 (Quick Bay) - Express service
  - Bay 2 (Scooter Bay) - Specialist CVT/Scooter service
  - Bay 3 (Mechanical Bay) - Heavy diagnostic/engine repair
  - Bay 4 (Heavy Repair) - Overhaul / Major repair
- Work Order Statuses:
  - `QUEUED`: Awaiting technician or bay availability
  - `IN PROGRESS`: Actively being worked on by assigned mechanic
  - `PENDING_PARTS`: Paused waiting for warehouse stock pull
  - `COMPLETED`: Finished and verified
  - `CANCELLED`: Withdrawn or customer cancelled

---

## 3. Architecture & Design Decisions

### 3.1 Migration Filename & Ordering
- **Decision**: Name migration `20261020000000_service_bays_work_orders.sql`.
- **Rationale**: `20261019000000_rbac_permissions.sql` was the latest timestamped migration. Using `20261020000000` guarantees this migration runs after all profile, catalog, and permission migrations in deterministic alphabetical order.

### 3.2 Foreign Key Constraints
- `work_orders.bay_id` references `service_bays(id)` with `ON DELETE SET NULL`. If a bay is reconfigured or decommissioned, historical work orders retain their order details without being erased.
- `work_orders.mechanic_id` references `profiles(id)` with `ON DELETE SET NULL`. If an employee profile is altered, work order records remain preserved for accounting audit.

### 3.3 Index Strategy
- `idx_work_orders_bay_id ON public.work_orders(bay_id)`: Speeds up bay occupancy lookups.
- `idx_work_orders_mechanic_id ON public.work_orders(mechanic_id)`: Speeds up mechanic assignment queries ("My active jobs").
- `idx_work_orders_status ON public.work_orders(status)`: Enables rapid filtering by status (`IN PROGRESS`, `QUEUED`).
- `idx_work_orders_status_created_at ON public.work_orders(status, created_at DESC)`: High-performance composite index serving the live queue sorted newest-first.
- `idx_service_bays_status ON public.service_bays(status)`: Quickly counts available/occupied bays.
- `idx_service_bays_display_order ON public.service_bays(display_order ASC)`: Retains fixed physical shop order on dashboards.

### 3.4 Row-Level Security (RLS) Matrix

| Table | Policy Name | Role / Subject | Operation | Condition (USING / WITH CHECK) |
|---|---|---|---|---|
| `service_bays` | `service_bays_select_all` | authenticated | SELECT | `true` |
| `service_bays` | `service_bays_admin_mutate` | authenticated | ALL (INSERT/UPDATE/DELETE) | `public.is_admin()` |
| `work_orders` | `work_orders_select_all` | authenticated | SELECT | `true` |
| `work_orders` | `work_orders_admin_all` | authenticated | ALL | `public.is_admin()` |
| `work_orders` | `work_orders_mechanic_update_assigned` | authenticated | UPDATE | `mechanic_id = (SELECT auth.uid())` |

*Note*: Read permissions are granted to all authenticated staff because the shop floor terminal and cashiers need real-time awareness of bay occupancy and vehicle service status when customers ask for updates at the counter.

### 3.5 Seeding Strategy in `supabase/seed.sql`
- Seed 4 standard service bays with fixed deterministic UUIDs (`e0000000-0000-0000-0000-000000000001` through `0004`).
- Ensure mechanic Dante Reyes exists in `auth.users` and `public.profiles` (`d0000000-0000-0000-0000-000000000003` with role `mechanic`).
- Seed 3 active work orders with fixed deterministic UUIDs (`f0000000-0000-0000-0000-000000000001` through `0003`) and order numbers `WO-2026-0001`, `WO-2026-0002`, `WO-2026-0003`.
- All seed commands use `ON CONFLICT (...) DO UPDATE` to ensure idempotent execution during testing and resets.
