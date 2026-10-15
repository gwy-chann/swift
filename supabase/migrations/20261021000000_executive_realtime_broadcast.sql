-- ====================================================================
-- Migration: 20261021000000_executive_realtime_broadcast.sql
-- Description: Register public.work_orders, public.service_bays, and
--              public.transactions with supabase_realtime publication
--              and configure REPLICA IDENTITY FULL for sub-500ms
--              operational intelligence streaming.
-- Jira Issue: SIAA-68 (STORY-6.8)
-- Parent Epic: SIAA-6 (EPIC-6: Executive Analytics, Revenue & Profit Margins)
-- ====================================================================

-- 1. Register tables with supabase_realtime publication idempotently
DO $$
BEGIN
    -- 1.1 Service Bays
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'service_bays'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bays;
    END IF;

    -- 1.2 Work Orders
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'work_orders'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
    END IF;

    -- 1.3 Transactions
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
    END IF;
END
$$;

-- 2. Configure Full Replica Identity to guarantee complete row context on UPDATE
ALTER TABLE public.service_bays REPLICA IDENTITY FULL;
ALTER TABLE public.work_orders REPLICA IDENTITY FULL;
ALTER TABLE public.transactions REPLICA IDENTITY FULL;
