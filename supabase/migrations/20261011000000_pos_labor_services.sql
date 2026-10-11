-- ====================================================================
-- Migration: 20261011000000_pos_labor_services.sql
-- Description: Workshop labor services schema, flat rates matrix,
--              B-tree indexes, updated_at trigger, and Row-Level Security.
-- Jira Issue: SIAA-49 (STORY-3.6)
-- ====================================================================

-- 1. Labor Services Table Definition
CREATE TABLE IF NOT EXISTS public.labor_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    bay TEXT NOT NULL,
    rate NUMERIC(10, 2) NOT NULL CHECK (rate >= 0),
    duration TEXT NOT NULL,
    description TEXT NULL,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.labor_services IS 'Workshop labor services, repair bay assignments, flat rates, and durations';

-- 2. Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_labor_services_code ON public.labor_services(code);
CREATE INDEX IF NOT EXISTS idx_labor_services_active ON public.labor_services(active);

-- 3. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION public.update_labor_services_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_labor_services_updated_at ON public.labor_services;
CREATE TRIGGER trigger_labor_services_updated_at
    BEFORE UPDATE ON public.labor_services
    FOR EACH ROW
    EXECUTE FUNCTION public.update_labor_services_updated_at();

-- 4. Row Level Security (RLS) Configuration
ALTER TABLE public.labor_services ENABLE ROW LEVEL SECURITY;

-- PostgREST / Data API Grants
GRANT SELECT ON TABLE public.labor_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.labor_services TO authenticated;
GRANT ALL ON TABLE public.labor_services TO service_role;

-- Policy 1: Public and counter terminal read access
DROP POLICY IF EXISTS "Allow public read access on labor_services" ON public.labor_services;
CREATE POLICY "Allow public read access on labor_services"
    ON public.labor_services
    FOR SELECT
    USING (true);

-- Policy 2: Admin-only modification & deletion
DROP POLICY IF EXISTS "Allow admin full access on labor_services" ON public.labor_services;
CREATE POLICY "Allow admin full access on labor_services"
    ON public.labor_services
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
