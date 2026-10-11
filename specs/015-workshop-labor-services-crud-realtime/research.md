# Research & Technical Constraints: Supabase Workshop Labor Services Admin CRUD & POS Realtime Sync

**Feature**: `015-workshop-labor-services-crud-realtime`  
**Jira Issue**: [SIAA-59](https://the-three-devsketeers.atlassian.net/browse/SIAA-59)  
**Date**: 2026-10-11  

---

## 1. Technical Architecture & Decisions

### 1.1 Supabase Realtime Publication for `labor_services`
- **Context**: In migration `20261011010000_enable_realtime_products.sql`, `products` was registered in `supabase_realtime` with `REPLICA IDENTITY FULL`.
- **Decision**: Create migration `20261013000000_labor_services_realtime_and_audit.sql`:
  ```sql
  -- Register labor_services with supabase_realtime
  DO $$
  BEGIN
      IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'labor_services'
      ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.labor_services;
      END IF;
  END
  $$;

  ALTER TABLE public.labor_services REPLICA IDENTITY FULL;
  ```
- **Rationale**: `REPLICA IDENTITY FULL` ensures that on `UPDATE` and `DELETE`, the payload contains both the old and new record states, enabling accurate client differential updates.

### 1.2 Audit Ledger Table & Anti-Tamper Enforcement
- **Context**: Every labor rate change must be audited without possibility of modification or deletion.
- **Decision**: Create `public.service_rate_audit_logs` in the migration:
  ```sql
  CREATE TABLE IF NOT EXISTS public.service_rate_audit_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      service_id UUID NOT NULL REFERENCES public.labor_services(id) ON DELETE CASCADE,
      service_code TEXT NOT NULL,
      old_rate NUMERIC(10, 2) NOT NULL,
      new_rate NUMERIC(10, 2) NOT NULL,
      reason TEXT DEFAULT '',
      user_name TEXT DEFAULT 'Admin Manager',
      created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
  );

  ALTER TABLE public.service_rate_audit_logs ENABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT ON TABLE public.service_rate_audit_logs TO authenticated;
  GRANT ALL ON TABLE public.service_rate_audit_logs TO service_role;

  -- Read policy
  CREATE POLICY "Allow authenticated read on service_rate_audit_logs"
      ON public.service_rate_audit_logs FOR SELECT TO authenticated USING (true);

  -- Insert policy for admins / service_role
  CREATE POLICY "Allow admin insert on service_rate_audit_logs"
      ON public.service_rate_audit_logs FOR INSERT TO authenticated
      WITH CHECK (public.is_admin());
  ```
- Also apply an anti-tamper trigger preventing `UPDATE` and `DELETE` on `service_rate_audit_logs`.

### 1.3 Server Actions Architecture (`lib/admin/service-actions.ts`)
- Use `'use server'` directive.
- Provide:
  - `getAdminLaborServicesAction()`: Fetch all services (both active and inactive) with rates and bay assignments.
  - `createLaborServiceAction(payload: CreateLaborServicePayload)`: Validate code uniqueness, insert into Supabase / Prisma fallback, revalidate paths.
  - `updateLaborServiceAction(serviceId: string, payload: UpdateLaborServicePayload)`: Fetch existing rate, update record in DB, record audit log in `service_rate_audit_logs`, revalidate paths.
  - `toggleServiceStatusAction(serviceId: string, active: boolean)`: Soft toggle active flag, revalidate paths.
  - `deleteLaborServiceAction(serviceId: string)`: Hard delete if unreferenced, revalidate paths.
- Revalidate paths: `revalidatePath('/admin/rates')` and `revalidatePath('/staff/pos')`.

### 1.4 Realtime Subscription on POS Terminal (`/staff/pos`)
- Specification states: "Client Subscription: Terminal POS `/staff/pos` listens on `supabase.channel('public:labor_services')` for live card pricing."
- Create reusable hook `useLaborServicesRealtime(options)` in `lib/hooks/use-labor-services-realtime.ts` (mirroring `useInventoryRealtime`).
- The hook listens to `postgres_changes` on `labor_services` (INSERT, UPDATE, DELETE).
- When an event arrives:
  - UPDATE: Updates the service in state or callback with latency < 500ms. If `active === false`, filters it out or updates it.
  - INSERT: Adds newly created active service to the catalog.
  - DELETE: Removes service from the catalog.

### 1.5 UI Design Tokens & Zero Hardcoded Colors
- Follow SWIFT design tokens (`app/globals.css` and `lib/tokens.ts`).
- Semantic classes: `bg-bg-surface`, `bg-bg-card`, `bg-bg-muted`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-primary`, `bg-primary`, `bg-primary-light`, `text-success`, `bg-success-light`.
- Zero arbitrary Tailwind palette or raw hex codes.
