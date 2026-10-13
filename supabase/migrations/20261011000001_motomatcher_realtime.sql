-- ====================================================================
-- Migration: 20261011000001_motomatcher_realtime.sql
-- Description: Register public.product_fitments and public.products in
--              supabase_realtime publication and enable REPLICA IDENTITY FULL
--              for live multi-terminal stock & fitment broadcasts.
-- Jira Issue: SIAA-55 (STORY-4.8)
-- Parent Epic: SIAA-4 (EPIC-4: Smart MotoMatcher)
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

-- Configure Full Replica Identity on products to guarantee complete row context on UPDATE
ALTER TABLE public.products REPLICA IDENTITY FULL;

-- 2. Register public.product_fitments with supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'product_fitments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.product_fitments;
    END IF;
END
$$;

-- Configure Full Replica Identity on product_fitments to guarantee complete row context on UPDATE/DELETE
ALTER TABLE public.product_fitments REPLICA IDENTITY FULL;
