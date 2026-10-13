-- ====================================================================
-- Migration: 20261016000000_moto_matcher_matrix_rpc.sql
-- Description: Supabase atomic MotoMatcher matrix search stored procedure
--              returning partitioned OEM standard parts and aftermarket upgrade
--              alternatives with live inventory, universal inclusion, and
--              upsell price delta calculation (< 50ms execution).
-- Jira Issue: SIAA-54 (STORY-4.7)
-- Parent Epic: SIAA-4 (EPIC-4: Smart MotoMatcher)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.get_moto_matcher_matrix(
    p_model_id UUID,
    p_category TEXT DEFAULT NULL,
    p_search TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_clean_search TEXT := NULL;
    v_clean_category TEXT := NULL;
    v_result JSONB;
BEGIN
    -- 1. Guard against null or invalid model ID
    IF p_model_id IS NULL THEN
        RETURN jsonb_build_object(
            'oem_parts', '[]'::jsonb,
            'aftermarket_parts', '[]'::jsonb
        );
    END IF;

    -- Clean search string and category
    IF p_search IS NOT NULL AND btrim(p_search) <> '' THEN
        v_clean_search := btrim(p_search);
    END IF;

    IF p_category IS NOT NULL AND btrim(p_category) <> '' THEN
        v_clean_category := btrim(p_category);
    END IF;

    -- 2. Build and Aggregate Matrix
    WITH candidate_parts AS (
        -- Model-specific parts mapped in public.product_fitments
        SELECT
            p.id,
            p.sku,
            p.name,
            p.brand,
            p.category,
            p.retail AS retail_price,
            p.stock AS stock_level,
            p.min_threshold,
            p.location AS shelf_location,
            pf.fitment_type,
            pf.notes AS fitment_notes,
            pf.year_range,
            false AS is_universal
        FROM public.product_fitments pf
        JOIN public.products p ON p.id = pf.product_id
        WHERE pf.model_id = p_model_id
          AND (v_clean_category IS NULL OR LOWER(p.category) = LOWER(v_clean_category))
          AND (
              v_clean_search IS NULL
              OR p.sku ILIKE '%' || v_clean_search || '%'
              OR p.name ILIKE '%' || v_clean_search || '%'
              OR p.brand ILIKE '%' || v_clean_search || '%'
              OR COALESCE(pf.notes, '') ILIKE '%' || v_clean_search || '%'
          )

        UNION ALL

        -- Universal catalog items (flagged model = 'Universal' or linked to Universal model)
        SELECT
            p.id,
            p.sku,
            p.name,
            p.brand,
            p.category,
            p.retail AS retail_price,
            p.stock AS stock_level,
            p.min_threshold,
            p.location AS shelf_location,
            'universal' AS fitment_type,
            COALESCE(pf.notes, p.description) AS fitment_notes,
            pf.year_range,
            true AS is_universal
        FROM public.products p
        LEFT JOIN public.product_fitments pf ON pf.product_id = p.id
        LEFT JOIN public.motorcycle_models mm ON mm.id = pf.model_id
        WHERE (p.model = 'Universal' OR mm.make = 'Universal' OR pf.fitment_type = 'universal')
          AND (v_clean_category IS NULL OR LOWER(p.category) = LOWER(v_clean_category))
          AND (
              v_clean_search IS NULL
              OR p.sku ILIKE '%' || v_clean_search || '%'
              OR p.name ILIKE '%' || v_clean_search || '%'
              OR p.brand ILIKE '%' || v_clean_search || '%'
              OR COALESCE(pf.notes, '') ILIKE '%' || v_clean_search || '%'
          )
          -- Prevent duplicate inclusion if universal part was already explicitly mapped
          AND NOT EXISTS (
              SELECT 1
              FROM public.product_fitments sub_pf
              WHERE sub_pf.product_id = p.id
                AND sub_pf.model_id = p_model_id
          )
    ),
    deduped_candidates AS (
        SELECT DISTINCT ON (cp.id)
            cp.id,
            cp.sku,
            cp.name,
            cp.brand,
            cp.category,
            cp.retail_price,
            cp.stock_level,
            cp.min_threshold,
            cp.shelf_location,
            cp.fitment_type,
            cp.fitment_notes,
            cp.year_range,
            cp.is_universal
        FROM candidate_parts cp
        ORDER BY cp.id, cp.is_universal ASC
    ),
    oem_benchmarks AS (
        SELECT DISTINCT ON (category)
            sku AS oem_sku,
            category,
            retail_price AS oem_retail
        FROM deduped_candidates
        WHERE fitment_type = 'oem' AND retail_price > 0
        ORDER BY category, retail_price ASC
    ),
    oem_dataset AS (
        SELECT
            jsonb_build_object(
                'id', d.id,
                'sku', d.sku,
                'name', d.name,
                'brand', d.brand,
                'category', d.category,
                'retail_price', d.retail_price,
                'stock_level', d.stock_level,
                'min_threshold', d.min_threshold,
                'shelf_location', d.shelf_location,
                'fitment_type', 'oem',
                'fitment_notes', d.fitment_notes,
                'year_range', d.year_range,
                'is_universal', false,
                'upsell_delta_amount', null,
                'upsell_delta_percent', null,
                'upsell_badge', null,
                'oem_reference_sku', null
            ) AS part_json
        FROM deduped_candidates d
        WHERE d.fitment_type = 'oem'
        ORDER BY d.category ASC, d.name ASC
    ),
    aftermarket_dataset AS (
        SELECT
            jsonb_build_object(
                'id', d.id,
                'sku', d.sku,
                'name', d.name,
                'brand', d.brand,
                'category', d.category,
                'retail_price', d.retail_price,
                'stock_level', d.stock_level,
                'min_threshold', d.min_threshold,
                'shelf_location', d.shelf_location,
                'fitment_type', d.fitment_type,
                'fitment_notes', d.fitment_notes,
                'year_range', d.year_range,
                'is_universal', d.is_universal,
                'upsell_delta_amount',
                    CASE
                        WHEN ob.oem_retail IS NOT NULL THEN ROUND(d.retail_price - ob.oem_retail, 2)
                        ELSE NULL
                    END,
                'upsell_delta_percent',
                    CASE
                        WHEN ob.oem_retail IS NOT NULL AND ob.oem_retail > 0
                        THEN ROUND(((d.retail_price - ob.oem_retail) / ob.oem_retail) * 100.0, 1)
                        ELSE NULL
                    END,
                'upsell_badge',
                    CASE
                        WHEN ob.oem_retail IS NOT NULL AND ob.oem_retail > 0 THEN
                            CASE
                                WHEN (d.retail_price - ob.oem_retail) >= 0 THEN
                                    '+₱' || TO_CHAR(d.retail_price - ob.oem_retail, 'FM999,999,990.00') ||
                                    ' (+' || TO_CHAR(ROUND(((d.retail_price - ob.oem_retail) / ob.oem_retail) * 100.0, 1), 'FM990.0') || '%)'
                                ELSE
                                    '-₱' || TO_CHAR(ABS(d.retail_price - ob.oem_retail), 'FM999,999,990.00') ||
                                    ' (-' || TO_CHAR(ABS(ROUND(((d.retail_price - ob.oem_retail) / ob.oem_retail) * 100.0, 1)), 'FM990.0') || '%)'
                            END
                        ELSE NULL
                    END,
                'oem_reference_sku', ob.oem_sku
            ) AS part_json
        FROM deduped_candidates d
        LEFT JOIN oem_benchmarks ob ON ob.category = d.category
        WHERE d.fitment_type IN ('aftermarket', 'universal')
        ORDER BY d.is_universal ASC, d.category ASC, d.name ASC
    )
    SELECT jsonb_build_object(
        'oem_parts', COALESCE((SELECT jsonb_agg(part_json) FROM oem_dataset), '[]'::jsonb),
        'aftermarket_parts', COALESCE((SELECT jsonb_agg(part_json) FROM aftermarket_dataset), '[]'::jsonb)
    ) INTO v_result;

    RETURN v_result;
END;
$$;

-- Security and PostgREST API Grants
GRANT EXECUTE ON FUNCTION public.get_moto_matcher_matrix(UUID, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.get_moto_matcher_matrix(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_moto_matcher_matrix(UUID, TEXT, TEXT) TO service_role;

COMMENT ON FUNCTION public.get_moto_matcher_matrix(UUID, TEXT, TEXT) IS
'High-performance stored procedure returning partitioned OEM and aftermarket/universal motorcycle parts with upsell price deltas for a given motorcycle model ID';
