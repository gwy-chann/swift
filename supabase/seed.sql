-- ====================================================================
-- SWIFT Automated Demo User Seeding Script
-- Target: supabase/seed.sql
-- Jira Issue: SIAA-43 (STORY-1.6) / SIAA-105
-- Accounts:
--   1. Admin: admin@swift.local (Password: swift123, Role: admin, PIN: 8888)
--   2. Cashier: cashier@swift.local (Password: swift123, Role: cashier, PIN: 1234)
--   3. Mechanic: mechanic1@swift.local (Password: swift123, Role: mechanic, PIN: 2222)
--   4. Inventory Clerk: warehouse@swift.local (Password: swift123, Role: inventory_clerk, PIN: 3333)
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
        '{"full_name": "Carlos Rodriguez", "role": "admin"}'::jsonb,
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
        '{"full_name": "Mike Morales", "role": "cashier"}'::jsonb,
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        '',
        ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'd0000000-0000-0000-0000-000000000003',
        'authenticated',
        'authenticated',
        'mechanic1@swift.local',
        crypt('swift123', gen_salt('bf')),
        timezone('utc'::text, now()),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        '{"full_name": "Dante Reyes", "role": "mechanic"}'::jsonb,
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        '',
        ''
    ),
    (
        '00000000-0000-0000-0000-000000000000',
        'd0000000-0000-0000-0000-000000000004',
        'authenticated',
        'authenticated',
        'warehouse@swift.local',
        crypt('swift123', gen_salt('bf')),
        timezone('utc'::text, now()),
        '{"provider": "email", "providers": ["email"]}'::jsonb,
        '{"full_name": "Rico Santos", "role": "inventory_clerk"}'::jsonb,
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
    ),
    (
        'd0000000-0000-0000-0000-000000000003',
        'd0000000-0000-0000-0000-000000000003',
        jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000003', 'email', 'mechanic1@swift.local'),
        'email',
        'mechanic1@swift.local',
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    ),
    (
        'd0000000-0000-0000-0000-000000000004',
        'd0000000-0000-0000-0000-000000000004',
        jsonb_build_object('sub', 'd0000000-0000-0000-0000-000000000004', 'email', 'warehouse@swift.local'),
        'email',
        'warehouse@swift.local',
        timezone('utc'::text, now()),
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
ON CONFLICT (id) DO UPDATE
SET identity_data = EXCLUDED.identity_data,
    updated_at = timezone('utc'::text, now());

-- 3. Ensure corresponding public.profiles records with explicit roles and dedicated PIN codes
INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    status,
    pin_code,
    created_at,
    updated_at
)
VALUES
    (
        'a0000000-0000-0000-0000-000000000001',
        'admin@swift.local',
        'Carlos Rodriguez',
        'admin'::public.user_role,
        'Active',
        '8888',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    ),
    (
        'c0000000-0000-0000-0000-000000000002',
        'cashier@swift.local',
        'Mike Morales',
        'cashier'::public.user_role,
        'Active',
        '1234',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    ),
    (
        'd0000000-0000-0000-0000-000000000003',
        'mechanic1@swift.local',
        'Dante Reyes',
        'mechanic'::public.user_role,
        'Active',
        '2222',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    ),
    (
        'd0000000-0000-0000-0000-000000000004',
        'warehouse@swift.local',
        'Rico Santos',
        'inventory_clerk'::public.user_role,
        'Active',
        '3333',
        timezone('utc'::text, now()),
        timezone('utc'::text, now())
    )
ON CONFLICT (id) DO UPDATE
SET email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    pin_code = EXCLUDED.pin_code,
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

-- 6. POS Transactions & Line Items
-- Transactions are dynamically recorded through staff checkout operations in the Fast-Lane POS.
-- No static dummy transactions are seeded here to ensure all sales metrics derive from real staff entries.

-- 7. Seed Canonical Motorcycle Models (5 Baseline Models + Universal)
INSERT INTO public.motorcycle_models (
    id,
    make,
    model,
    displacement_cc,
    year_start,
    year_end,
    category,
    image_url
)
VALUES
    ('b0000000-0000-0000-0000-000000000001', 'Yamaha', 'NMAX 155', 155, 2020, 2026, 'Scooter', NULL),
    ('b0000000-0000-0000-0000-000000000002', 'Yamaha', 'Aerox 155', 155, 2019, 2026, 'Scooter', NULL),
    ('b0000000-0000-0000-0000-000000000003', 'Honda', 'Click 125i/150i', 150, 2018, 2026, 'Scooter', NULL),
    ('b0000000-0000-0000-0000-000000000004', 'Honda', 'ADV 160', 160, 2022, 2026, 'Scooter', NULL),
    ('b0000000-0000-0000-0000-000000000005', 'Suzuki', 'Raider 150 Fi', 150, 2017, 2026, 'Underbone', NULL),
    ('b0000000-0000-0000-0000-000000000000', 'Universal', 'Universal / Multi-Fit', 150, 2000, NULL, 'Universal', NULL)

ON CONFLICT (id) DO UPDATE
SET make = EXCLUDED.make,
    model = EXCLUDED.model,
    displacement_cc = EXCLUDED.displacement_cc,
    year_start = EXCLUDED.year_start,
    year_end = EXCLUDED.year_end,
    category = EXCLUDED.category,
    updated_at = timezone('utc'::text, now());

-- 8. Seed Canonical Product Fitments (12 Baseline Fitment Mappings)
INSERT INTO public.product_fitments (
    product_id,
    model_id,
    fitment_type,
    year_range,
    notes
)
SELECT p.id, m.id, f.fitment_type, f.year_range, f.notes
FROM (
    VALUES
        ('YAM-NMAX-BL01', 'Yamaha', 'NMAX 155', 2020, 'oem', '2020-2026', 'Front caliper OEM direct fit'),
        ('RCB-NMAX-BP02', 'Yamaha', 'NMAX 155', 2020, 'aftermarket', '2019-2026', 'High-temp racing ceramic compound'),
        ('HON-CLK-CVTB', 'Honda', 'Click 125i/150i', 2018, 'oem', '2018-2026', 'Gates Bando dual-cog OEM belt'),
        ('HON-ADV-CVTB', 'Honda', 'ADV 160', 2022, 'oem', '2022-2026', 'Gates Bando dual-cog OEM belt ADV 160'),
        ('UMA-CLK-CVTR', 'Honda', 'Click 125i/150i', 2018, 'aftermarket', '2018-2026', 'Reinforced kevlar fiber cord'),
        ('MOT-3100-10W40', 'Universal', 'Universal / Multi-Fit', 2000, 'universal', NULL, 'Compatible with all 4T air and liquid cooled engines'),
        ('SHL-ADV-AX7', 'Universal', 'Universal / Multi-Fit', 2000, 'universal', NULL, 'Compatible with all 4T scooter and manual clutch engines'),
        ('NGK-CPR8EA9', 'Honda', 'Click 125i/150i', 2018, 'oem', '2018-2026', 'Standard heat range 8'),
        ('DEN-IU24-IR', 'Yamaha', 'NMAX 155', 2020, 'aftermarket', '2016-2026', '0.4mm ultra-fine iridium center electrode'),
        ('SUZ-RAI-CLUTCH', 'Suzuki', 'Raider 150 Fi', 2017, 'oem', '2017-2026', 'Genuine Suzuki cork-paper friction plates'),
        ('KTR-RAI-CL6SP', 'Suzuki', 'Raider 150 Fi', 2017, 'aftermarket', '2017-2026', 'Heavy-duty 6-spring racing pressure plate kit'),
        ('MIC-PILOT-ST', 'Honda', 'ADV 160', 2022, 'aftermarket', '2022-2026', '110/80-14 front tubeless tire')
) AS f(sku, make, model, year_start, fitment_type, year_range, notes)
JOIN public.products p ON p.sku = f.sku
JOIN public.motorcycle_models m ON m.make = f.make AND m.model = f.model AND m.year_start = f.year_start
ON CONFLICT (product_id, model_id) DO UPDATE
SET fitment_type = EXCLUDED.fitment_type,
    year_range = EXCLUDED.year_range,
    notes = EXCLUDED.notes;

-- 9. Seed Baseline Staff Shifts (Punch Clock)
-- Idempotent baseline demo data mirroring the UI mock MOCK_PUNCH_LOGS.
-- Bound to the cashier account (cashier@swift.local).
INSERT INTO public.staff_shifts (
    id,
    profile_id,
    staff_name,
    terminal_id,
    clock_in,
    clock_out,
    duration_seconds,
    status,
    notes
)
VALUES
    (
        '30000000-0000-0000-0000-000000000001',
        'c0000000-0000-0000-0000-000000000002',
        'Mike Morales',
        'Terminal #01',
        timezone('utc'::text, now() - INTERVAL '3 days' + INTERVAL '8 hours'),
        timezone('utc'::text, now() - INTERVAL '3 days' + INTERVAL '17 hours'),
        32415,
        'completed',
        'Baseline demo shift'
    ),
    (
        '30000000-0000-0000-0000-000000000002',
        'c0000000-0000-0000-0000-000000000002',
        'Mike Morales',
        'Terminal #01',
        timezone('utc'::text, now() - INTERVAL '2 days' + INTERVAL '8 hours'),
        timezone('utc'::text, now() - INTERVAL '2 days' + INTERVAL '17 hours'),
        31632,
        'completed',
        'Baseline demo shift'
    ),
    (
        '30000000-0000-0000-0000-000000000003',
        'c0000000-0000-0000-0000-000000000002',
        'Mike Morales',
        'Terminal #02',
        timezone('utc'::text, now() - INTERVAL '1 day' + INTERVAL '8 hours'),
        NULL,
        0,
        'on_shift',
        'Baseline demo shift'
    ),
    (
        '30000000-0000-0000-0000-000000000004',
        'd0000000-0000-0000-0000-000000000003',
        'Dante Reyes',
        'Terminal #01',
        timezone('utc'::text, now() - INTERVAL '1 day' + INTERVAL '7 hours'),
        timezone('utc'::text, now() - INTERVAL '1 day' + INTERVAL '16 hours'),
        32400,
        'completed',
        'Service bay morning shift'
    )
ON CONFLICT (id) DO NOTHING;

-- 10. Seed Canonical Workshop Service Bays (4 Standard Bays)
-- Matching mockup/app.js & components/admin/service-bay-status.tsx
INSERT INTO public.service_bays (
    id,
    name,
    bay_type,
    status,
    display_order
)
VALUES
    ('e0000000-0000-0000-0000-000000000001', 'Bay 1 (Quick Bay)', 'Express', 'OCCUPIED', 1),
    ('e0000000-0000-0000-0000-000000000002', 'Bay 2 (Scooter Bay)', 'Specialist', 'OCCUPIED', 2),
    ('e0000000-0000-0000-0000-000000000003', 'Bay 3 (Mechanical Bay)', 'Diagnostic', 'QUEUED', 3),
    ('e0000000-0000-0000-0000-000000000004', 'Bay 4 (Heavy Repair)', 'Overhaul', 'AVAILABLE', 4)
ON CONFLICT (id) DO UPDATE
SET name = EXCLUDED.name,
    bay_type = EXCLUDED.bay_type,
    status = EXCLUDED.status,
    display_order = EXCLUDED.display_order,
    updated_at = timezone('utc'::text, now());

-- 11. Seed Baseline Active Repair Work Orders (3 Demo Orders)
-- Matching mockup/app.js & components/admin/service-bay-status.tsx
INSERT INTO public.work_orders (
    id,
    order_number,
    bay_id,
    customer_name,
    vehicle_model,
    plate_number,
    service_code,
    service_name,
    mechanic_id,
    status,
    estimated_duration_minutes,
    started_at,
    completed_at,
    notes
)
VALUES
    (
        'f0000000-0000-0000-0000-000000000001',
        'WO-2026-0001',
        'e0000000-0000-0000-0000-000000000001',
        'Juan dela Cruz',
        'Yamaha NMAX 155',
        'ND-10492',
        'SRV-OIL-01',
        'Oil Change + Brake Pads',
        'd0000000-0000-0000-0000-000000000003',
        'IN PROGRESS',
        30,
        timezone('utc'::text, now() - INTERVAL '20 minutes'),
        NULL,
        'Mechanic: Dante Reyes (~10 mins left)'
    ),
    (
        'f0000000-0000-0000-0000-000000000002',
        'WO-2026-0002',
        'e0000000-0000-0000-0000-000000000002',
        'Ramon Bautista',
        'Honda Click 150i',
        'NC-88412',
        'SRV-CVT-01',
        'Full CVT Overhaul',
        'd0000000-0000-0000-0000-000000000003',
        'IN PROGRESS',
        45,
        timezone('utc'::text, now() - INTERVAL '20 minutes'),
        NULL,
        'Mechanic: Dante Reyes (~25 mins left)'
    ),
    (
        'f0000000-0000-0000-0000-000000000003',
        'WO-2026-0003',
        'e0000000-0000-0000-0000-000000000003',
        'Eduardo Santos',
        'Suzuki Raider 150 Fi',
        'NE-33901',
        'SRV-BRK-01',
        'Clutch Replacement',
        NULL,
        'QUEUED',
        60,
        NULL,
        NULL,
        'Waiting for Bay clearance'
    )
ON CONFLICT (id) DO UPDATE
SET order_number = EXCLUDED.order_number,
    bay_id = EXCLUDED.bay_id,
    customer_name = EXCLUDED.customer_name,
    vehicle_model = EXCLUDED.vehicle_model,
    plate_number = EXCLUDED.plate_number,
    service_code = EXCLUDED.service_code,
    service_name = EXCLUDED.service_name,
    mechanic_id = EXCLUDED.mechanic_id,
    status = EXCLUDED.status,
    estimated_duration_minutes = EXCLUDED.estimated_duration_minutes,
    started_at = EXCLUDED.started_at,
    completed_at = EXCLUDED.completed_at,
    notes = EXCLUDED.notes,
    updated_at = timezone('utc'::text, now());

-- 12. Seed Baseline Stock Adjustment Logs
INSERT INTO public.stock_adjustment_logs (
    id,
    sku,
    adjustment_type,
    quantity_delta,
    previous_stock,
    new_stock,
    reason,
    user_id,
    user_name,
    created_at
)
VALUES
    (
        'a0000000-0000-0000-0000-000000008821',
        'YAM-NMAX-BL01',
        'Physical Count',
        -2,
        14,
        12,
        'Physical inventory count reconciliation',
        'c0000000-0000-0000-0000-000000000001',
        'Carlos Rodriguez',
        timezone('utc'::text, now() - INTERVAL '2 days')
    ),
    (
        'a0000000-0000-0000-0000-000000008820',
        'MOT-3100-10W40',
        'Supplier Return',
        24,
        6,
        30,
        'PO-4091 Supplier Delivery Received',
        'c0000000-0000-0000-0000-000000000002',
        'Rico Santos',
        timezone('utc'::text, now() - INTERVAL '2 days' + INTERVAL '3 hours')
    ),
    (
        'a0000000-0000-0000-0000-000000008819',
        'NGK-CPR8EA9',
        'Damaged Goods',
        -1,
        15,
        14,
        'Cracked porcelain during shelving',
        'c0000000-0000-0000-0000-000000000002',
        'Mike Morales',
        timezone('utc'::text, now() - INTERVAL '1 day')
    )
ON CONFLICT (id) DO NOTHING;





