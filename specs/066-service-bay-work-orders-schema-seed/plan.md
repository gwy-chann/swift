# Implementation Plan: Supabase Service Bay Work Orders Schema, Indexes, RLS & Seed Data

**Feature**: `066-service-bay-work-orders-schema-seed`  
**Jira Issue**: [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66)  
**Branch**: `feat/SIAA-66-supabase-service-bay-work-orders-schema-seed`  

---

## Technical Context

| Area | Standards & Technology |
|---|---|
| Language / Runtime | TypeScript 5, Node.js 20+ |
| Framework | Next.js App Router (React 19) |
| Database | Supabase PostgreSQL 17 |
| Migrations | `supabase/migrations/` |
| ORM | Prisma 7.x (`prisma/schema.prisma`) |
| Styling & UI | Tailwind CSS v4, SWIFT Semantic Design Tokens |
| Test Runner | Node.js Test Runner (`node --test`) & Vitest / Jest |

---

## Constitution & Guidelines Compliance

- [x] **Principle I (Design Tokens)**: Any UI touchpoint or component (`components/admin/service-bay-status.tsx`) strictly uses semantic design tokens (`bg-bg-card`, `bg-bg-surface`, `text-text-primary`, `bg-success-light`, `text-success`, `bg-accent-light`, `text-accent`). Zero hardcoded hex/rgb.
- [x] **Principle II (Single Source of Truth)**: Table schemas, bay naming, and demo work orders faithfully match `mockup/app.js` and `components/admin/service-bay-status.tsx`.
- [x] **Principle III (Type-Safe Data Architecture)**: Complete end-to-end typing across PostgreSQL DDL, Prisma schema, and exported TypeScript interfaces in `lib/types/service.ts`.
- [x] **Principle IV (Test-First Quality)**: Automated unit tests verify domain model validation, row mapping, and status transitions.
- [x] **Principle V (Server-First Performance)**: Optimized B-tree indexes guarantee constant-time queries on active service bays and work orders.
- [x] **Atomic Commits Enforcement**: Each implementation unit committed independently with Jira key traceability (`[SIAA-66]`).

---

## File Architecture & Boundary Mapping

```
swift/
├── supabase/
│   ├── migrations/
│   │   └── 20261020000000_service_bays_work_orders.sql   # Relational DDL, Indexes & RLS
│   └── seed.sql                                          # Baseline 4 Bays + 3 Work Orders
├── prisma/
│   └── schema.prisma                                     # ServiceBay & WorkOrder models
├── lib/
│   ├── types/
│   │   └── service.ts                                    # Typed domain interfaces & DTOs
│   └── services/
│       ├── service-bay-mapper.ts                         # DB row to domain model mapper
│       └── __tests__/
│           └── service-bay-mapper.test.ts                # Unit tests for mapper & validation
├── components/
│   └── admin/
│       └── service-bay-status.tsx                        # Aligned with canonical domain types
└── specs/
    └── 066-service-bay-work-orders-schema-seed/          # 8 SpecKit artifacts
```

---

## Step-by-Step Implementation Sequence

1. **Phase 1: Specs & Design Artifacts**
   - Produce all 8 SpecKit artifacts in `specs/066-service-bay-work-orders-schema-seed/`.
   - Commit: `docs(specs): [SIAA-66] author canonical SpecKit artifacts for service bay work orders schema`

2. **Phase 2: Database Migration & RLS**
   - Create migration `supabase/migrations/20261020000000_service_bays_work_orders.sql`.
   - Tables: `public.service_bays`, `public.work_orders`.
   - Foreign keys, check constraints, default timestamps, and B-tree indexes.
   - Row-Level Security policies for `admin`, `mechanic`, and read-only authenticated users.
   - Commit: `feat(db): [SIAA-66] create service bays and work orders schema migration with rls`

3. **Phase 3: Prisma Schema Synchronization**
   - Update `prisma/schema.prisma` with `ServiceBay` and `WorkOrder` models and foreign key relations.
   - Run `npx prisma validate` and `npx prisma generate`.
   - Commit: `feat(db): [SIAA-66] synchronize prisma schema with service bay and work order models`

4. **Phase 4: Domain Models, Mapper & Unit Tests (TDD)**
   - Update `lib/types/service.ts` with comprehensive typed interfaces.
   - Implement `lib/services/service-bay-mapper.ts`.
   - Add unit tests in `lib/services/__tests__/service-bay-mapper.test.ts` (test-first validation, status mapping, date handling).
   - Commit: `feat(services): [SIAA-66] add typed service bay domain models, mappers and unit tests`

5. **Phase 5: Baseline Demonstration Seed Data**
   - Update `supabase/seed.sql` to idempotently seed 4 bays and 3 work orders.
   - Commit: `feat(db): [SIAA-66] add baseline demo service bays and active work orders to seed.sql`

6. **Phase 6: UI Component Alignment & Design Tokens**
   - Update `components/admin/service-bay-status.tsx` to consume canonical domain types from `lib/types/service.ts`.
   - Ensure strict SWIFT design tokens adherence.
   - Commit: `feat(admin): [SIAA-66] align service bay status card with typed domain models`

7. **Phase 7: Verification & Convergence**
   - Run `npm test`, `npm run typecheck`, `npm run lint`, `npx prisma validate`.
   - Update `tasks.md` to mark all tasks completed.
   - Commit: `docs(specs): [SIAA-66] complete tasks.md and verification gates`
