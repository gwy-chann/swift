-- ====================================================================
-- Contract: Supabase Realtime Publication Registration
-- Jira Ticket: SIAA-48 (STORY-2.9)
-- ====================================================================

-- 1. Register public.products with supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'products'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
    END IF;
END
$$;

-- 2. Configure Full Replica Identity to guarantee complete row context on UPDATE
ALTER TABLE public.products REPLICA IDENTITY FULL;
