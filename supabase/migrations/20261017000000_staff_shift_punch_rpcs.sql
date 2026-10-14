-- ====================================================================
-- Migration: 20261017000000_staff_shift_punch_rpcs.sql
-- Description: Atomic stored procedures (clock_in_shift, clock_out_shift,
--              toggle_shift_break), concurrency guard unique partial index,
--              and immutable staff_shift_audit_logs ledger with anti-tamper trigger.
-- Jira Issue: SIAA-61 (STORY-5.7)
-- Prerequisites: 20261015000000_staff_shifts.sql (SIAA-60)
-- ====================================================================

-- 1. Immutable Staff Shift Audit Ledger Table
CREATE TABLE IF NOT EXISTS public.staff_shift_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    shift_id UUID NOT NULL REFERENCES public.staff_shifts(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    terminal_id TEXT NOT NULL DEFAULT 'Terminal #01',
    action TEXT NOT NULL CHECK (action IN ('clock_in', 'clock_out', 'break_start', 'break_end')),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.staff_shift_audit_logs IS 'Immutable append-only ledger tracking all shift state transitions (clock in, clock out, break start/end) with terminal and employee attribution';
COMMENT ON COLUMN public.staff_shift_audit_logs.action IS 'clock_in | clock_out | break_start | break_end';

-- Performance B-Tree Indexes for Audit Ledger
CREATE INDEX IF NOT EXISTS idx_staff_shift_audit_logs_shift ON public.staff_shift_audit_logs(shift_id);
CREATE INDEX IF NOT EXISTS idx_staff_shift_audit_logs_profile_created ON public.staff_shift_audit_logs(profile_id, created_at DESC);

-- 2. Anti-Tamper Trigger on staff_shift_audit_logs
CREATE OR REPLACE FUNCTION public.prevent_staff_shift_audit_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'TAMPER_FORBIDDEN: Audit ledger records in staff_shift_audit_logs are immutable and cannot be updated or deleted.'
        USING ERRCODE = '55000'; -- Object not modifiable
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_staff_shift_audit_tampering ON public.staff_shift_audit_logs;
CREATE TRIGGER trigger_prevent_staff_shift_audit_tampering
    BEFORE UPDATE OR DELETE ON public.staff_shift_audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_staff_shift_audit_tampering();

-- 3. Concurrency Guard: Unique Partial Index on staff_shifts
-- Enforces at most one active ('on_shift' or 'break') shift per employee at the physical table level
CREATE UNIQUE INDEX IF NOT EXISTS idx_staff_shifts_one_active_per_employee
    ON public.staff_shifts (profile_id)
    WHERE (status IN ('on_shift', 'break'));

-- 4. Row Level Security (RLS) Configuration on Audit Table
ALTER TABLE public.staff_shift_audit_logs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT ON TABLE public.staff_shift_audit_logs TO authenticated;
GRANT ALL ON TABLE public.staff_shift_audit_logs TO service_role;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.staff_shift_audit_logs FROM authenticated, anon, public;

-- Policy: Employees can view their own audit logs, Admins can view all
DROP POLICY IF EXISTS "Users can read own shift audit logs" ON public.staff_shift_audit_logs;
CREATE POLICY "Users can read own shift audit logs"
    ON public.staff_shift_audit_logs
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = profile_id OR public.is_admin());

-- Policy: Authenticated users can insert their own shift audit logs, Admins can insert any
DROP POLICY IF EXISTS "Users can insert own shift audit logs" ON public.staff_shift_audit_logs;
CREATE POLICY "Users can insert own shift audit logs"
    ON public.staff_shift_audit_logs
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = profile_id OR public.is_admin());


-- ====================================================================
-- 5. Stored Procedure: public.clock_in_shift
-- ====================================================================
CREATE OR REPLACE FUNCTION public.clock_in_shift(
    p_terminal_id TEXT DEFAULT 'Terminal #01',
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_profile_id UUID;
    v_staff_name TEXT;
    v_shift public.staff_shifts%ROWTYPE;
    v_audit_id UUID;
BEGIN
    -- 1. Extract and validate authenticated user profile
    v_profile_id := auth.uid();
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED'
            USING ERRCODE = '28000',
                  DETAIL = 'Must be an authenticated user to clock in.';
    END IF;

    -- 2. Resolve employee display name from profiles or fallback
    SELECT COALESCE(full_name, email, 'Staff Member')
    INTO v_staff_name
    FROM public.profiles
    WHERE id = v_profile_id;

    IF v_staff_name IS NULL THEN
        v_staff_name := 'Staff Member';
    END IF;

    -- 3. Check for existing active shift (status in 'on_shift' or 'break')
    IF EXISTS (
        SELECT 1 FROM public.staff_shifts
        WHERE profile_id = v_profile_id
          AND status IN ('on_shift', 'break')
    ) THEN
        RAISE EXCEPTION 'ACTIVE_SHIFT_EXISTS'
            USING ERRCODE = 'P0409',
                  DETAIL = 'Active shift already in progress for this profile.';
    END IF;

    -- 4. Insert new shift record with exception catch for concurrent race condition
    BEGIN
        INSERT INTO public.staff_shifts (
            profile_id,
            staff_name,
            terminal_id,
            clock_in,
            status,
            notes,
            created_at,
            updated_at
        ) VALUES (
            v_profile_id,
            v_staff_name,
            COALESCE(p_terminal_id, 'Terminal #01'),
            timezone('utc'::text, now()),
            'on_shift',
            p_notes,
            timezone('utc'::text, now()),
            timezone('utc'::text, now())
        )
        RETURNING * INTO v_shift;
    EXCEPTION
        WHEN unique_violation THEN
            RAISE EXCEPTION 'ACTIVE_SHIFT_EXISTS'
                USING ERRCODE = 'P0409',
                      DETAIL = 'Active shift already in progress for this profile.';
    END;

    -- 5. Record immutable attendance audit event
    INSERT INTO public.staff_shift_audit_logs (
        shift_id,
        profile_id,
        terminal_id,
        action,
        notes,
        created_at
    ) VALUES (
        v_shift.id,
        v_profile_id,
        v_shift.terminal_id,
        'clock_in',
        p_notes,
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_audit_id;

    -- 6. Return structured JSON payload
    RETURN jsonb_build_object(
        'success', true,
        'shift', to_jsonb(v_shift),
        'audit_log_id', v_audit_id
    );
END;
$$;


-- ====================================================================
-- 6. Stored Procedure: public.clock_out_shift
-- ====================================================================
CREATE OR REPLACE FUNCTION public.clock_out_shift(
    p_shift_id UUID,
    p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID;
    v_shift public.staff_shifts%ROWTYPE;
    v_now TIMESTAMPTZ;
    v_duration_seconds INTEGER;
    v_hours INTEGER;
    v_minutes INTEGER;
    v_duration_formatted TEXT;
    v_audit_id UUID;
BEGIN
    -- 1. Extract caller identity
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED'
            USING ERRCODE = '28000',
                  DETAIL = 'Must be an authenticated user to clock out.';
    END IF;

    -- 2. Acquire pessimistic row lock on target shift
    SELECT * INTO v_shift
    FROM public.staff_shifts
    WHERE id = p_shift_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SHIFT_NOT_FOUND'
            USING ERRCODE = 'P0404',
                  DETAIL = format('Shift record with ID %s not found.', p_shift_id);
    END IF;

    -- 3. Verify ownership or administrative override
    IF v_shift.profile_id != v_caller_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'UNAUTHORIZED'
            USING ERRCODE = '42501',
                  DETAIL = 'Cannot clock out a shift owned by another staff member without admin privileges.';
    END IF;

    -- 4. Validate shift is currently active
    IF v_shift.status = 'completed' THEN
        RAISE EXCEPTION 'SHIFT_NOT_ACTIVE'
            USING ERRCODE = 'P0400',
                  DETAIL = 'Shift has already been clocked out and finalized.';
    END IF;

    -- 5. Calculate authoritative server-side duration
    v_now := timezone('utc'::text, now());
    v_duration_seconds := GREATEST(0, EXTRACT(EPOCH FROM (v_now - v_shift.clock_in))::INTEGER);
    v_hours := v_duration_seconds / 3600;
    v_minutes := (v_duration_seconds % 3600) / 60;
    v_duration_formatted := format('%sh %sm', lpad(v_hours::text, 2, '0'), lpad(v_minutes::text, 2, '0'));

    -- 6. Update shift record to completed
    UPDATE public.staff_shifts
    SET clock_out = v_now,
        duration_seconds = v_duration_seconds,
        status = 'completed',
        notes = COALESCE(p_notes, notes),
        updated_at = v_now
    WHERE id = p_shift_id
    RETURNING * INTO v_shift;

    -- 7. Record immutable clock_out audit event
    INSERT INTO public.staff_shift_audit_logs (
        shift_id,
        profile_id,
        terminal_id,
        action,
        notes,
        created_at
    ) VALUES (
        v_shift.id,
        v_shift.profile_id,
        v_shift.terminal_id,
        'clock_out',
        p_notes,
        v_now
    )
    RETURNING id INTO v_audit_id;

    -- 8. Return structured payload
    RETURN jsonb_build_object(
        'success', true,
        'shift', to_jsonb(v_shift),
        'duration_formatted', v_duration_formatted,
        'audit_log_id', v_audit_id
    );
END;
$$;


-- ====================================================================
-- 7. Stored Procedure: public.toggle_shift_break
-- ====================================================================
CREATE OR REPLACE FUNCTION public.toggle_shift_break(
    p_shift_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_caller_id UUID;
    v_shift public.staff_shifts%ROWTYPE;
    v_previous_status TEXT;
    v_new_status TEXT;
    v_action TEXT;
    v_now TIMESTAMPTZ;
    v_audit_id UUID;
BEGIN
    -- 1. Extract caller identity
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED'
            USING ERRCODE = '28000',
                  DETAIL = 'Must be an authenticated user to toggle shift break.';
    END IF;

    -- 2. Acquire pessimistic row lock
    SELECT * INTO v_shift
    FROM public.staff_shifts
    WHERE id = p_shift_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'SHIFT_NOT_FOUND'
            USING ERRCODE = 'P0404',
                  DETAIL = format('Shift record with ID %s not found.', p_shift_id);
    END IF;

    -- 3. Verify ownership or administrative override
    IF v_shift.profile_id != v_caller_id AND NOT public.is_admin() THEN
        RAISE EXCEPTION 'UNAUTHORIZED'
            USING ERRCODE = '42501',
                  DETAIL = 'Cannot toggle break for another staff member without admin privileges.';
    END IF;

    -- 4. Guard against completed shift
    IF v_shift.status = 'completed' THEN
        RAISE EXCEPTION 'SHIFT_ALREADY_COMPLETED'
            USING ERRCODE = 'P0400',
                  DETAIL = 'Cannot toggle break on a completed shift.';
    END IF;

    -- 5. Determine transition
    v_previous_status := v_shift.status;
    IF v_shift.status = 'on_shift' THEN
        v_new_status := 'break';
        v_action := 'break_start';
    ELSE
        v_new_status := 'on_shift';
        v_action := 'break_end';
    END IF;

    v_now := timezone('utc'::text, now());

    -- 6. Update shift status
    UPDATE public.staff_shifts
    SET status = v_new_status,
        updated_at = v_now
    WHERE id = p_shift_id
    RETURNING * INTO v_shift;

    -- 7. Record immutable break transition audit event
    INSERT INTO public.staff_shift_audit_logs (
        shift_id,
        profile_id,
        terminal_id,
        action,
        created_at
    ) VALUES (
        v_shift.id,
        v_shift.profile_id,
        v_shift.terminal_id,
        v_action,
        v_now
    )
    RETURNING id INTO v_audit_id;

    -- 8. Return structured payload
    RETURN jsonb_build_object(
        'success', true,
        'shift', to_jsonb(v_shift),
        'previous_status', v_previous_status,
        'current_status', v_new_status,
        'action', v_action,
        'audit_log_id', v_audit_id
    );
END;
$$;


-- ====================================================================
-- 8. Explicit Execution Grants
-- ====================================================================
REVOKE ALL ON FUNCTION public.clock_in_shift(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clock_in_shift(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_in_shift(TEXT, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.clock_out_shift(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.clock_out_shift(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out_shift(UUID, TEXT) TO service_role;

REVOKE ALL ON FUNCTION public.toggle_shift_break(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_shift_break(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_shift_break(UUID) TO service_role;
