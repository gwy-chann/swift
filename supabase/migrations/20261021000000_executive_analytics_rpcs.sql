-- ====================================================================
-- Migration: 20261021000000_executive_analytics_rpcs.sql
-- Description: High-performance PostgreSQL stored procedures for Executive
--              Dashboard KPIs, 7-Day Revenue Trend, and Categorized P&L COGS.
-- Jira Issue: SIAA-67 (STORY-6.7)
-- Parent Epic: SIAA-6 (EPIC-6: Executive Analytics, Revenue & Profit Margins)
-- ====================================================================

-- 1. Operational Executive KPI Aggregator
-- Returns a consolidated single-row JSON object aggregating today's revenue,
-- yesterday's comparison, active bay queues, MTD net margins & gross profit,
-- and critical low-stock alert counts.
CREATE OR REPLACE FUNCTION public.get_executive_kpis(
    p_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_today_start TIMESTAMPTZ := p_date::timestamptz;
    v_today_end TIMESTAMPTZ := (p_date + interval '1 day')::timestamptz;
    v_yesterday_start TIMESTAMPTZ := (p_date - interval '1 day')::timestamptz;
    v_yesterday_end TIMESTAMPTZ := p_date::timestamptz;
    v_mtd_start TIMESTAMPTZ := date_trunc('month', p_date::timestamptz);
    
    v_revenue_today NUMERIC(14, 2) := 0.00;
    v_revenue_yesterday NUMERIC(14, 2) := 0.00;
    v_revenue_growth_pct NUMERIC(12, 2) := 0.00;
    
    v_active_work_orders INT := 0;
    v_pending_parts INT := 0;
    
    v_mtd_revenue NUMERIC(14, 2) := 0.00;
    v_mtd_cogs NUMERIC(14, 2) := 0.00;
    v_gross_profit NUMERIC(14, 2) := 0.00;
    v_net_margin_pct NUMERIC(12, 2) := 0.00;
    
    v_low_stock_count INT := 0;
BEGIN
    -- 1. Daily Gross Revenue (Today & Yesterday)
    SELECT
        COALESCE(SUM(CASE WHEN created_at >= v_today_start AND created_at < v_today_end THEN total_due ELSE 0 END), 0.00),
        COALESCE(SUM(CASE WHEN created_at >= v_yesterday_start AND created_at < v_yesterday_end THEN total_due ELSE 0 END), 0.00)
    INTO v_revenue_today, v_revenue_yesterday
    FROM public.transactions
    WHERE created_at >= v_yesterday_start AND created_at < v_today_end;

    -- Growth percentage with zero-denominator safety
    IF v_revenue_yesterday > 0 THEN
        v_revenue_growth_pct := ROUND(((v_revenue_today - v_revenue_yesterday) / v_revenue_yesterday) * 100.0, 2);
    ELSIF v_revenue_today > 0 THEN
        v_revenue_growth_pct := 100.00;
    ELSE
        v_revenue_growth_pct := 0.00;
    END IF;

    -- 2. Workshop Bay Queue Statuses
    SELECT
        COALESCE(COUNT(*) FILTER (WHERE status = 'IN PROGRESS'), 0),
        COALESCE(COUNT(*) FILTER (WHERE status = 'PENDING_PARTS'), 0)
    INTO v_active_work_orders, v_pending_parts
    FROM public.work_orders;

    -- 3. Month-to-Date Gross Revenue & COGS Deductions
    SELECT
        COALESCE(SUM(t.total_due), 0.00)
    INTO v_mtd_revenue
    FROM public.transactions t
    WHERE t.created_at >= v_mtd_start AND t.created_at < v_today_end;

    SELECT
        COALESCE(SUM(ti.quantity * COALESCE(p.cost, 0.00)), 0.00)
    INTO v_mtd_cogs
    FROM public.transaction_items ti
    JOIN public.transactions t ON t.id = ti.transaction_id
    LEFT JOIN public.products p ON p.sku = ti.item_sku_or_code
    WHERE t.created_at >= v_mtd_start 
      AND t.created_at < v_today_end
      AND ti.item_type = 'part';

    v_gross_profit := ROUND(v_mtd_revenue - v_mtd_cogs, 2);

    IF v_mtd_revenue > 0 THEN
        v_net_margin_pct := ROUND(((v_mtd_revenue - v_mtd_cogs) / v_mtd_revenue) * 100.0, 2);
    ELSE
        v_net_margin_pct := 0.00;
    END IF;

    -- 4. Critical Low-Stock Inventory Count
    SELECT
        COALESCE(COUNT(*), 0)
    INTO v_low_stock_count
    FROM public.products
    WHERE stock <= min_threshold;

    -- Assemble JSON response
    RETURN jsonb_build_object(
        'gross_revenue_today', v_revenue_today,
        'gross_revenue_yesterday', v_revenue_yesterday,
        'revenue_growth_pct', v_revenue_growth_pct,
        'active_work_orders_count', v_active_work_orders,
        'pending_parts_count', v_pending_parts,
        'net_profit_margin_pct', v_net_margin_pct,
        'gross_profit_amount', v_gross_profit,
        'critical_low_stock_count', v_low_stock_count
    );
END;
$$;

COMMENT ON FUNCTION public.get_executive_kpis IS 'Aggregates daily gross sales, workshop queue counts, MTD net margins, and inventory alerts in <50ms';


-- 2. Rolling 7-Day Revenue Trend Aggregator
-- Returns 7 sequential date records with parts vs labor splits and
-- pre-computed normalized bar height percentages (0-100%).
CREATE OR REPLACE FUNCTION public.get_revenue_trend_7d(
    p_end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    date DATE,
    day_label TEXT,
    parts_amount NUMERIC(10, 2),
    labor_amount NUMERIC(10, 2),
    total_amount NUMERIC(10, 2),
    parts_height_percent NUMERIC(5, 2),
    labor_height_percent NUMERIC(5, 2)
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_start_date DATE := p_end_date - 6;
BEGIN
    RETURN QUERY
    WITH calendar AS (
        SELECT series_date::DATE AS day_date
        FROM generate_series(v_start_date::timestamp, p_end_date::timestamp, interval '1 day') AS series_date
    ),
    daily_sales AS (
        SELECT
            c.day_date,
            to_char(c.day_date, 'Dy') AS day_txt,
            COALESCE(SUM(CASE WHEN ti.item_type = 'part' THEN ti.subtotal ELSE 0 END), 0.00) AS parts_rev,
            COALESCE(SUM(CASE WHEN ti.item_type = 'service' THEN ti.subtotal ELSE 0 END), 0.00) AS labor_rev
        FROM calendar c
        LEFT JOIN public.transactions t 
            ON t.created_at >= c.day_date::timestamptz 
           AND t.created_at < (c.day_date + 1)::timestamptz
        LEFT JOIN public.transaction_items ti 
            ON ti.transaction_id = t.id
        GROUP BY c.day_date
    ),
    totals AS (
        SELECT
            ds.day_date,
            ds.day_txt,
            ds.parts_rev,
            ds.labor_rev,
            (ds.parts_rev + ds.labor_rev) AS day_total,
            MAX(ds.parts_rev + ds.labor_rev) OVER () AS max_total
        FROM daily_sales ds
    )
    SELECT
        t.day_date AS date,
        t.day_txt AS day_label,
        ROUND(t.parts_rev, 2) AS parts_amount,
        ROUND(t.labor_rev, 2) AS labor_amount,
        ROUND(t.day_total, 2) AS total_amount,
        CASE
            WHEN t.max_total > 0 THEN ROUND((t.parts_rev / t.max_total) * 100.0, 2)
            ELSE 0.00
        END AS parts_height_percent,
        CASE
            WHEN t.max_total > 0 THEN ROUND((t.labor_rev / t.max_total) * 100.0, 2)
            ELSE 0.00
        END AS labor_height_percent
    FROM totals t
    ORDER BY t.day_date ASC;
END;
$$;

COMMENT ON FUNCTION public.get_revenue_trend_7d IS 'Aggregates 7-day parts vs labor revenue split with peak-day normalized bar heights';


-- 3. Categorized P&L & COGS Breakdown Engine
-- Aggregates revenue, unit volume, COGS, net profit, and margin % across
-- all catalog categories and workshop labor, returning both category rows and summary totals.
CREATE OR REPLACE FUNCTION public.get_category_pnl(
    p_start_date TIMESTAMPTZ,
    p_end_date TIMESTAMPTZ
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_categories JSONB;
    v_summary JSONB;
BEGIN
    WITH base_categories AS (
        SELECT unnest(ARRAY[
            'Fluids',
            'Drivetrain',
            'Brakes',
            'Ignition',
            'Engine',
            'Tires',
            'Accessories',
            'Workshop Labor'
        ]) AS cat_name
    ),
    period_items AS (
        SELECT
            CASE
                WHEN ti.item_type = 'service' THEN 'Workshop Labor'
                ELSE COALESCE(p.category, 'Accessories')
            END AS category_name,
            ti.quantity,
            ti.subtotal AS item_revenue,
            CASE
                WHEN ti.item_type = 'service' THEN 0.00
                ELSE (ti.quantity * COALESCE(p.cost, 0.00))
            END AS item_cost
        FROM public.transaction_items ti
        JOIN public.transactions t ON t.id = ti.transaction_id
        LEFT JOIN public.products p ON p.sku = ti.item_sku_or_code
        WHERE t.created_at >= p_start_date AND t.created_at <= p_end_date
    ),
    aggregated AS (
        SELECT
            bc.cat_name AS category,
            COALESCE(SUM(pi.quantity), 0)::INT AS units_sold,
            COALESCE(ROUND(SUM(pi.item_revenue), 2), 0.00) AS gross_revenue,
            COALESCE(ROUND(SUM(pi.item_cost), 2), 0.00) AS cogs,
            COALESCE(ROUND(SUM(pi.item_revenue) - SUM(pi.item_cost), 2), 0.00) AS net_profit,
            CASE
                WHEN SUM(pi.item_revenue) > 0 THEN 
                    ROUND(((SUM(pi.item_revenue) - SUM(pi.item_cost)) / SUM(pi.item_revenue)) * 100.0, 2)
                ELSE 0.00
            END AS margin_pct
        FROM base_categories bc
        LEFT JOIN period_items pi ON pi.category_name = bc.cat_name
        GROUP BY bc.cat_name
        ORDER BY gross_revenue DESC, bc.cat_name ASC
    ),
    summary_calc AS (
        SELECT
            COALESCE(SUM(units_sold), 0)::INT AS total_units_sold,
            COALESCE(SUM(gross_revenue), 0.00) AS total_gross_revenue,
            COALESCE(SUM(cogs), 0.00) AS total_cogs,
            COALESCE(SUM(net_profit), 0.00) AS total_net_profit,
            CASE
                WHEN SUM(gross_revenue) > 0 THEN
                    ROUND(((SUM(gross_revenue) - SUM(cogs)) / SUM(gross_revenue)) * 100.0, 2)
                ELSE 0.00
            END AS overall_margin_pct
        FROM aggregated
    )
    SELECT
        jsonb_agg(
            jsonb_build_object(
                'category', a.category,
                'units_sold', a.units_sold,
                'gross_revenue', a.gross_revenue,
                'cogs', a.cogs,
                'net_profit', a.net_profit,
                'margin_pct', a.margin_pct
            )
        ),
        jsonb_build_object(
            'total_units_sold', s.total_units_sold,
            'total_gross_revenue', s.total_gross_revenue,
            'total_cogs', s.total_cogs,
            'total_net_profit', s.total_net_profit,
            'overall_margin_pct', s.overall_margin_pct
        )
    INTO v_categories, v_summary
    FROM aggregated a, summary_calc s
    GROUP BY s.total_units_sold, s.total_gross_revenue, s.total_cogs, s.total_net_profit, s.overall_margin_pct;

    RETURN jsonb_build_object(
        'categories', COALESCE(v_categories, '[]'::jsonb),
        'summary', COALESCE(v_summary, jsonb_build_object(
            'total_units_sold', 0,
            'total_gross_revenue', 0.00,
            'total_cogs', 0.00,
            'total_net_profit', 0.00,
            'overall_margin_pct', 0.00
        ))
    );
END;
$$;

COMMENT ON FUNCTION public.get_category_pnl IS 'Categorized Profit & Loss engine computing unit volume, COGS, and profit margins per product line and workshop labor';


-- 4. Permissions Configuration
GRANT EXECUTE ON FUNCTION public.get_executive_kpis(DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_revenue_trend_7d(DATE) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_category_pnl(TIMESTAMPTZ, TIMESTAMPTZ) TO authenticated, service_role;
