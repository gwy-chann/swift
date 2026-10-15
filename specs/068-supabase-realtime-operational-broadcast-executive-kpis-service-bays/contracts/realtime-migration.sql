-- ====================================================================
-- Contract: realtime-migration.sql
-- Description: Registers work_orders, service_bays, and transactions in
--              supabase_realtime publication with full replica identity.
-- Jira Ticket: SIAA-68 (STORY-6.8)
-- ====================================================================

-- 1. Idempotently register tables in supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'work_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'service_bays'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bays;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;
END
$$;

-- 2. Configure Full Replica Identity for complete update payloads
ALTER TABLE public.work_orders REPLICA IDENTITY FULL;
ALTER TABLE public.service_bays REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
