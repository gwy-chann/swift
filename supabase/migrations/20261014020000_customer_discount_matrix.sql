-- Migration: 20261014020000_customer_discount_matrix.sql
-- Feature: [SIAA-20] Customer Discount Matrix Engine (Senior, PWD & VIP) & Subtotal Computation
-- Expand transactions discount_type check constraint to permit 'fleet' (5%) and 'senior_pwd' (20%)

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'transactions_discount_type_check' 
        AND conrelid = 'public.transactions'::regclass
    ) THEN
        ALTER TABLE public.transactions DROP CONSTRAINT transactions_discount_type_check;
    END IF;

    ALTER TABLE public.transactions
    ADD CONSTRAINT transactions_discount_type_check
    CHECK (discount_type IS NULL OR discount_type IN ('none', 'senior', 'pwd', 'vip', 'fleet', 'senior_pwd', 'custom_override', 'discount'));
END $$;
