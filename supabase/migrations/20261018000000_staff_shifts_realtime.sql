-- ====================================================================
-- Migration: 20261018000000_staff_shifts_realtime.sql
-- Description: Register public.staff_shifts in supabase_realtime publication
--              and enable REPLICA IDENTITY FULL for sub-500ms multi-station sync.
-- Jira Issue: SIAA-63 (STORY-5.8)
-- Parent Epic: SIAA-5 (EPIC-5: Staff Shop Floor Terminal & Time Clock)
-- ====================================================================

-- 1. Register public.staff_shifts with supabase_realtime publication idempotently
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'staff_shifts'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_shifts;
    END IF;
END
$$;

-- 2. Configure Full Replica Identity to guarantee complete row context on UPDATE
ALTER TABLE public.staff_shifts REPLICA IDENTITY FULL;
