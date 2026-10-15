# Quickstart: Supabase Service Bay Work Orders Schema & Seed Data

**Feature**: `066-service-bay-work-orders-schema-seed`  
**Jira Issue**: [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66)  

---

## 1. Prerequisites

- PostgreSQL database / Supabase local environment
- Existing `public.profiles` table (from `20261008000000_auth_profiles.sql`)
- Node.js 20+ and project dependencies installed

---

## 2. Apply Migration & Seed

Run the database migration and baseline seed:

```bash
# Apply migration
npx supabase db reset
```

Or execute directly against PostgreSQL:
1. `supabase/migrations/20261020000000_service_bays_work_orders.sql`
2. `supabase/seed.sql`

---

## 3. Verify Database Objects

Run SQL verification queries:

```sql
-- Verify table structures
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name IN ('service_bays', 'work_orders');

-- Verify B-tree indexes
SELECT tablename, indexname FROM pg_indexes 
WHERE tablename IN ('service_bays', 'work_orders');

-- Verify Row Level Security enabled
SELECT relname, relrowsecurity FROM pg_class 
WHERE relname IN ('service_bays', 'work_orders');

-- Verify baseline seed data
SELECT id, name, status, display_order FROM public.service_bays ORDER BY display_order;
SELECT order_number, vehicle_model, service_name, status FROM public.work_orders ORDER BY created_at;
```

---

## 4. Prisma Validation & Code Generation

Validate the updated Prisma schema:

```bash
npx prisma validate
npx prisma generate
```

Expected output:
- `The schema at prisma/schema.prisma is valid`
- Prisma Client generated successfully.

---

## 5. Verify TypeScript Types & Unit Tests

Run automated tests and typechecks:

```bash
# Run unit tests for service bay & work order domain mappers
npm test -- lib/services/__tests__/service-bay-mapper.test.ts

# Run static TypeScript checking
npm run typecheck

# Run linter
npm run lint
```

---

## 6. End-to-End Walkthrough Scenarios

1. **Service Bay Availability**:
   - Query `public.service_bays`.
   - Confirm 4 bays are present (Bay 1 Quick Bay, Bay 2 Scooter Bay, Bay 3 Mechanical Bay, Bay 4 Heavy Repair).
   - Verify `display_order` ranks are 1, 2, 3, 4.

2. **Active Work Orders**:
   - Query `public.work_orders`.
   - Confirm 3 baseline demo orders exist (`WO-2026-0001`, `WO-2026-0002`, `WO-2026-0003`).
   - Confirm statuses match `IN PROGRESS` (Bay 1 & 2) and `QUEUED` (Bay 3).

3. **RLS Authorization**:
   - As an admin user: full access to create, update, and delete bays and work orders.
   - As a mechanic user: can read all bays/orders, but only mutate work orders assigned to their `mechanic_id`.
   - As cashier/staff/inventory clerk: read-only access to inspect status.
