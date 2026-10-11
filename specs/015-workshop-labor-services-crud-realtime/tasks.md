# Implementation Tasks: Supabase Workshop Labor Services Admin CRUD Actions & POS Realtime Synchronization

**Feature**: `015-workshop-labor-services-crud-realtime`  
**Jira Issue**: [SIAA-59](https://the-three-devsketeers.atlassian.net/browse/SIAA-59)  
**Date**: 2026-10-11  

---

## Task Breakdown

### Phase 1: Database Migration & Prisma ORM Schema
- [x] **Task 1.1**: Create migration `supabase/migrations/20261013000000_labor_services_realtime_and_audit.sql`
  - Register `public.labor_services` in `supabase_realtime` publication.
  - Set `ALTER TABLE public.labor_services REPLICA IDENTITY FULL;`.
  - Create table `public.service_rate_audit_logs` with columns (`id`, `service_id`, `service_code`, `old_rate`, `new_rate`, `reason`, `user_name`, `created_at`).
  - Configure RLS policies and anti-tamper triggers for `service_rate_audit_logs`.
- [x] **Task 1.2**: Update `prisma/schema.prisma` to include `ServiceRateAuditLog` model and validate with `npx prisma validate`.

### Phase 2: Domain Types & Server Actions
- [x] **Task 2.1**: Update `lib/types/service.ts` with `ServiceRateAuditLog`, `CreateLaborServicePayload`, `UpdateLaborServicePayload`, and `ServiceActionResult`.
- [x] **Task 2.2**: Implement `lib/admin/service-actions.ts`:
  - `getAdminLaborServicesAction()`: retrieve all services (active & inactive) with proper sorting.
  - `createLaborServiceAction()`: input validation with Zod, database insertion, path revalidation.
  - `updateLaborServiceAction()`: rate update, audit logging into `service_rate_audit_logs`, path revalidation.
  - `toggleServiceStatusAction()`: soft-delete/deactivate toggle, path revalidation.
  - `deleteLaborServiceAction()`: hard deletion if unreferenced, path revalidation.
- [x] **Task 2.3**: Create unit test suite in `lib/admin/__tests__/service-actions.test.ts`.

### Phase 3: Realtime Client Hook & POS Synchronization
- [x] **Task 3.1**: Implement `lib/hooks/use-labor-services-realtime.ts` listening to `supabase.channel('public:labor_services')` on `postgres_changes`.
- [x] **Task 3.2**: Add test suite `lib/pos/__tests__/labor-realtime-mapper.test.ts`.
- [x] **Task 3.3**: Integrate Realtime listener into `app/staff/pos/page.tsx` for dynamic service catalog updates without page reload.

### Phase 4: Admin Rates Matrix UI Components
- [x] **Task 4.1**: Create `components/admin/rates/labor-rates-table.tsx` with SWIFT design tokens (`bg-bg-card`, `border-border`, etc.).
- [x] **Task 4.2**: Create `components/admin/rates/edit-service-modal.tsx` with rate input, duration, bay, and reason fields.
- [x] **Task 4.3**: Create `components/admin/rates/new-service-modal.tsx` with repair bay dropdown (Bay 1..4 + custom) and validation.
- [x] **Task 4.4**: Update `app/admin/rates/page.tsx` replacing the placeholder with the interactive Labor Schedule Matrix, statistics cards, and modals.

### Phase 5: Verification & Convergence
- [x] **Task 5.1**: Run TypeScript verification (`npm run typecheck`).
- [x] **Task 5.2**: Run ESLint verification (`npm run lint`).
- [x] **Task 5.3**: Run automated test suite (`npm test`).
- [x] **Task 5.4**: Execute Atomic Commits linked to `[SIAA-59]`.
- [x] **Task 5.5**: Push branch and open Pull Request (`create-pr`).
