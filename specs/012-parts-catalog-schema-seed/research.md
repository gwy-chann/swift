# Research & Architectural Decisions: Master Parts Catalog Schema, Indexes, RLS & Baseline Seed Data

**Feature**: [`specs/012-parts-catalog-schema-seed/spec.md`](spec.md)  
**Ticket**: [SIAA-45](https://the-three-devsketeers.atlassian.net/browse/SIAA-45)  
**Date**: 2026-10-11  

---

## 1. PostgreSQL Schema Definition & Column Constraints

### Decision
Define `public.products` with strict type definitions and SQL `CHECK` constraints:
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `sku TEXT NOT NULL UNIQUE`
- `name TEXT NOT NULL`
- `category TEXT NOT NULL`
- `brand TEXT NOT NULL`
- `model TEXT NOT NULL DEFAULT 'Universal'`
- `cost NUMERIC(10, 2) NOT NULL CHECK (cost >= 0)`
- `wholesale NUMERIC(10, 2) NOT NULL CHECK (wholesale >= 0)`
- `retail NUMERIC(10, 2) NOT NULL CHECK (retail >= 0)`
- `stock INTEGER NOT NULL DEFAULT 0 CHECK (stock >= 0)`
- `min_threshold INTEGER NOT NULL DEFAULT 0 CHECK (min_threshold >= 0)`
- `location TEXT NULL`
- `oem BOOLEAN NOT NULL DEFAULT false`
- `image_url TEXT NULL`
- `description TEXT NULL`
- `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`
- `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`

### Rationale
- Using PostgreSQL's native `NUMERIC(10, 2)` prevents floating-point rounding errors on currency calculations (Philippine Pesos ₱).
- Native SQL `CHECK` constraints guarantee that negative costs, prices, or stock counts can never enter the database regardless of whether writes originate from server actions, migrations, or direct queries.
- `sku` unique constraint provides deterministic lookup and natural business identification across POS barcode scanning and inventory lookups.

### Alternatives Considered
- `FLOAT` or `REAL` for prices: Rejected due to standard floating-point imprecision in financial arithmetic.
- Storing currency as integers (centavos): Rejected because SWIFT domain models and existing UI mockups already standardize on standard peso decimal numbers.

---

## 2. B-Tree Index Strategy for Sub-50ms Multi-Attribute Search

### Decision
Create dedicated B-tree indexes for the most frequent search and filtering attributes:
- `idx_products_sku` on `public.products(sku)`
- `idx_products_category` on `public.products(category)`
- `idx_products_brand` on `public.products(brand)`
- `idx_products_model` on `public.products(model)`
- `idx_products_location` on `public.products(location)`

### Rationale
- The Staff and Admin portals filter by motorcycle model (e.g. `Yamaha NMAX 155`, `Honda Click 125i/150i`), category (e.g. `Brakes`, `Drivetrain`), brand, and physical warehouse rack/shelf location.
- B-tree indexing on text columns enables rapid equality and prefix matching, ensuring catalog lookup queries execute with sub-50ms latency even as catalog volume scales to thousands of items.

### Alternatives Considered
- Full-text search `tsvector` / GIN index: While valuable for freeform text search, the primary catalog filtering across POS and inventory uses discrete faceted category, model, brand, and exact SKU matches. A standard set of B-tree indexes delivers superior insert/update performance and minimal storage overhead for baseline catalog operations.

---

## 3. Row-Level Security (RLS) Policies & Role Boundaries

### Decision
Enable Row-Level Security on `public.products` with two distinct access policies:
1. **Public Read Access**:
   ```sql
   CREATE POLICY "Allow public read access on products"
     ON public.products
     FOR SELECT
     USING (true);
   ```
2. **Admin-Only Modification & Deletion**:
   ```sql
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

### Rationale
- Floor mechanics, POS counter terminals, and unauthenticated shop displays require unrestricted read capability to check prices and physical bin locations without requiring privileged credentials.
- Base acquisition costs (`cost`), markup pricing, and catalog SKU deletion represent sensitive business data; restricting modifications to verified `admin` profiles protects against unauthorized tampering.
- Wrapping `(select auth.uid())` inside a scalar subquery ensures Postgres evaluates the user ID once per query plan rather than executing row-by-row function overhead, complying with Supabase Postgres performance guidelines.

### Alternatives Considered
- Hiding `cost` via column-level security: PostgreSQL RLS applies row-by-row. Instead of complex multi-table views, base costs are protected from unauthorized mutations via RLS, while public/staff UI views only expose retail and wholesale pricing.

---

## 4. Idempotent Baseline Seeding Strategy (12 Canonical Parts)

### Decision
Implement `supabase/seed.sql` with `INSERT ... ON CONFLICT (sku) DO NOTHING` or `DO UPDATE` for the 12 canonical motorcycle parts defined in `mockup/app.js` and `lib/mock-data/products.ts`.

Canonical seed items:
1. `YAM-NMAX-BL01`: OEM Front Brake Pads (Yamaha NMAX 155, Rack A-01 / Shelf 2)
2. `RCB-NMAX-BP02`: RCB S-Series Ceramic Brake Pads (Yamaha NMAX 155, Rack A-01 / Shelf 3)
3. `HON-CLK-CVTB`: OEM Drive Belt Gates Bando (Honda Click 125i/150i, Rack B-04 / Shelf 1)
4. `HON-ADV-CVTB`: OEM Drive Belt Gates Bando ADV 160 (Honda ADV 160, Rack B-04 / Shelf 3)
5. `UMA-CLK-CVTR`: Uma Racing Kevlar High-Tension Belt (Honda Click 125i/150i, Rack B-04 / Shelf 2)
6. `MOT-3100-10W40`: Motul 3100 Gold 4T 10W40 1L (Universal, Aisle 1 / Shelf 1)
7. `SHL-ADV-AX7`: Shell Advance AX7 Synthetic 10W40 1L (Universal, Aisle 1 / Shelf 2)
8. `NGK-CPR8EA9`: NGK Nickel Spark Plug CPR8EA-9 (Honda Click 125i/150i, Rack C-02 / Shelf 1)
9. `DEN-IU24-IR`: Denso Iridium Power Spark Plug IU24 (Yamaha NMAX 155, Rack C-02 / Shelf 2)
10. `SUZ-RAI-CLUTCH`: Raider 150 Fi OEM Clutch Lining Set (Suzuki Raider 150 Fi, Rack D-01 / Shelf 3)
11. `KTR-RAI-CL6SP`: Kawahara 6-Spring Competition Clutch Plate (Suzuki Raider 150 Fi, Rack D-01 / Shelf 4)
12. `MIC-PILOT-ST`: Michelin Pilot Street 2 110/80-14 (Honda ADV 160, Tire Rack 2 / Floor)

### Rationale
- Using `ON CONFLICT (sku) DO NOTHING` prevents errors when `supabase db reset` or `supabase/seed.sql` is run repeatedly.
- Seeding the exact 12 parts ensures parity between unit tests, local development, and the reference mockups.

---

## 5. Prisma ORM Synchronization

### Decision
Add the `Product` model to `prisma/schema.prisma` mapped to `public.products`:
```prisma
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

### Rationale
- Running `npx prisma validate` ensures zero divergence between the PostgreSQL migration and Prisma ORM client.
- Maps database snake_case columns (`min_threshold`, `image_url`, `created_at`, `updated_at`) cleanly to camelCase TypeScript property names.

---

## 6. Server Component Hydration & Client Store Synchronization

### Decision
1. **Server Action**: Implement `getProductsAction()` in `lib/admin/product-actions.ts` querying products from Prisma / Supabase with a fallback to `MOCK_PRODUCTS` if the database is unprovisioned.
2. **Page Hydration**: In `app/admin/inventory/page.tsx`, execute `const initialProducts = await getProductsAction()` and pass `initialProducts` to `<InventoryCatalog initialProducts={initialProducts} />`.
3. **Store Hydration**: Extend `InventoryStore` with `hydrateProducts(products: Product[])` to populate client state on initial mount, allowing `CatalogFilterBar` and `CatalogTable` to deliver sub-100ms client search and filtering without initial loading flash.

### Rationale
- Conforms to Next.js App Router best practices by leveraging Server Components for data pre-fetching while preserving snappy client-side reactive filtering.
- Guarantees zero cumulative layout shift (CLS) on initial inventory screen render.
