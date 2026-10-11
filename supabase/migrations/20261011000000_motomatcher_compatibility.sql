-- ====================================================================
-- Migration: 20261011000000_motomatcher_compatibility.sql
-- Description: Motorcycle models catalog, multi-part fitment mappings,
--              B-tree indexes, RLS security policies, and updated_at trigger.
-- Jira Issue: SIAA-53 (STORY-4.6)
-- Parent Epic: SIAA-4 (EPIC-4: Smart MotoMatcher)
-- ====================================================================

-- 1. Motorcycle Models Table Definition
CREATE TABLE IF NOT EXISTS public.motorcycle_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    make TEXT NOT NULL,
    model TEXT NOT NULL,
    displacement_cc INTEGER NOT NULL CHECK (displacement_cc > 0),
    year_start INTEGER NOT NULL CHECK (year_start > 1900),
    year_end INTEGER NULL CHECK (year_end IS NULL OR year_end >= year_start),
    category TEXT NOT NULL,
    image_url TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_motorcycle_models_make_model_year UNIQUE (make, model, year_start)
);

COMMENT ON TABLE public.motorcycle_models IS 'Catalog of motorcycle makes, models, displacement, production years, and category types';

-- 2. Product Fitment Compatibility Join Table Definition
CREATE TABLE IF NOT EXISTS public.product_fitments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    model_id UUID NOT NULL REFERENCES public.motorcycle_models(id) ON DELETE CASCADE,
    fitment_type TEXT NOT NULL CHECK (fitment_type IN ('oem', 'aftermarket', 'universal')),
    year_range TEXT NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT uq_product_fitments_product_model UNIQUE (product_id, model_id)
);

COMMENT ON TABLE public.product_fitments IS 'Relational fitment matrix linking catalog products to motorcycle models with OEM/aftermarket grade';

-- 3. High-Performance B-Tree Indexes (<50ms lookups)
CREATE INDEX IF NOT EXISTS idx_motorcycle_models_make_model ON public.motorcycle_models(make, model);
CREATE INDEX IF NOT EXISTS idx_product_fitments_model_type ON public.product_fitments(model_id, fitment_type);
CREATE INDEX IF NOT EXISTS idx_product_fitments_product ON public.product_fitments(product_id);

-- 4. Automatic updated_at Trigger for Motorcycle Models
CREATE OR REPLACE FUNCTION public.update_motorcycle_models_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_motorcycle_models_updated_at ON public.motorcycle_models;
CREATE TRIGGER trigger_motorcycle_models_updated_at
    BEFORE UPDATE ON public.motorcycle_models
    FOR EACH ROW
    EXECUTE FUNCTION public.update_motorcycle_models_updated_at();

-- 5. Row-Level Security (RLS) Configuration
ALTER TABLE public.motorcycle_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_fitments ENABLE ROW LEVEL SECURITY;

-- PostgREST / Data API Grants
GRANT SELECT ON TABLE public.motorcycle_models TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.motorcycle_models TO authenticated;
GRANT ALL ON TABLE public.motorcycle_models TO service_role;

GRANT SELECT ON TABLE public.product_fitments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.product_fitments TO authenticated;
GRANT ALL ON TABLE public.product_fitments TO service_role;

-- Policy 1: Public & staff terminal read access for motorcycle models
DROP POLICY IF EXISTS "Public read access on motorcycle models" ON public.motorcycle_models;
CREATE POLICY "Public read access on motorcycle models"
    ON public.motorcycle_models
    FOR SELECT
    USING (true);

-- Policy 2: Public & staff terminal read access for product fitments
DROP POLICY IF EXISTS "Public read access on product fitments" ON public.product_fitments;
CREATE POLICY "Public read access on product fitments"
    ON public.product_fitments
    FOR SELECT
    USING (true);

-- Policy 3: Admin full control on motorcycle models
DROP POLICY IF EXISTS "Admin full control on motorcycle models" ON public.motorcycle_models;
CREATE POLICY "Admin full control on motorcycle models"
    ON public.motorcycle_models
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Policy 4: Admin full control on fitments
DROP POLICY IF EXISTS "Admin full control on fitments" ON public.product_fitments;
CREATE POLICY "Admin full control on fitments"
    ON public.product_fitments
    FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
