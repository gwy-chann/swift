-- ====================================================================
-- Migration: 20261014000000_pos_transactions.sql
-- Description: POS transactions and hybrid line items schema with
--              immutable financial ledger guard and Row-Level Security.
-- Jira Issue: SIAA-50 (STORY-3.7)
-- ====================================================================

-- 1. POS Transactions Master Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    receipt_number TEXT NOT NULL UNIQUE,
    cashier_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    cashier_name TEXT NOT NULL,
    pricing_mode TEXT NOT NULL CHECK (pricing_mode IN ('retail', 'wholesale')),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    discount_type TEXT NULL CHECK (discount_type IS NULL OR discount_type IN ('none', 'senior', 'pwd', 'vip')),
    discount_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0000 CHECK (discount_rate >= 0),
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0),
    total_due NUMERIC(10, 2) NOT NULL CHECK (total_due >= 0),
    cash_tendered NUMERIC(10, 2) NOT NULL CHECK (cash_tendered >= total_due),
    change_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (change_due >= 0),
    payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'GCash', 'Card', 'Maya')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

COMMENT ON TABLE public.transactions IS 'Authoritative master sales transaction record with tender and discount details';

-- 2. Hybrid Transaction Line Items Table
CREATE TABLE IF NOT EXISTS public.transaction_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT,
    item_type TEXT NOT NULL CHECK (item_type IN ('part', 'service')),
    item_sku_or_code TEXT NOT NULL,
    item_name TEXT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0),
    quantity INT NOT NULL CHECK (quantity > 0),
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    bay TEXT NULL,
    shelf_location TEXT NULL
);

COMMENT ON TABLE public.transaction_items IS 'Itemized line items recording physical motorcycle parts and workshop bay labor services';

-- 3. Performance B-Tree Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_receipt_number ON public.transactions(receipt_number);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON public.transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_cashier_id ON public.transactions(cashier_id);
CREATE INDEX IF NOT EXISTS idx_transactions_pricing_mode ON public.transactions(pricing_mode);
CREATE INDEX IF NOT EXISTS idx_transactions_payment_method ON public.transactions(payment_method);

CREATE INDEX IF NOT EXISTS idx_transaction_items_tx_id ON public.transaction_items(transaction_id);
CREATE INDEX IF NOT EXISTS idx_transaction_items_item_type ON public.transaction_items(item_type);
CREATE INDEX IF NOT EXISTS idx_transaction_items_sku_code ON public.transaction_items(item_sku_or_code);

-- 4. Immutable Financial Ledger Trigger
-- Fails any UPDATE or DELETE attempt at the PostgreSQL engine level
CREATE OR REPLACE FUNCTION public.prevent_transaction_immutability()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Transactions and line items are immutable financial records and cannot be updated or deleted.';
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_transaction_modifications ON public.transactions;
CREATE TRIGGER trg_prevent_transaction_modifications
    BEFORE UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_transaction_immutability();

DROP TRIGGER IF EXISTS trg_prevent_transaction_item_modifications ON public.transaction_items;
CREATE TRIGGER trg_prevent_transaction_item_modifications
    BEFORE UPDATE OR DELETE ON public.transaction_items
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_transaction_immutability();

-- 5. Row Level Security (RLS) Configuration
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Grants
GRANT SELECT, INSERT ON TABLE public.transactions TO anon, authenticated;
GRANT ALL ON TABLE public.transactions TO service_role;

GRANT SELECT, INSERT ON TABLE public.transaction_items TO anon, authenticated;
GRANT ALL ON TABLE public.transaction_items TO service_role;

-- Read policies
DROP POLICY IF EXISTS "Allow read access on transactions" ON public.transactions;
CREATE POLICY "Allow read access on transactions"
    ON public.transactions
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Allow read access on transaction_items" ON public.transaction_items;
CREATE POLICY "Allow read access on transaction_items"
    ON public.transaction_items
    FOR SELECT
    USING (true);

-- Append-only insert policies
DROP POLICY IF EXISTS "Allow insert access on transactions" ON public.transactions;
CREATE POLICY "Allow insert access on transactions"
    ON public.transactions
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Allow insert access on transaction_items" ON public.transaction_items;
CREATE POLICY "Allow insert access on transaction_items"
    ON public.transaction_items
    FOR INSERT
    WITH CHECK (true);
