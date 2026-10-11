-- ==============================================================================
-- SWIFT Contract: Supabase PostgreSQL Products Schema & Indexes
-- Feature: SIAA-45 (STORY-2.6: Supabase Master Parts Catalog Schema, Indexes, RLS)
-- ==============================================================================

-- 1. Products Table Definition
CREATE TABLE IF NOT EXISTS public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT NOT NULL,
  model TEXT NOT NULL DEFAULT 'Universal',
  cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0),
  wholesale NUMERIC(10, 2) NOT NULL CHECK (wholesale >= 0),
  retail NUMERIC(10, 2) NOT NULL CHECK (retail >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0),
  min_threshold INTEGER NOT NULL DEFAULT 0 CHECK (min_threshold >= 0),
  location TEXT NULL,
  oem BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT NULL,
  description TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Indexes for High-Speed Multi-Attribute Querying (<50ms)
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products(model);
CREATE INDEX IF NOT EXISTS idx_products_location ON public.products(location);

-- 3. Automatic Timestamp Updating
CREATE OR REPLACE FUNCTION update_products_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_products_updated_at ON public.products;
CREATE TRIGGER trigger_products_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION update_products_updated_at();

-- 4. Row Level Security Policies
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access on products"
  ON public.products
  FOR SELECT
  USING (true);

CREATE POLICY "Allow admin full access on products"
  ON public.products
  FOR ALL
  TO authenticated
  USING (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'admin'
  )
  WITH CHECK (
    (SELECT role FROM public.profiles WHERE id = (select auth.uid())) = 'admin'
  );

-- 5. Canonical Baseline Seed Data (12 Motorcycle Parts)
INSERT INTO public.products (sku, name, category, brand, model, cost, wholesale, retail, stock, min_threshold, location, oem)
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
