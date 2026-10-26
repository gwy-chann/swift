-- Grant table permissions to service_role and anon
GRANT ALL ON TABLE public.stock_adjustment_logs TO service_role;
GRANT SELECT, INSERT ON TABLE public.stock_adjustment_logs TO anon;

-- Allow anon and service_role read access (for local kiosk PIN sessions)
DROP POLICY IF EXISTS "Allow anon read on stock_adjustment_logs" ON public.stock_adjustment_logs;
CREATE POLICY "Allow anon read on stock_adjustment_logs"
    ON public.stock_adjustment_logs
    FOR SELECT
    TO anon
    USING (true);

DROP POLICY IF EXISTS "Allow anon insert on stock_adjustment_logs" ON public.stock_adjustment_logs;
CREATE POLICY "Allow anon insert on stock_adjustment_logs"
    ON public.stock_adjustment_logs
    FOR INSERT
    TO anon
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow service_role on stock_adjustment_logs" ON public.stock_adjustment_logs;
CREATE POLICY "Allow service_role on stock_adjustment_logs"
    ON public.stock_adjustment_logs
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
