-- ====================================================================
-- Migration: 20261026000000_staff_employee_id.sql
-- Description: Add employee_id column to public.profiles, grant service_role,
--              assign default IDs to existing profiles, and update trigger.
-- ====================================================================

-- 1. Add employee_id column to public.profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS employee_id VARCHAR(50);

COMMENT ON COLUMN public.profiles.employee_id IS 'Unique human-readable employee identification code (e.g. EMP-001)';

-- 2. Grants for service_role and authenticated
GRANT ALL ON TABLE public.profiles TO service_role;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT SELECT ON TABLE public.profiles TO anon;

-- 3. Populate standard seed accounts with initial employee IDs
UPDATE public.profiles
SET employee_id = 'EMP-001'
WHERE email = 'admin@swift.local' AND (employee_id IS NULL OR employee_id = '');

UPDATE public.profiles
SET employee_id = 'EMP-002'
WHERE email = 'cashier@swift.local' AND (employee_id IS NULL OR employee_id = '');

UPDATE public.profiles
SET employee_id = 'EMP-003'
WHERE email = 'mechanic1@swift.local' AND (employee_id IS NULL OR employee_id = '');

UPDATE public.profiles
SET employee_id = 'EMP-004'
WHERE email = 'warehouse@swift.local' AND (employee_id IS NULL OR employee_id = '');

-- Assign sequential employee IDs for any other existing profiles without one
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) + 4 as num
  FROM public.profiles
  WHERE employee_id IS NULL OR employee_id = ''
)
UPDATE public.profiles p
SET employee_id = 'EMP-' || LPAD(numbered.num::text, 3, '0')
FROM numbered
WHERE p.id = numbered.id;

-- 4. Create index for fast lookups by employee_id
CREATE INDEX IF NOT EXISTS idx_profiles_employee_id ON public.profiles(employee_id);

-- 5. Update handle_new_user to persist employee_id from auth user metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    assigned_role public.user_role;
    raw_role_text TEXT;
    default_perms JSONB;
BEGIN
    raw_role_text := LOWER(COALESCE(NEW.raw_user_meta_data->>'role', 'staff'));
    
    BEGIN
        assigned_role := raw_role_text::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        assigned_role := 'staff'::public.user_role;
    END;

    IF NEW.raw_user_meta_data->'permissions' IS NOT NULL AND jsonb_typeof(NEW.raw_user_meta_data->'permissions') = 'object' THEN
        default_perms := NEW.raw_user_meta_data->'permissions';
    ELSIF assigned_role = 'admin'::public.user_role THEN
        default_perms := '{"can_adjust_stock": true, "can_override_discount": true, "can_manage_pricing": true, "can_view_reports": true}'::jsonb;
    ELSIF assigned_role = 'inventory_clerk'::public.user_role THEN
        default_perms := '{"can_adjust_stock": true, "can_override_discount": false, "can_manage_pricing": false, "can_view_reports": false}'::jsonb;
    ELSE
        default_perms := '{"can_adjust_stock": false, "can_override_discount": false, "can_manage_pricing": false, "can_view_reports": false}'::jsonb;
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, status, permissions, employee_id)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            split_part(NEW.email, '@', 1)
        ),
        assigned_role,
        'Active',
        default_perms,
        NEW.raw_user_meta_data->>'employee_id'
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        employee_id = COALESCE(EXCLUDED.employee_id, public.profiles.employee_id),
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$;
