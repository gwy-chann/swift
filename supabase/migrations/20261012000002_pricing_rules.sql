-- ====================================================================
-- Migration: 20261012000002_pricing_rules.sql
-- Description: Singleton public.pricing_rules table, constraints,
--              initial seed (35% retail, 18% wholesale, 40% aftermarket, ₱450.00 labor),
--              Supabase Realtime publication registration, immutable audit ledger,
--              and performant Row Level Security (RLS) policies.
-- Jira Issue: SIAA-57 (STORY-7.7)
-- ====================================================================

-- 1. Create Singleton Pricing Rules Table
CREATE TABLE IF NOT EXISTS public.pricing_rules (
    id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    retail_markup NUMERIC NOT NULL CHECK (retail_markup > 0 AND retail_markup <= 200),
    wholesale_markup NUMERIC NOT NULL CHECK (wholesale_markup > 0 AND wholesale_markup <= 200),
    aftermarket_markup NUMERIC NOT NULL CHECK (aftermarket_markup > 0 AND aftermarket_markup <= 200),
    hourly_labor_rate NUMERIC NOT NULL CHECK (hourly_labor_rate >= 0),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

COMMENT ON TABLE public.pricing_rules IS 'Singleton global pricing markup percentages and benchmark hourly labor rate configuration';

-- 2. Seed Default Global Markup Rules & Labor Benchmark
INSERT INTO public.pricing_rules (
    id,
    retail_markup,
    wholesale_markup,
    aftermarket_markup,
    hourly_labor_rate
)
VALUES (
    1,
    35.00,
    18.00,
    40.00,
    450.00
)
ON CONFLICT (id) DO NOTHING;

-- 3. Register public.pricing_rules with Supabase Realtime Publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'pricing_rules'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.pricing_rules;
    END IF;
END$$;

-- Configure Full Replica Identity to guarantee complete row context on UPDATE broadcasts
ALTER TABLE public.pricing_rules REPLICA IDENTITY FULL;

-- 4. Create Immutable Audit Ledger for Markup Rules & Benchmark Changes
CREATE TABLE IF NOT EXISTS public.pricing_rules_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    changed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT DEFAULT 'Admin',
    old_retail_markup NUMERIC NOT NULL,
    new_retail_markup NUMERIC NOT NULL,
    old_wholesale_markup NUMERIC NOT NULL,
    new_wholesale_markup NUMERIC NOT NULL,
    old_aftermarket_markup NUMERIC NOT NULL,
    new_aftermarket_markup NUMERIC NOT NULL,
    old_hourly_labor_rate NUMERIC NOT NULL,
    new_hourly_labor_rate NUMERIC NOT NULL,
    reason TEXT DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.pricing_rules_audit_logs IS 'Immutable audit ledger for global pricing rules and hourly labor benchmark changes';

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_pricing_rules_audit_logs_created_at ON public.pricing_rules_audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_pricing_rules_audit_logs_changed_by ON public.pricing_rules_audit_logs(changed_by);

-- 5. Anti-Tamper Trigger: Prevent UPDATE or DELETE on Audit Logs
CREATE OR REPLACE FUNCTION public.prevent_pricing_rules_audit_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit ledger records in public.pricing_rules_audit_logs are immutable and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_pricing_rules_audit_tampering ON public.pricing_rules_audit_logs;
CREATE TRIGGER trigger_prevent_pricing_rules_audit_tampering
    BEFORE UPDATE OR DELETE ON public.pricing_rules_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_pricing_rules_audit_log_tampering();

-- 6. Row-Level Security (RLS) Configuration for pricing_rules
ALTER TABLE public.pricing_rules ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, UPDATE ON TABLE public.pricing_rules TO authenticated;
GRANT SELECT ON TABLE public.pricing_rules TO anon;
GRANT ALL ON TABLE public.pricing_rules TO service_role;

-- Policy 1: Authenticated users can view pricing rules
DROP POLICY IF EXISTS "Allow authenticated read on pricing_rules" ON public.pricing_rules;
CREATE POLICY "Allow authenticated read on pricing_rules"
    ON public.pricing_rules
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Admin users strictly can update pricing rules
DROP POLICY IF EXISTS "Allow admin update on pricing_rules" ON public.pricing_rules;
CREATE POLICY "Allow admin update on pricing_rules"
    ON public.pricing_rules
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- 7. Row-Level Security (RLS) Configuration for pricing_rules_audit_logs
ALTER TABLE public.pricing_rules_audit_logs ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT ON TABLE public.pricing_rules_audit_logs TO authenticated;
GRANT ALL ON TABLE public.pricing_rules_audit_logs TO service_role;

-- Policy 1: Authenticated users can view audit logs
DROP POLICY IF EXISTS "Allow authenticated read on pricing_rules_audit_logs" ON public.pricing_rules_audit_logs;
CREATE POLICY "Allow authenticated read on pricing_rules_audit_logs"
    ON public.pricing_rules_audit_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Admin users can insert audit logs
DROP POLICY IF EXISTS "Allow admin insert on pricing_rules_audit_logs" ON public.pricing_rules_audit_logs;
CREATE POLICY "Allow admin insert on pricing_rules_audit_logs"
    ON public.pricing_rules_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());
