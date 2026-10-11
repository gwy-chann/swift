-- ====================================================================
-- Migration: 20261013000000_labor_services_realtime_and_audit.sql
-- Description: Register public.labor_services in supabase_realtime publication,
--              enable REPLICA IDENTITY FULL, and create immutable
--              service_rate_audit_logs table with anti-tamper controls and RLS.
-- Jira Issue: SIAA-59 (STORY-7.8)
-- ====================================================================

-- 1. Register public.labor_services with supabase_realtime publication
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

-- 2. Configure Full Replica Identity to guarantee complete row context on UPDATE / DELETE
ALTER TABLE public.labor_services REPLICA IDENTITY FULL;

-- 3. Create Immutable Audit Ledger for Labor Rate Changes
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

COMMENT ON TABLE public.service_rate_audit_logs IS 'Immutable audit ledger for flat-rate workshop labor service modifications';

-- 4. Performance Indexes
CREATE INDEX IF NOT EXISTS idx_service_rate_audit_logs_service_id ON public.service_rate_audit_logs(service_id);
CREATE INDEX IF NOT EXISTS idx_service_rate_audit_logs_created_at ON public.service_rate_audit_logs(created_at);

-- 5. Anti-Tamper Trigger: Prevent UPDATE or DELETE on Audit Logs
CREATE OR REPLACE FUNCTION public.prevent_service_rate_audit_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Audit ledger records in public.service_rate_audit_logs are immutable and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_service_rate_audit_tampering ON public.service_rate_audit_logs;
CREATE TRIGGER trigger_prevent_service_rate_audit_tampering
    BEFORE UPDATE OR DELETE ON public.service_rate_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_service_rate_audit_log_tampering();

-- 6. Row-Level Security (RLS) Configuration
ALTER TABLE public.service_rate_audit_logs ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT ON TABLE public.service_rate_audit_logs TO authenticated;
GRANT ALL ON TABLE public.service_rate_audit_logs TO service_role;

-- Policy 1: Authenticated users can view audit logs
DROP POLICY IF EXISTS "Allow authenticated read on service_rate_audit_logs" ON public.service_rate_audit_logs;
CREATE POLICY "Allow authenticated read on service_rate_audit_logs"
    ON public.service_rate_audit_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Policy 2: Admin users can insert audit logs
DROP POLICY IF EXISTS "Allow admin insert on service_rate_audit_logs" ON public.service_rate_audit_logs;
CREATE POLICY "Allow admin insert on service_rate_audit_logs"
    ON public.service_rate_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (public.is_admin());
