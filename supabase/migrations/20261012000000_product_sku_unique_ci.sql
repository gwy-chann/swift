-- ====================================================================
-- Migration: 20261012000000_product_sku_unique_ci.sql
-- Description: Functional case-insensitive unique index on LOWER(sku)
--              for public.products table to enforce unique item codes,
--              and grants service_role permissions on audit ledger.
-- Jira Issue: SIAA-47 (STORY-2.8)
-- ====================================================================

-- 1. Create Functional Case-Insensitive Unique Index on LOWER(sku)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_lower
ON public.products (LOWER(sku));

COMMENT ON INDEX public.idx_products_sku_lower IS 'Enforces case-insensitive SKU uniqueness across all catalog parts';

-- 2. Grant permissions on stock_adjustment_logs to service_role and authenticated
GRANT ALL ON TABLE public.stock_adjustment_logs TO service_role;
GRANT SELECT, INSERT ON TABLE public.stock_adjustment_logs TO authenticated;
GRANT SELECT, INSERT ON TABLE public.stock_adjustment_logs TO anon;
