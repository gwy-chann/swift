-- ====================================================================
-- SWIFT Automated Demo User Seeding Script
-- Target: supabase/seed.sql
-- Jira Issue: SIAA-43 (STORY-1.6)
-- Accounts:
--   1. Admin: admin@swift.local (Password: swift123, Role: admin)
--   2. Cashier: cashier@swift.local (Password: swift123, Role: cashier)
-- ====================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. Seed auth.users with pre-confirmed email status
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token
)
VALUES
    (
        '00000000-0000-0000-0000-000000000000',
        'a0000000-0000-0000-0000-000000000001',
        'authenticated',
        'authenticated',
        'admin@swift.local',
        crypt('swift123', gen_salt('bf')),
        timezone('utc'::text, now()),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        '{"full_name": "SWIFT Shop Admin", "role": "admin"}'::jsonb,
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        '',
        ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'c0000000-0000-0000-0000-000000000002',
        'authenticated',
        'authenticated',
        'cashier@swift.local',
        crypt('swift123', gen_salt('bf')),
        timezone('utc'::text, now()),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        '{"full_name": "SWIFT Fast-Lane Cashier", "role": "cashier"}'::jsonb,
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        '',
        ''
    )
ON CONFLICT (id) DO UPDATE
SET encrypted_password = EXCLUDED.encrypted_password,
    email_confirmed_at = EXCLUDED.email_confirmed_at,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    raw_user_meta_data = EXCLUDED.raw_user_meta_data,
    updated_at = timezone('utc'::text, now());

-- 2. Seed auth.identities to enable GoTrue email authentication lookup
INSERT INTO auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'a0000000-0000-0000-0000-000000000001',
        jsonb_build_object('sub', 'a0000000-0000-0000-0000-000000000001', 'email', 'admin@swift.local'),
        'email',
        'admin@swift.local',
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000002',
        jsonb_build_object('sub', 'c0000000-0000-0000-0000-000000000002', 'email', 'cashier@swift.local'),
        'email',
        'cashier@swift.local',
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
ON CONFLICT (id) DO UPDATE
SET identity_data = EXCLUDED.identity_data,
    updated_at = timezone('utc'::text, now());

-- 3. Ensure corresponding public.profiles records with explicit roles
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    status,
    created_at,
    updated_at
)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'admin@swift.local',
        'SWIFT Shop Admin',
        'admin'::public.user_role,
        'Active',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'cashier@swift.local',
        'SWIFT Fast-Lane Cashier',
        'cashier'::public.user_role,
        'Active',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = timezone('utc'::text, now());
