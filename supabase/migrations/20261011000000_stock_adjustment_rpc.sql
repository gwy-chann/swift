-- ====================================================================
-- Migration: 20261011000000_stock_adjustment_rpc.sql
-- Description: Immutable audit ledger table, anti-tamper trigger, RLS,
--              and atomic adjust_product_stock stored procedure.
-- Jira Issue: SIAA-46 (STORY-2.7)
-- ====================================================================

-- 1. Immutable Stock Adjustment Logs Ledger Table
CREATE TABLE IF NOT EXISTS public.stock_adjustment_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku TEXT NOT NULL REFERENCES public.products(sku) ON UPDATE CASCADE ON DELETE RESTRICT,
    adjustment_type TEXT NOT NULL,
    quantity_delta INTEGER NOT NULL CHECK (quantity_delta != 0),
    previous_stock INTEGER NOT NULL CHECK (previous_stock >= 0),
    new_stock INTEGER NOT NULL CHECK (new_stock >= 0),
    reason TEXT NOT NULL DEFAULT '',
    user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    user_name TEXT NOT NULL DEFAULT 'Staff Member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.stock_adjustment_logs IS 'Immutable append-only ledger of physical stock adjustments with user attribution';

-- 2. Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_stock_adjustment_logs_sku 
    ON public.stock_adjustment_logs(sku);

CREATE INDEX IF NOT EXISTS idx_stock_adjustment_logs_created_at 
    ON public.stock_adjustment_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_stock_adjustment_logs_user_id 
    ON public.stock_adjustment_logs(user_id);

-- 3. Immutability Enforcement Trigger (Guards against direct UPDATE/DELETE even by privileged connections)
CREATE OR REPLACE FUNCTION public.prevent_stock_adjustment_log_tampering()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'TAMPER_FORBIDDEN: stock_adjustment_logs is an immutable append-only ledger. Updates and deletions are strictly prohibited.'
        USING ERRCODE = '55000'; -- Object not modifiable
    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trigger_guard_stock_adjustment_logs ON public.stock_adjustment_logs;
CREATE TRIGGER trigger_guard_stock_adjustment_logs
    BEFORE UPDATE OR DELETE ON public.stock_adjustment_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_stock_adjustment_log_tampering();

-- 4. Row Level Security (RLS) Configuration
ALTER TABLE public.stock_adjustment_logs ENABLE ROW LEVEL SECURITY;

-- API Grants: Read and Insert only; Explicitly Revoke Updates and Deletes
GRANT SELECT, INSERT ON TABLE public.stock_adjustment_logs TO authenticated;
GRANT SELECT ON TABLE public.stock_adjustment_logs TO anon;
REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.stock_adjustment_logs FROM authenticated, anon, public;

-- RLS Policy: Authenticated staff read access
DROP POLICY IF EXISTS "Allow authenticated read on stock_adjustment_logs" ON public.stock_adjustment_logs;
CREATE POLICY "Allow authenticated read on stock_adjustment_logs"
    ON public.stock_adjustment_logs
    FOR SELECT
    TO authenticated
    USING (true);

-- RLS Policy: Authenticated staff insert access
DROP POLICY IF EXISTS "Allow authenticated insert on stock_adjustment_logs" ON public.stock_adjustment_logs;
CREATE POLICY "Allow authenticated insert on stock_adjustment_logs"
    ON public.stock_adjustment_logs
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- 5. Atomic Stock Adjustment Stored Procedure (RPC)
CREATE OR REPLACE FUNCTION public.adjust_product_stock(
    p_sku TEXT,
    p_type TEXT,
    p_delta INTEGER,
    p_reason TEXT DEFAULT '',
    p_user_name TEXT DEFAULT 'Staff Member'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_user_id UUID;
    v_resolved_user_name TEXT;
    v_current_stock INTEGER;
    v_new_stock INTEGER;
    v_log_id UUID;
BEGIN
    -- 1. Validate quantity delta
    IF p_delta IS NULL OR p_delta = 0 THEN
        RAISE EXCEPTION 'ZERO_DELTA_NOT_ALLOWED'
            USING ERRCODE = 'P0002',
                  DETAIL = 'Adjustment quantity delta must be a non-zero integer.';
    END IF;

    -- 2. Extract authenticated user ID from Supabase Auth context (non-repudiation)
    v_user_id := auth.uid();
    
    -- 3. Resolve user display name
    IF v_user_id IS NOT NULL THEN
        SELECT COALESCE(full_name, email, 'Staff Member')
        INTO v_resolved_user_name
        FROM public.profiles
        WHERE id = v_user_id;

        IF v_resolved_user_name IS NULL THEN
            SELECT COALESCE(raw_user_meta_data->>'full_name', email, 'Staff Member')
            INTO v_resolved_user_name
            FROM auth.users
            WHERE id = v_user_id;
        END IF;
    ELSE
        -- Fallback for development/testing without active Supabase JWT
        v_resolved_user_name := COALESCE(p_user_name, 'Staff Member');
    END IF;

    -- 4. Pessimistic row lock on target product
    SELECT stock INTO v_current_stock
    FROM public.products
    WHERE sku = p_sku
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'PRODUCT_NOT_FOUND'
            USING ERRCODE = 'P0003',
                  DETAIL = format('Product with SKU %s does not exist in catalog.', p_sku);
    END IF;

    -- 5. Calculate resulting stock & enforce non-negative floor
    v_new_stock := v_current_stock + p_delta;
    IF v_new_stock < 0 THEN
        RAISE EXCEPTION 'INSUFFICIENT_STOCK'
            USING ERRCODE = 'P0001',
                  DETAIL = format('Insufficient stock for SKU %s. Current: %s, Requested Delta: %s.', p_sku, v_current_stock, p_delta);
    END IF;

    -- 6. Execute atomic stock update
    UPDATE public.products
    SET stock = v_new_stock,
        updated_at = timezone('utc'::text, now())
    WHERE sku = p_sku;

    -- 7. Execute atomic immutable audit log insertion
    INSERT INTO public.stock_adjustment_logs (
        sku,
        adjustment_type,
        quantity_delta,
        previous_stock,
        new_stock,
        reason,
        user_id,
        user_name,
        created_at
    ) VALUES (
        p_sku,
        COALESCE(p_type, 'Stock Adjustment'),
        p_delta,
        v_current_stock,
        v_new_stock,
        COALESCE(p_reason, ''),
        v_user_id,
        COALESCE(v_resolved_user_name, 'Staff Member'),
        timezone('utc'::text, now())
    )
    RETURNING id INTO v_log_id;

    -- 8. Return structured JSON payload
    RETURN jsonb_build_object(
        'success', true,
        'sku', p_sku,
        'previous_stock', v_current_stock,
        'new_stock', v_new_stock,
        'quantity_delta', p_delta,
        'adjustment_type', p_type,
        'log_id', v_log_id,
        'user_name', v_resolved_user_name
    );
END;
$$;

-- Grant execution to authenticated users, service role, and anon
REVOKE ALL ON FUNCTION public.adjust_product_stock(TEXT, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, TEXT, INTEGER, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, TEXT, INTEGER, TEXT, TEXT) TO service_role;
GRANT EXECUTE ON FUNCTION public.adjust_product_stock(TEXT, TEXT, INTEGER, TEXT, TEXT) TO anon;
