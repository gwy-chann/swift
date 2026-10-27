-- Migration: Add customer_phone and customer_complaints to work_orders
ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS customer_phone TEXT;

ALTER TABLE public.work_orders 
ADD COLUMN IF NOT EXISTS customer_complaints TEXT;

COMMENT ON COLUMN public.work_orders.customer_phone IS 'Customer contact phone number collected during POS intake';
COMMENT ON COLUMN public.work_orders.customer_complaints IS 'Customer reported symptoms or reasons for workshop service intake';
