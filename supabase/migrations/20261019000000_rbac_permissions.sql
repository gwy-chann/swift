-- ====================================================================
-- Migration: 20261019000000_rbac_permissions.sql
-- Description: Extend user_role enum with inventory_clerk, add persistent
--              granular permission flags to profiles, implement admin self-lockout
--              prevention trigger, and update handle_new_user trigger.
-- Jira Issue: SIAA-56 (STORY-7.6)
-- ====================================================================

-- 1. Extend user_role enum with 'inventory_clerk'
DO $$
BEGIN
    ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'inventory_clerk';
EXCEPTION
    WHEN duplicate_object THEN NULL;
END$$;

COMMENT ON TYPE public.user_role IS 'SWIFT operational user access tiers: admin, staff, cashier, mechanic, inventory_clerk';

-- 2. Add permissions JSONB column to public.profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL 
DEFAULT '{"can_adjust_stock": false, "can_override_discount": false, "can_manage_pricing": false, "can_view_reports": false}'::jsonb;

COMMENT ON COLUMN public.profiles.permissions IS 'Granular operational permission flags (can_adjust_stock, can_override_discount, can_manage_pricing, can_view_reports)';

-- Index for JSONB queries
CREATE INDEX IF NOT EXISTS idx_profiles_permissions ON public.profiles USING GIN (permissions);

-- 3. Admin Self-Lockout & Demotion Guard Trigger
CREATE OR REPLACE FUNCTION public.enforce_admin_self_protection()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Only evaluate if the executing session matches the profile being modified
    IF TG_OP = 'DELETE' THEN
        IF OLD.id = (SELECT auth.uid()) AND OLD.role = 'admin'::public.user_role THEN
            RAISE EXCEPTION 'Admin self-deletion is prohibited to protect administrative access.'
                USING ERRCODE = '23514';
        END IF;
        RETURN OLD;
    ELSIF TG_OP = 'UPDATE' THEN
        IF OLD.id = (SELECT auth.uid()) AND OLD.role = 'admin'::public.user_role THEN
            -- Prevent demoting self from admin
            IF NEW.role != 'admin'::public.user_role THEN
                RAISE EXCEPTION 'Admin self-demotion is prohibited to prevent system lockout.'
                    USING ERRCODE = '23514';
            END IF;

            -- Prevent deactivating or suspending self
            IF NEW.status != 'Active' THEN
                RAISE EXCEPTION 'Admin self-deactivation is prohibited.'
                    USING ERRCODE = '23514';
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.enforce_admin_self_protection() IS 'Security trigger preventing master administrators from demoting, deactivating, or deleting their own account';

DROP TRIGGER IF EXISTS trg_admin_self_protection ON public.profiles;
CREATE TRIGGER trg_admin_self_protection
    BEFORE UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_admin_self_protection();

-- 4. Update Automatic Profile Provisioning Trigger
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
    
    -- Map string representation safely to enum
    BEGIN
        assigned_role := raw_role_text::public.user_role;
    EXCEPTION WHEN OTHERS THEN
        assigned_role := 'staff'::public.user_role;
    END;

    -- Determine default permissions based on role if not explicitly provided
    IF NEW.raw_user_meta_data->'permissions' IS NOT NULL AND jsonb_typeof(NEW.raw_user_meta_data->'permissions') = 'object' THEN
        default_perms := NEW.raw_user_meta_data->'permissions';
    ELSIF assigned_role = 'admin'::public.user_role THEN
        default_perms := '{"can_adjust_stock": true, "can_override_discount": true, "can_manage_pricing": true, "can_view_reports": true}'::jsonb;
    ELSIF assigned_role = 'inventory_clerk'::public.user_role THEN
        default_perms := '{"can_adjust_stock": true, "can_override_discount": false, "can_manage_pricing": false, "can_view_reports": false}'::jsonb;
    ELSE
        default_perms := '{"can_adjust_stock": false, "can_override_discount": false, "can_manage_pricing": false, "can_view_reports": false}'::jsonb;
    END IF;

    INSERT INTO public.profiles (id, email, full_name, role, status, permissions)
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
        default_perms
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        role = EXCLUDED.role,
        permissions = EXCLUDED.permissions,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$;
