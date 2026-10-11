-- ====================================================================
-- Migration: 20261010000000_inventory_products.sql
-- Description: Master parts catalog table, constraints, B-tree indexes,
--              updated_at trigger, and Row-Level Security (RLS) policies.
-- Jira Issue: SIAA-45 (STORY-2.6)
-- ====================================================================

-- 1. Master Products Table Definition
CREATE TABLE IF NOT EXISTS public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    brand TEXT NOT NULL,
    model TEXT NOT NULL DEFAULT 'Universal',
    cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0),
    wholesale NUMERIC(10, 2) NOT NULL CHECK (wholesale >= 0),
    retail NUMERIC(10, 2) NOT NULL CHECK (retail >= 0),
    stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
    min_threshold INTEGER NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
    location TEXT NULL,
    oem BOOLEAN NOT NULL DEFAULT false,
    image_url TEXT NULL,
    description TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.products IS 'Master catalog of motorcycle parts, pricing tiers, stock counts, and shelf locators';

-- 2. Performance B-Tree Indexes (<50ms lookups)
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products(model);
CREATE INDEX IF NOT EXISTS idx_products_location ON public.products(location);

-- 3. Automatic updated_at Trigger
CREATE OR REPLACE FUNCTION public.update_products_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW
    EXECUTE FUNCTION public.update_products_updated_at();

-- 4. Row Level Security (RLS) Configuration
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- PostgREST / Data API Grants
GRANT SELECT ON TABLE public.products TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.products TO authenticated;
GRANT ALL ON TABLE public.products TO service_role;

-- Policy 1: Public & staff terminal read access (allows browsing catalog and shelf locations)
DROP POLICY IF EXISTS "Allow public read access on products" ON public.products;
CREATE POLICY "Allow public read access on products"
    ON public.products
    FOR SELECT
    USING (true);

-- Policy 2: Admin-only modification & deletion (guards base costs and prevents SKU tampering)
DROP POLICY IF EXISTS "Allow admin full access on products" ON public.products;
CREATE POLICY "Allow admin full access on products"
    ON public.products
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
