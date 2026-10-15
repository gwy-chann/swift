-- ====================================================================
-- Migration: 20261012000003_security_audit_logs.sql
-- Description: Create dedicated forensic security audit logs table,
--              enforce immutable append-only guarantees, anti-tamper triggers,
--              and atomic RPC logger (public.log_security_event).
-- Jira Issue: SIAA-62 (STORY-7.9)
-- Parent Epic: SIAA-7 (EPIC-7: System Admin, Labor Rates Matrix & Auditing)
-- ====================================================================

-- 1. Create table public.security_audit_logs
CREATE TABLE IF NOT EXISTS public.security_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT NOT NULL,
    action TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'security_alert')),
    terminal_ip TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.security_audit_logs IS 'Immutable forensic audit ledger for security events, terminal logins, and administrative modifications';

-- 2. Performance B-tree Indexes
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_created_at_desc ON public.security_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_user_id ON public.security_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_security_audit_logs_severity ON public.security_audit_logs(severity);

-- 3. Anti-Tamper Trigger: Deny any UPDATE or DELETE queries
CREATE OR REPLACE FUNCTION public.prevent_security_audit_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RAISE EXCEPTION 'Audit ledger records in public.security_audit_logs are immutable and append-only. Modification or deletion is strictly forbidden.'
        USING ERRCODE = 'integrity_constraint_violation';
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_security_audit_log_tampering ON public.security_audit_logs;
CREATE TRIGGER trigger_prevent_security_audit_log_tampering
    BEFORE UPDATE OR DELETE ON public.security_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_security_audit_log_tampering();

-- 4. Revoke DML Permissions to prevent accidental or malicious alterations
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.security_audit_logs FROM public, anon, authenticated;

-- 5. Row-Level Security (RLS) Configuration
ALTER TABLE public.security_audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view audit records
DROP POLICY IF EXISTS "security_audit_logs_select_policy" ON public.security_audit_logs;
CREATE POLICY "security_audit_logs_select_policy"
    ON public.security_audit_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- Allow authenticated users to insert audit records (must match their auth.uid if authenticated)
DROP POLICY IF EXISTS "security_audit_logs_insert_policy" ON public.security_audit_logs;
CREATE POLICY "security_audit_logs_insert_policy"
    ON public.security_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

-- 6. Atomic Stored Procedure RPC: public.log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(
    p_action TEXT,
    p_severity TEXT DEFAULT 'info',
    p_terminal_ip TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_email TEXT;
    v_new_id UUID;
BEGIN
    -- Validate severity input
    IF p_severity NOT IN ('info', 'warning', 'security_alert') THEN
        RAISE EXCEPTION 'Invalid severity level: %. Allowed values are info, warning, security_alert.', p_severity
            USING ERRCODE = 'invalid_parameter_value';
    END IF;

    -- Extract caller identity from auth context
    v_user_id := auth.uid();
    
    IF v_user_id IS NOT NULL THEN
        SELECT email INTO v_email FROM auth.users WHERE id = v_user_id;
        IF v_email IS NULL THEN
            v_email := coalesce(current_setting('request.jwt.claims', true)::jsonb->>'email', 'authenticated-user@swift.local');
        END IF;
    ELSE
        -- Fallback for internal service/server action calls
        v_email := coalesce(p_metadata->>'user_email', 'system@swift.local');
    END IF;

    -- Insert immutable audit record
    INSERT INTO public.security_audit_logs (
        user_id,
        user_email,
        action,
        severity,
        terminal_ip,
        metadata
    ) VALUES (
        v_user_id,
        v_email,
        p_action,
        p_severity,
        p_terminal_ip,
        p_metadata
    ) RETURNING id INTO v_new_id;

    RETURN v_new_id;
END;
$$;

COMMENT ON FUNCTION public.log_security_event IS 'Atomic stored procedure to append security events with automatic auth.uid() caller verification';
