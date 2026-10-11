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

-- 4. Seed Canonical Motorcycle Parts Catalog (12 Baseline Items)
INSERT INTO public.products (
    sku,
    name,
    category,
    brand,
    model,
    cost,
    wholesale,
    retail,
    stock,
    min_threshold,
    location,
    oem
)
VALUES
    ('YAM-NMAX-BL01', 'OEM Front Brake Pads', 'Brakes', 'Yamaha Genuine Parts', 'Yamaha NMAX 155', 280, 380, 450, 2, 5, 'Rack A-01 / Shelf 2', true),
    ('RCB-NMAX-BP02', 'RCB S-Series Ceramic Brake Pads', 'Brakes', 'Racing Boy', 'Yamaha NMAX 155', 350, 480, 580, 14, 6, 'Rack A-01 / Shelf 3', false),
    ('HON-CLK-CVTB', 'OEM Drive Belt (Gates Bando)', 'Drivetrain', 'Honda OEM', 'Honda Click 125i/150i', 520, 720, 850, 4, 8, 'Rack B-04 / Shelf 1', true),
    ('HON-ADV-CVTB', 'OEM Drive Belt (Gates Bando ADV 160)', 'Drivetrain', 'Honda OEM', 'Honda ADV 160', 520, 720, 850, 0, 6, 'Rack B-04 / Shelf 3', true),
    ('UMA-CLK-CVTR', 'Uma Racing Kevlar High-Tension Belt', 'Drivetrain', 'Uma Racing', 'Honda Click 125i/150i', 750, 1050, 1250, 9, 4, 'Rack B-04 / Shelf 2', false),
    ('MOT-3100-10W40', 'Motul 3100 Gold 4T 10W40 (1L)', 'Fluids', 'Motul', 'Universal', 260, 330, 390, 28, 15, 'Aisle 1 / Shelf 1', false),
    ('SHL-ADV-AX7', 'Shell Advance AX7 Synthetic 10W40 (1L)', 'Fluids', 'Shell', 'Universal', 240, 300, 360, 18, 12, 'Aisle 1 / Shelf 2', false),
    ('NGK-CPR8EA9', 'NGK Nickel Spark Plug (CPR8EA-9)', 'Ignition', 'NGK', 'Honda Click 125i/150i', 110, 150, 190, 3, 10, 'Rack C-02 / Shelf 1', true),
    ('DEN-IU24-IR', 'Denso Iridium Power Spark Plug (IU24)', 'Ignition', 'Denso', 'Yamaha NMAX 155', 380, 520, 620, 11, 5, 'Rack C-02 / Shelf 2', false),
    ('SUZ-RAI-CLUTCH', 'Raider 150 Fi OEM Clutch Lining Set', 'Engine', 'Suzuki OEM', 'Suzuki Raider 150 Fi', 680, 890, 1100, 5, 4, 'Rack D-01 / Shelf 3', true),
    ('KTR-RAI-CL6SP', 'Kawahara 6-Spring Competition Clutch Plate', 'Engine', 'Kawahara Racing', 'Suzuki Raider 150 Fi', 950, 1300, 1550, 7, 3, 'Rack D-01 / Shelf 4', false),
    ('MIC-PILOT-ST', 'Michelin Pilot Street 2 (110/80-14)', 'Tires', 'Michelin', 'Honda ADV 160', 1450, 1850, 2150, 6, 4, 'Tire Rack 2 / Floor', false)
ON CONFLICT (sku) DO NOTHING;

-- 5. Seed Canonical Workshop Labor Services (6 Baseline Services)
-- Matching mockup/app.js & lib/mock-data/services.ts
INSERT INTO public.labor_services (
    code,
    name,
    bay,
    rate,
    duration,
    description,
    active
)
VALUES
    ('SRV-OIL-01', 'Standard Oil & Gear Oil Change', 'Bay 1 / Quick Bay', 100.00, '15 mins', 'Includes engine oil drain and refill, final drive gear oil top-up, and waste disposal.', true),
    ('SRV-CVT-01', 'CVT Cleaning & Regreasing', 'Bay 2 / Scooter Bay', 350.00, '45 mins', 'Variator, clutch bell, torque drive degreasing, roller weight inspection, and high-temp regreasing.', true),
    ('SRV-TIRE-01', 'Tubeless Tire Mounting & Bead Sealing', 'Bay 1 / Quick Bay', 150.00, '20 mins', 'Pneumatic machine dismounting, rim bead cleaning, sealant application, and high-pressure inflation.', true),
    ('SRV-BRK-01', 'Brake Caliper Flush & Bleeding', 'Bay 3 / Mechanical Bay', 250.00, '30 mins', 'DOT 4 hydraulic fluid flush, piston slide lubrication, and vacuum air purge.', true),
    ('SRV-TUNE-01', 'Full FI Throttle Body Cleaning & Reset', 'Bay 3 / Mechanical Bay', 650.00, '60 mins', 'Ultrasonic injector spray cleaning, throttle body carbon removal, and TPS / IACV calibration.', true),
    ('SRV-FORK-01', 'Front Shock Re-oil & Seal Replacement', 'Bay 4 / Heavy Repair', 800.00, '90 mins', 'Telescopic fork disassembly, inner tube polishing, dual oil seal replacement, and 10W fork oil calibration.', true)
ON CONFLICT (code) DO UPDATE
SET name = EXCLUDED.name,
    bay = EXCLUDED.bay,
    rate = EXCLUDED.rate,
    duration = EXCLUDED.duration,
    description = EXCLUDED.description,
    active = EXCLUDED.active,
    updated_at = timezone('utc'::text, now());

-- 6. Seed Baseline Historical Transactions & Line Items
-- Idempotent baseline data for receipt search, reprinting and analytics
INSERT INTO public.transactions (
    id,
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
)
VALUES
    (
        't0000000-0000-0000-0000-000000000001',
        'TX-1041',
        'c0000000-0000-0000-0000-000000000002',
        'SWIFT Fast-Lane Cashier',
        'retail',
        550.00,
        'none',
        0.0000,
        0.00,
        550.00,
        600.00,
        50.00,
        'Cash',
        timezone('utc'::text, now() - INTERVAL '2 days')
    ),
    (
        't0000000-0000-0000-0000-000000000002',
        'TX-1042',
        'c0000000-0000-0000-0000-000000000002',
        'SWIFT Fast-Lane Cashier',
        'retail',
        1200.00,
        'senior',
        0.2000,
        240.00,
        960.00,
        1000.00,
        40.00,
        'GCash',
        timezone('utc'::text, now() - INTERVAL '1 day')
    ),
    (
        't0000000-0000-0000-0000-000000000003',
        'TX-1043',
        'c0000000-0000-0000-0000-000000000002',
        'SWIFT Fast-Lane Cashier',
        'wholesale',
        2100.00,
        'none',
        0.0000,
        0.00,
        2100.00,
        2100.00,
        0.00,
        'Card',
        timezone('utc'::text, now() - INTERVAL '3 hours')
    )
ON CONFLICT (receipt_number) DO NOTHING;

INSERT INTO public.transaction_items (
    id,
    transaction_id,
    item_type,
    item_sku_or_code,
    item_name,
    unit_price,
    quantity,
    subtotal,
    bay,
    shelf_location
)
VALUES
    -- TX-1041 items: Oil (part) + Oil Change (service)
    ('i0000000-0000-0000-0000-000000000001', 't0000000-0000-0000-0000-000000000001', 'part', 'MOT-3100-10W40', 'Motul 3100 Gold 4T 10W40 (1L)', 390.00, 1, 390.00, NULL, 'Aisle 1 / Shelf 1'),
    ('i0000000-0000-0000-0000-000000000002', 't0000000-0000-0000-0000-000000000001', 'service', 'SRV-OIL-01', 'Standard Oil & Gear Oil Change', 100.00, 1, 100.00, 'Bay 1 / Quick Bay', NULL),
    ('i0000000-0000-0000-0000-000000000003', 't0000000-0000-0000-0000-000000000001', 'service', 'SRV-TIRE-01', 'Tubeless Tire Mounting & Bead Sealing', 60.00, 1, 60.00, 'Bay 1 / Quick Bay', NULL),

    -- TX-1042 items: Drive belt (part) + CVT Cleaning (service)
    ('i0000000-0000-0000-0000-000000000004', 't0000000-0000-0000-0000-000000000002', 'part', 'HON-CLK-CVTB', 'OEM Drive Belt (Gates Bando)', 850.00, 1, 850.00, NULL, 'Rack B-04 / Shelf 1'),
    ('i0000000-0000-0000-0000-000000000005', 't0000000-0000-0000-0000-000000000002', 'service', 'SRV-CVT-01', 'CVT Cleaning & Regreasing', 350.00, 1, 350.00, 'Bay 2 / Scooter Bay', NULL),

    -- TX-1043 items: Wholesale brake pads (parts)
    ('i0000000-0000-0000-0000-000000000006', 't0000000-0000-0000-0000-000000000003', 'part', 'RCB-NMAX-BP02', 'RCB S-Series Ceramic Brake Pads', 480.00, 3, 1440.00, NULL, 'Rack A-01 / Shelf 3'),
    ('i0000000-0000-0000-0000-000000000007', 't0000000-0000-0000-0000-000000000003', 'part', 'DEN-IU24-IR', 'Denso Iridium Power Spark Plug (IU24)', 520.00, 1, 520.00, NULL, 'Rack C-02 / Shelf 2'),
    ('i0000000-0000-0000-0000-000000000008', 't0000000-0000-0000-0000-000000000003', 'service', 'SRV-BRK-01', 'Brake Caliper Flush & Bleeding', 140.00, 1, 140.00, 'Bay 3 / Mechanical Bay', NULL)
ON CONFLICT (id) DO NOTHING;


