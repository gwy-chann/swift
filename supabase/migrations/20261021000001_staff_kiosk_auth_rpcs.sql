-- Migration: 20261021000000_staff_kiosk_auth_rpcs.sql
-- Description: Staff Kiosk PIN authentication support and profile attribution in shift punch RPCs

-- ====================================================================
-- 1. Add pin_code column to public.profiles
-- ====================================================================
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pin_code VARCHAR(10) DEFAULT '1234';

COMMENT ON COLUMN public.profiles.pin_code IS '4-digit PIN for shop floor terminal kiosk clock-in and switching';

-- Update standard seed accounts with designated demo PINs
UPDATE public.profiles
SET pin_code = '8888'
WHERE email = 'admin@swift.local';

UPDATE public.profiles
SET pin_code = '1234'
WHERE email = 'cashier@swift.local';

UPDATE public.profiles
SET pin_code = '2222'
WHERE email = 'mechanic1@swift.local';

UPDATE public.profiles
SET pin_code = '3333'
WHERE email = 'warehouse@swift.local';

-- ====================================================================
-- 2. Extended Stored Procedure: public.clock_in_shift
-- ====================================================================
CREATE OR REPLACE FUNCTION public.clock_in_shift(
    p_terminal_id TEXT DEFAULT 'Terminal #01',
    p_notes TEXT DEFAULT NULL,
    p_profile_id UUID DEFAULT NULL
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
    -- 1. Extract and validate user profile (session or terminal kiosk parameter)
    v_profile_id := COALESCE(auth.uid(), p_profile_id);
    IF v_profile_id IS NULL THEN
        RAISE EXCEPTION 'UNAUTHENTICATED'
            USING ERRCODE = '28000',
                  DETAIL = 'Must be an authenticated user or provide a valid staff profile ID to clock in.';
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
-- 3. Extended Stored Procedure: public.clock_out_shift
-- ====================================================================
CREATE OR REPLACE FUNCTION public.clock_out_shift(
    p_shift_id UUID,
    p_notes TEXT DEFAULT NULL,
    p_profile_id UUID DEFAULT NULL
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
    v_caller_id := COALESCE(auth.uid(), p_profile_id);

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
    IF v_caller_id IS NOT NULL AND v_shift.profile_id != v_caller_id AND NOT public.is_admin() THEN
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
-- 4. Extended Stored Procedure: public.toggle_shift_break
-- ====================================================================
CREATE OR REPLACE FUNCTION public.toggle_shift_break(
    p_shift_id UUID,
    p_profile_id UUID DEFAULT NULL
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
    v_caller_id := COALESCE(auth.uid(), p_profile_id);

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
    IF v_caller_id IS NOT NULL AND v_shift.profile_id != v_caller_id AND NOT public.is_admin() THEN
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
-- 5. Execution Permissions
-- ====================================================================
GRANT EXECUTE ON FUNCTION public.clock_in_shift(TEXT, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_in_shift(TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.clock_in_shift(TEXT, TEXT, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.clock_out_shift(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clock_out_shift(UUID, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.clock_out_shift(UUID, TEXT, UUID) TO service_role;

GRANT EXECUTE ON FUNCTION public.toggle_shift_break(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_shift_break(UUID, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.toggle_shift_break(UUID, UUID) TO service_role;
