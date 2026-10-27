-- Migration: 20261026000001_labor_services_service_role_grants.sql
-- Description: Ensure service_role and authenticated roles have explicit table privileges on labor_services and audit tables

GRANT ALL ON TABLE public.labor_services TO service_role;
GRANT ALL ON TABLE public.service_rate_audit_logs TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.labor_services TO authenticated;
GRANT SELECT, INSERT ON TABLE public.service_rate_audit_logs TO authenticated;

-- Allow admin role to bypass or update via service_role and authenticated
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'labor_services' AND policyname = 'Allow service_role full access on labor_services'
    ) THEN
        CREATE POLICY "Allow service_role full access on labor_services"
            ON public.labor_services
            FOR ALL
            TO service_role
            USING (true)
            WITH CHECK (true);
    END IF;
END $$;
