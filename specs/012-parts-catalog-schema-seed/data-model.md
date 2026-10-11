# Data Model & Schema Specification: Master Parts Catalog

**Feature**: [`specs/012-parts-catalog-schema-seed/spec.md`](spec.md)  
**Ticket**: [SIAA-45](https://the-three-devsketeers.atlassian.net/browse/SIAA-45)  
**Date**: 2026-10-11  

---

## 1. Domain Entities & Attributes

### Product (Motorcycle Part)
The core physical inventory asset in the SWIFT workshop.

| Field | Type | Required | Description & Constraints |
|---|---|:---:|---|
| `id` | UUID | Yes | Primary key generated via `gen_random_uuid()`. |
| `sku` | String | Yes | Unique stock keeping unit code (e.g. `YAM-NMAX-BL01`). Indexed, unique. |
| `name` | String | Yes | Human-readable part title (e.g. `OEM Front Brake Pads`). |
| `category` | String | Yes | Classification category (e.g. `Brakes`, `Drivetrain`, `Fluids`). Indexed. |
| `brand` | String | Yes | Manufacturer brand name (e.g. `Yamaha Genuine Parts`, `Motul`). Indexed. |
| `model` | String | Yes | Target motorcycle model fitment (or `'Universal'`). Indexed. |
| `cost` | Decimal / Numeric | Yes | Supplier acquisition cost in ₱. Constraint: `cost >= 0`. |
| `wholesale` | Decimal / Numeric | Yes | Discounted trade/mechanic tier price in ₱. Constraint: `wholesale >= 0`. |
| `retail` | Decimal / Numeric | Yes | Counter customer retail price in ₱. Constraint: `retail >= 0`. |
| `stock` | Integer | Yes | Physical on-hand unit quantity. Default `0`. Constraint: `stock >= 0`. |
| `min_threshold` | Integer | Yes | Safety reorder threshold level. Default `0`. Constraint: `min_threshold >= 0`. |
| `location` | String | No | Warehouse physical shelf coordinate (e.g. `Rack A-01 / Shelf 2`). Indexed. |
| `oem` | Boolean | Yes | Flag indicating whether part is original equipment manufacturer. Default `false`. |
| `image_url` | String | No | URL to part photograph or asset illustration. |
| `description` | String | No | Optional technical notes or installation guidelines. |
| `created_at` | Timestamptz | Yes | Record creation timestamp. Default `now()`. |
| `updated_at` | Timestamptz | Yes | Record update timestamp. Default `now()`, managed by trigger. |

---

## 2. PostgreSQL DDL Specification

```sql
-- Migration: 20261010000000_inventory_products.sql
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

-- B-Tree Performance Indexes
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category);
CREATE INDEX IF NOT EXISTS idx_products_brand ON public.products(brand);
CREATE INDEX IF NOT EXISTS idx_products_model ON public.products(model);
CREATE INDEX IF NOT EXISTS idx_products_location ON public.products(location);

-- Automatic updated_at Trigger
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

-- Row Level Security (RLS)
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
```

---

## 3. Prisma ORM Model Mapping

```prisma
// File: prisma/schema.prisma

model Product {
  id           String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  sku          String   @unique
  name         String
  category     String
  brand        String
  model        String   @default("Universal")
  cost         Decimal  @db.Decimal(10, 2)
  wholesale    Decimal  @db.Decimal(10, 2)
  retail       Decimal  @db.Decimal(10, 2)
  stock        Int      @default(0)
  minThreshold Int      @default(0) @map("min_threshold")
  location     String?
  oem          Boolean  @default(false)
  imageUrl     String?  @map("image_url")
  description  String?
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz(6)
  updatedAt    DateTime @default(now()) @updatedAt @map("updated_at") @db.Timestamptz(6)

  @@index([sku])
  @@index([category])
  @@index([brand])
  @@index([model])
  @@index([location])
  @@map("products")
}
```

---

## 4. TypeScript Interface Alignment

```typescript
// File: lib/types/product.ts

export interface Product {
  id?: string;
  sku: string;
  name: string;
  category: ProductCategory;
  stock: number;
  minThreshold: number;
  location: string;
  cost: number;
  wholesale: number;
  retail: number;
  oem: boolean;
  model: string;
  brand: string;
  description?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}
```
