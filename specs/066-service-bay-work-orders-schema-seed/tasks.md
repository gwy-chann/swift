# Task Breakdown: Supabase Service Bay Work Orders Schema, Indexes, RLS & Seed Data

**Feature**: `066-service-bay-work-orders-schema-seed`  
**Jira Issue**: [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66)  
**Branch**: `feat/SIAA-66-supabase-service-bay-work-orders-schema-seed`  

---

## Task Progress Summary

- [ ] Task 1: SpecKit Artifacts Authoring & Design Baseline
- [ ] Task 2: Database Migration: `service_bays` & `work_orders` Tables, Indexes, Constraints & RLS
- [ ] Task 3: Prisma Schema Synchronization (`ServiceBay` & `WorkOrder` Models)
- [ ] Task 4 (TDD Red): Failing Unit Tests for Service Bay & Work Order Mapper
- [ ] Task 5 (TDD Green): Domain Models, Types & Mapper Implementation
- [ ] Task 6: Baseline Demonstration Seed Data in `supabase/seed.sql`
- [ ] Task 7: UI Component Alignment (`service-bay-status.tsx`) & Design Tokens
- [ ] Task 8: Full Verification Gate & Task Sign-off

---

## Detailed Task Specifications

### Task 1: SpecKit Artifacts Authoring & Design Baseline
- **Depends on**: None
- **Scope**: Author the 8 canonical SpecKit artifacts in `specs/066-service-bay-work-orders-schema-seed/`.
- **Commit**: `docs(specs): [SIAA-66] author canonical SpecKit artifacts for service bay work orders schema`
- **Verification**: All 8 artifacts present, compliant with SpecKit standards and SWIFT Constitution.

### Task 2: Database Migration: `service_bays` & `work_orders` Tables, Indexes, Constraints & RLS
- **Depends on**: Task 1
- **Scope**: Create `supabase/migrations/20261020000000_service_bays_work_orders.sql`.
  - Tables: `public.service_bays`, `public.work_orders`.
  - B-tree indexes: `idx_work_orders_bay_id`, `idx_work_orders_mechanic_id`, `idx_work_orders_status`, `idx_work_orders_status_created_at`, `idx_service_bays_status`, `idx_service_bays_display_order`.
  - RLS policies: Full CRUD for `admin`, view all & update assigned for `mechanic`, read-only for other authenticated users.
- **Commit**: `feat(db): [SIAA-66] create service bays and work orders schema migration with rls`
- **Verification**: SQL syntax valid, idempotent execution (`IF NOT EXISTS`), clean table definitions.

### Task 3: Prisma Schema Synchronization (`ServiceBay` & `WorkOrder` Models)
- **Depends on**: Task 2
- **Scope**: Add `ServiceBay` and `WorkOrder` models to `prisma/schema.prisma` with relations to `Profile`. Run `npx prisma validate` and `npx prisma generate`.
- **Commit**: `feat(db): [SIAA-66] synchronize prisma schema with service bay and work order models`
- **Verification**: `npx prisma validate` reports schema valid, Prisma Client generates without errors.

### Task 4 (TDD Red): Failing Unit Tests for Service Bay & Work Order Mapper
- **Depends on**: Task 3
- **Scope**: Create `lib/services/__tests__/service-bay-mapper.test.ts` testing DB row mapping, status normalization, and validation rules.
- **Commit**: `test(services): [SIAA-66] add unit tests for service bay and work order domain mapper`
- **Verification**: Tests run via `npm test` and fail initially because mapper implementation does not exist yet (Red phase).

### Task 5 (TDD Green): Domain Models, Types & Mapper Implementation
- **Depends on**: Task 4
- **Scope**: Update `lib/types/service.ts` with domain interfaces (`ServiceBay`, `WorkOrder`, DTOs) and implement `lib/services/service-bay-mapper.ts`.
- **Commit**: `feat(services): [SIAA-66] implement service bay and work order domain models and mappers`
- **Verification**: `npm test` passes all mapper unit tests (Green phase).

### Task 6: Baseline Demonstration Seed Data in `supabase/seed.sql`
- **Depends on**: Task 5
- **Scope**: Add idempotent seed data for 4 standard service bays and 3 active demo work orders to `supabase/seed.sql` with `ON CONFLICT DO UPDATE`. Ensure mechanic Dante Reyes is linked.
- **Commit**: `feat(db): [SIAA-66] add baseline demo service bays and active work orders to seed.sql`
- **Verification**: Seed records match UI mockup data and execute idempotently without key collisions.

### Task 7: UI Component Alignment (`service-bay-status.tsx`) & Design Tokens
- **Depends on**: Task 6
- **Scope**: Update `components/admin/service-bay-status.tsx` to reference canonical domain types from `lib/types/service.ts`, ensuring strict adherence to SWIFT semantic design tokens (`bg-bg-card`, `bg-bg-surface`, `text-text-primary`, `bg-success-light`, `text-success`, `bg-accent-light`, `text-accent`).
- **Commit**: `feat(admin): [SIAA-66] align service bay status card with typed domain models`
- **Verification**: Component compiles cleanly, passes tests and linting.

### Task 8: Full Verification Gate & Task Sign-off
- **Depends on**: Tasks 1-7
- **Scope**: Run full suite verification (`npm test`, `npm run typecheck`, `npm run lint`, `npx prisma validate`). Mark all tasks complete in `tasks.md`.
- **Commit**: `docs(specs): [SIAA-66] mark all implementation and verification tasks complete in tasks.md`
- **Verification**: Zero errors across all static analysis, type checking, and test suites.
