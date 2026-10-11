-- ====================================================================
-- Migration: 20261015000000_staff_shifts.sql
-- Description: Staff shift time-in/time-out punch-clock schema with
--              status check constraint, composite B-tree indexes,
--              and Row-Level Security (self-scoped + admin audit).
-- Jira Issue: SIAA-60 (STORY-5.6)
--
-- NOTE: The ticket nominally proposed the timestamp 20261011000000, but
-- that exact prefix already belongs to pos_labor_services.sql and
-- stock_adjustment_rpc.sql. A distinct, strictly-later timestamp is
-- used here to preserve deterministic migration ordering after the
-- auth_profiles prerequisite (20261008000000).
-- ====================================================================

-- 1. Staff Shifts Table
CREATE TABLE IF NOT EXISTS public.staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    staff_name TEXT NOT NULL,
    terminal_id TEXT NOT NULL DEFAULT 'Terminal #01',
    clock_in TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    clock_out TIMESTAMPTZ NULL,
    duration_seconds INTEGER DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'on_shift' CHECK (status IN ('on_shift', 'break', 'completed')),
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.staff_shifts IS 'Staff punch-clock attendance record: one row per employee shift with time-in/time-out, terminal, and status';
COMMENT ON COLUMN public.staff_shifts.profile_id IS 'Owning employee profile; cascades on profile deletion';
COMMENT ON COLUMN public.staff_shifts.status IS 'on_shift | break | completed; transitions enforced by punch RPC layer (STORY-5.7)';

-- 2. Composite B-Tree Indexes for Hot Query Paths
CREATE INDEX IF NOT EXISTS idx_staff_shifts_profile_clock_in ON public.staff_shifts(profile_id, clock_in DESC);
CREATE INDEX IF NOT EXISTS idx_staff_shifts_status_terminal ON public.staff_shifts(status, terminal_id);

-- 3. Row Level Security (RLS) Configuration
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;

-- Explicit Grants for PostgREST / Supabase Data API
GRANT SELECT, INSERT ON TABLE public.staff_shifts TO authenticated;
GRANT UPDATE ON TABLE public.staff_shifts TO authenticated;
GRANT ALL ON TABLE public.staff_shifts TO service_role;

-- Policy: Staff can read only their own shift records
DROP POLICY IF EXISTS "Users can read own shifts" ON public.staff_shifts;
CREATE POLICY "Users can read own shifts"
    ON public.staff_shifts
    FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = profile_id);

-- Policy: Staff can punch in their own shift records
DROP POLICY IF EXISTS "Users can insert own shifts" ON public.staff_shifts;
CREATE POLICY "Users can insert own shifts"
    ON public.staff_shifts
    FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = profile_id);

-- Policy: Admins can view all shift records
DROP POLICY IF EXISTS "Admins can view all shifts" ON public.staff_shifts;
CREATE POLICY "Admins can view all shifts"
    ON public.staff_shifts
    FOR SELECT
    TO authenticated
    USING (public.is_admin());

-- Policy: Admins can update all shift records
DROP POLICY IF EXISTS "Admins can update all shifts" ON public.staff_shifts;
CREATE POLICY "Admins can update all shifts"
    ON public.staff_shifts
    FOR UPDATE
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
