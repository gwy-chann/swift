# Implementation Plan: Supabase Workshop Labor Services Admin CRUD Actions & POS Realtime Synchronization

**Feature**: `015-workshop-labor-services-crud-realtime`  
**Jira Issue**: [SIAA-59](https://the-three-devsketeers.atlassian.net/browse/SIAA-59)  
**Date**: 2026-10-11  

---

## 1. Technical Architecture & File Layout

```
.worktrees/SIAA-59/
├── supabase/
│   └── migrations/
│       └── 20261013000000_labor_services_realtime_and_audit.sql # Realtime pub & audit log table
├── prisma/
│   └── schema.prisma # ServiceRateAuditLog model definition
├── lib/
│   ├── types/
│   │   ├── service.ts # Extended LaborService & audit log types
│   │   └── realtime.ts # Shared realtime channel status types
│   ├── admin/
│   │   ├── service-actions.ts # create, update, toggle, delete server actions
│   │   └── __tests__/
│   │       └── service-actions.test.ts # Unit tests for server actions
│   ├── hooks/
│   │   ├── use-labor-services-realtime.ts # Realtime client hook for POS & admin
│   │   └── __tests__/
│   │       └── use-labor-services-realtime.test.ts
│   └── pos/
│       └── actions.ts # Enhanced getLaborServicesAction with fallback
├── components/
│   ├── admin/
│   │   └── rates/
│   │       ├── labor-rates-table.tsx # Flat-Rate Workshop Labor Schedule Matrix
│   │       ├── edit-service-modal.tsx # Inline rate editing modal
│   │       └── new-service-modal.tsx # Service creation modal with standard bay options
├── app/
│   ├── admin/
│   │   └── rates/
│   │       └── page.tsx # Interactive Admin Rates Matrix page
│   └── staff/
│       └── pos/
│           └── page.tsx # Live subscription to supabase.channel('public:labor_services')
└── specs/
    └── 015-workshop-labor-services-crud-realtime/
```

---

## 2. Implementation Sequence

### Phase 1: Database Migration & Prisma Synchronization
1. Create `supabase/migrations/20261013000000_labor_services_realtime_and_audit.sql`:
   - Register `public.labor_services` in `supabase_realtime` publication.
   - Configure `ALTER TABLE public.labor_services REPLICA IDENTITY FULL;`.
   - Create table `public.service_rate_audit_logs`.
   - Add RLS policies and anti-tamper triggers for `service_rate_audit_logs`.
2. Update `prisma/schema.prisma` with `ServiceRateAuditLog` model and validate (`npx prisma validate`).

### Phase 2: Domain Types & Server Actions (`lib/admin/service-actions.ts`)
1. Extend `lib/types/service.ts` with `ServiceRateAuditLog`, `CreateLaborServicePayload`, `UpdateLaborServicePayload`, and action result types.
2. Implement `lib/admin/service-actions.ts`:
   - `getAdminLaborServicesAction()`
   - `createLaborServiceAction()`
   - `updateLaborServiceAction()`
   - `toggleServiceStatusAction()`
   - `deleteLaborServiceAction()`
   - Path revalidation: `revalidatePath('/admin/rates')` & `revalidatePath('/staff/pos')`.
   - Audit logging: writes to `service_rate_audit_logs`.
3. Unit test server actions in `lib/admin/__tests__/service-actions.test.ts`.

### Phase 3: Realtime Client Hook & POS Terminal Integration
1. Implement `lib/hooks/use-labor-services-realtime.ts` listening to `supabase.channel('public:labor_services')`.
2. Update `app/staff/pos/page.tsx`:
   - Use `useLaborServicesRealtime` or direct channel subscription on `public:labor_services`.
   - Instantly update card pricing when an admin updates a service rate.
   - Dynamically add new services or remove inactive ones.

### Phase 4: Admin Rates Matrix UI Components (`app/admin/rates/page.tsx`)
1. Implement `components/admin/rates/labor-rates-table.tsx`:
   - Table displaying Service Code, Title, Repair Bay, Current Flat Rate, Duration, Active Status, and Actions.
2. Implement `components/admin/rates/edit-service-modal.tsx`:
   - Allows updating rate (PHP), duration, bay, and reason for change.
3. Implement `components/admin/rates/new-service-modal.tsx`:
   - Allows creating new workshop service with repair bay dropdown (Bay 1 / Quick Bay, Bay 2 / Scooter Bay, Bay 3 / Mechanical Bay, Bay 4 / Heavy Repair, Custom).
4. Connect components in `app/admin/rates/page.tsx`.
5. Ensure 100% adherence to SWIFT semantic design tokens and accessibility attributes.

---

## 3. Quality & Verification Gates

- Static type checking: `npm run typecheck` passes with zero errors.
- Linting: `npm run lint` passes cleanly.
- Tests: `npm test` executes and passes all test suites.
- Design tokens check: Zero arbitrary hex or rgb colors used.
