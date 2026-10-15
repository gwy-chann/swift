-- ====================================================================
-- Migration: 20261020000000_service_bays_work_orders.sql
-- Description: Workshop service bays and repair work orders relational schema,
--              query optimization B-tree indexes, and granular Row-Level Security (RLS).
-- Jira Issue: SIAA-66 (STORY-6.6)
-- Parent Epic: SIAA-6 (EPIC-6: Executive Analytics, Revenue & Profit Margins)
-- ====================================================================

-- 1. Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Service Bays Table Definition
CREATE TABLE IF NOT EXISTS public.service_bays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    bay_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE', 'QUEUED')),
    display_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.service_bays IS 'Physical workshop service bays for motorcycle maintenance, overhauls, and diagnostics';
COMMENT ON COLUMN public.service_bays.name IS 'Unique bay descriptor, e.g., Bay 1 (Quick Bay)';
COMMENT ON COLUMN public.service_bays.bay_type IS 'Category of service operations handled, e.g., Express, Specialist, Diagnostic, Overhaul';
COMMENT ON COLUMN public.service_bays.status IS 'Current physical availability status of the bay';
COMMENT ON COLUMN public.service_bays.display_order IS 'Integer ordering for dashboard bay display sequence';

-- 3. Work Orders Table Definition
CREATE TABLE IF NOT EXISTS public.work_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number TEXT NOT NULL UNIQUE,
    bay_id UUID REFERENCES public.service_bays(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    vehicle_model TEXT NOT NULL,
    plate_number TEXT NOT NULL,
    service_code TEXT NOT NULL,
    service_name TEXT NOT NULL,
    mechanic_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    status TEXT NOT NULL DEFAULT 'QUEUED' CHECK (status IN ('QUEUED', 'IN PROGRESS', 'PENDING_PARTS', 'COMPLETED', 'CANCELLED')),
    estimated_duration_minutes INT NOT NULL DEFAULT 30,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.work_orders IS 'Active and historical repair work orders executed in workshop service bays';
COMMENT ON COLUMN public.work_orders.order_number IS 'Unique alphanumeric human-readable tracking number (e.g. WO-2026-0001)';
COMMENT ON COLUMN public.work_orders.bay_id IS 'Assigned service bay foreign key';
COMMENT ON COLUMN public.work_orders.mechanic_id IS 'Assigned technician profile foreign key';
COMMENT ON COLUMN public.work_orders.status IS 'Operational lifecycle status: QUEUED, IN PROGRESS, PENDING_PARTS, COMPLETED, CANCELLED';

-- 4. High-Performance B-Tree Indexes
-- Service Bays Indexes
CREATE INDEX IF NOT EXISTS idx_service_bays_status ON public.service_bays(status);
CREATE INDEX IF NOT EXISTS idx_service_bays_display_order ON public.service_bays(display_order ASC);

-- Work Orders Indexes
CREATE INDEX IF NOT EXISTS idx_work_orders_bay_id ON public.work_orders(bay_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_mechanic_id ON public.work_orders(mechanic_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON public.work_orders(status);
CREATE INDEX IF NOT EXISTS idx_work_orders_status_created_at ON public.work_orders(status, created_at DESC);

-- 5. Row-Level Security (RLS) Configuration
ALTER TABLE public.service_bays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_orders ENABLE ROW LEVEL SECURITY;

-- Grants for Supabase PostgREST
GRANT ALL ON TABLE public.service_bays TO authenticated;
GRANT SELECT ON TABLE public.service_bays TO anon;
GRANT ALL ON TABLE public.work_orders TO authenticated;
GRANT SELECT ON TABLE public.work_orders TO anon;

-- 5.1 Service Bays Policies
-- All authenticated users (admins, mechanics, cashiers, staff) can view bays
DROP POLICY IF EXISTS "service_bays_select_all" ON public.service_bays;
CREATE POLICY "service_bays_select_all"
    ON public.service_bays
    FOR SELECT
    TO authenticated
    USING (true);

-- Only admins can mutate service bays configuration
DROP POLICY IF EXISTS "service_bays_admin_all" ON public.service_bays;
CREATE POLICY "service_bays_admin_all"
    ON public.service_bays
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 5.2 Work Orders Policies
-- All authenticated users can view work orders (for terminal monitors and cashier counters)
DROP POLICY IF EXISTS "work_orders_select_all" ON public.work_orders;
CREATE POLICY "work_orders_select_all"
    ON public.work_orders
    FOR SELECT
    TO authenticated
    USING (true);

-- Admins have full access to manage all work orders
DROP POLICY IF EXISTS "work_orders_admin_all" ON public.work_orders;
CREATE POLICY "work_orders_admin_all"
    ON public.work_orders
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Mechanics can update work orders assigned to them
DROP POLICY IF EXISTS "work_orders_mechanic_update_assigned" ON public.work_orders;
CREATE POLICY "work_orders_mechanic_update_assigned"
    ON public.work_orders
    FOR UPDATE
    TO authenticated
    USING (mechanic_id = (SELECT auth.uid()))
    WITH CHECK (mechanic_id = (SELECT auth.uid()));
