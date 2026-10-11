-- ====================================================================
-- Migration: 20261012000000_product_sku_unique_ci.sql
-- Description: Functional case-insensitive unique index on LOWER(sku)
--              for public.products table to enforce unique item codes.
-- Jira Issue: SIAA-47 (STORY-2.8)
-- ====================================================================

-- 1. Create Functional Case-Insensitive Unique Index on LOWER(sku)
CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_lower
ON public.products (LOWER(sku));

COMMENT ON INDEX public.idx_products_sku_lower IS 'Enforces case-insensitive SKU uniqueness across all catalog parts';
