-- ====================================================================
-- Migration: 20261014010000_process_pos_checkout_rpc.sql
-- Description: Atomic POS checkout stored procedure executing stock
--              decrements, audit logging, and transaction insertions.
-- Jira Issue: SIAA-51 (STORY-3.8)
-- ====================================================================

CREATE OR REPLACE FUNCTION public.process_pos_checkout(
    p_transaction JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
    v_receipt_number TEXT;
    v_cashier_id UUID;
    v_cashier_name TEXT;
    v_resolved_name TEXT;
    v_pricing_mode TEXT;
    v_subtotal NUMERIC(10, 2);
    v_discount_type TEXT;
    v_discount_rate NUMERIC(5, 4);
    v_discount_amount NUMERIC(10, 2);
    v_total_due NUMERIC(10, 2);
    v_cash_tendered NUMERIC(10, 2);
    v_change_due NUMERIC(10, 2);
    v_payment_method TEXT;
    v_transaction_id UUID;
    r_item RECORD;
    v_current_stock INT;
    v_new_stock INT;
    v_items_count INT := 0;
    v_parts_decremented INT := 0;
BEGIN
    -- 1. Validate payload inputs
    IF p_transaction IS NULL OR jsonb_typeof(p_transaction) != 'object' THEN
        RAISE EXCEPTION 'INVALID_TRANSACTION_PAYLOAD'
            USING ERRCODE = 'P0002',
                  DETAIL = 'Transaction payload must be a non-null JSON object.';
    END IF;

    IF p_items IS NULL OR jsonb_typeof(p_items) != 'array' OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'EMPTY_ITEMS_PAYLOAD'
            USING ERRCODE = 'P0003',
                  DETAIL = 'Items payload must be a non-empty JSON array.';
    END IF;

    -- 2. Resolve receipt number
    v_receipt_number := NULLIF(trim(p_transaction->>'receipt_number'), '');
    IF v_receipt_number IS NULL THEN
        v_receipt_number := 'TX-' || to_char(now(), 'YYYYMMDD') || '-' || lpad(floor(random() * 10000)::text, 4, '0');
    END IF;

    -- 3. Resolve cashier attribution (Non-repudiation)
    v_cashier_id := auth.uid();
    IF v_cashier_id IS NULL AND p_transaction->>'cashier_id' IS NOT NULL THEN
        BEGIN
            v_cashier_id := (p_transaction->>'cashier_id')::uuid;
        EXCEPTION WHEN OTHERS THEN
            v_cashier_id := NULL;
        END;
    END IF;

    v_cashier_name := COALESCE(NULLIF(trim(p_transaction->>'cashier_name'), ''), 'Cashier');
    IF v_cashier_id IS NOT NULL THEN
        SELECT COALESCE(full_name, email, v_cashier_name)
        INTO v_resolved_name
        FROM public.profiles
        WHERE id = v_cashier_id;

        IF v_resolved_name IS NOT NULL THEN
            v_cashier_name := v_resolved_name;
        END IF;
    END IF;

    -- 4. Parse financial totals
    v_pricing_mode := COALESCE(p_transaction->>'pricing_mode', 'retail');
    v_subtotal := COALESCE((p_transaction->>'subtotal')::numeric, 0.00);
    v_discount_type := NULLIF(trim(p_transaction->>'discount_type'), '');
    v_discount_rate := COALESCE((p_transaction->>'discount_rate')::numeric, 0.0000);
    v_discount_amount := COALESCE((p_transaction->>'discount_amount')::numeric, 0.00);
    v_total_due := COALESCE((p_transaction->>'total_due')::numeric, 0.00);
    v_cash_tendered := COALESCE((p_transaction->>'cash_tendered')::numeric, v_total_due);
    v_change_due := COALESCE((p_transaction->>'change_due')::numeric, 0.00);
    v_payment_method := COALESCE(NULLIF(trim(p_transaction->>'payment_method'), ''), 'Cash');

    -- 5. Insert master transaction record
    INSERT INTO public.transactions (
        receipt_number,
        cashier_id,
        cashier_name,
        pricing_mode,
        subtotal,
        discount_type,
        discount_rate,
        discount_amount,
        total_due,
        cash_tendered,
        change_due,
        payment_method,
        created_at
    ) VALUES (
        v_receipt_number,
        v_cashier_id,
        v_cashier_name,
        v_pricing_mode,
        v_subtotal,
        v_discount_type,
        v_discount_rate,
        v_discount_amount,
        v_total_due,
        v_cash_tendered,
        v_change_due,
        v_payment_method,
        timezone('utc'::text, now())
    ) RETURNING id INTO v_transaction_id;

    -- 6. Process items with deterministic order (prevents deadlock)
    FOR r_item IN
        SELECT * FROM jsonb_to_recordset(p_items) AS x(
            item_type TEXT,
            item_sku_or_code TEXT,
            item_name TEXT,
            unit_price NUMERIC,
            quantity INT,
            subtotal NUMERIC,
            bay TEXT,
            shelf_location TEXT
        )
        ORDER BY item_sku_or_code ASC
    LOOP
        -- Insert line item record
        INSERT INTO public.transaction_items (
            transaction_id,
            item_type,
            item_sku_or_code,
            item_name,
            unit_price,
            quantity,
            subtotal,
            bay,
            shelf_location
        ) VALUES (
            v_transaction_id,
            r_item.item_type,
            r_item.item_sku_or_code,
            r_item.item_name,
            r_item.unit_price,
            r_item.quantity,
            r_item.subtotal,
            r_item.bay,
            r_item.shelf_location
        );

        -- If physical catalog part, enforce atomic stock deduction and ledger audit
        IF r_item.item_type = 'part' THEN
            SELECT stock INTO v_current_stock
            FROM public.products
            WHERE sku = r_item.item_sku_or_code
            FOR UPDATE;

            IF NOT FOUND THEN
                RAISE EXCEPTION 'PRODUCT_NOT_FOUND: %', r_item.item_sku_or_code
                    USING ERRCODE = 'P0003',
                          DETAIL = format('Product with SKU %s not found in catalog.', r_item.item_sku_or_code);
            END IF;

            v_new_stock := v_current_stock - r_item.quantity;
            IF v_new_stock < 0 THEN
                RAISE EXCEPTION 'INSUFFICIENT_STOCK: %', r_item.item_sku_or_code
                    USING ERRCODE = 'P0001',
                          DETAIL = format('Insufficient stock for SKU %s. Current: %s, Requested: %s.', r_item.item_sku_or_code, v_current_stock, r_item.quantity);
            END IF;

            -- Atomic stock update
            UPDATE public.products
            SET stock = v_new_stock,
                updated_at = timezone('utc'::text, now())
            WHERE sku = r_item.item_sku_or_code;

            -- Record immutable audit log
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
                r_item.item_sku_or_code,
                'POS Sale',
                -r_item.quantity,
                v_current_stock,
                v_new_stock,
                'POS Sale Receipt: ' || v_receipt_number,
                v_cashier_id,
                v_cashier_name,
                timezone('utc'::text, now())
            );

            v_parts_decremented := v_parts_decremented + 1;
        END IF;

        v_items_count := v_items_count + 1;
    END LOOP;

    -- 7. Return atomic summary response
    RETURN jsonb_build_object(
        'success', true,
        'transaction_id', v_transaction_id,
        'receipt_number', v_receipt_number,
        'items_count', v_items_count,
        'parts_decremented', v_parts_decremented,
        'created_at', timezone('utc'::text, now())
    );
END;
$$;

COMMENT ON FUNCTION public.process_pos_checkout(JSONB, JSONB) IS
'Atomic POS checkout executing transaction header insertion, itemized lines, product stock decrements, and immutable stock audit logs.';

-- Grants
GRANT EXECUTE ON FUNCTION public.process_pos_checkout(JSONB, JSONB) TO anon, authenticated, service_role;
