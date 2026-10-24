-- ====================================================================
-- Migration: 20261025000000_product_rack_shelf_locator.sql
-- Description: Add physical rack_id, shelf_id, and bin_locator attributes
--              to public.products table with composite index.
-- Jira Issue: SIAA-91 (STORY-8.4)
-- ====================================================================

ALTER TABLE public.products
    ADD COLUMN IF NOT EXISTS rack_id TEXT,
    ADD COLUMN IF NOT EXISTS shelf_id TEXT,
    ADD COLUMN IF NOT EXISTS bin_locator TEXT;

COMMENT ON COLUMN public.products.rack_id IS 'Physical storage rack identifier (e.g. A-01, TIRE-02)';
COMMENT ON COLUMN public.products.shelf_id IS 'Physical shelf level identifier within the rack (e.g. 03, FLOOR)';
COMMENT ON COLUMN public.products.bin_locator IS 'Fine-grained bin or slot locator within shelf (e.g. BIN-B4)';

CREATE INDEX IF NOT EXISTS idx_products_rack_shelf ON public.products(rack_id, shelf_id);
