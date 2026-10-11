# Quickstart & Verification Guide: Master Parts Catalog Schema, Indexes, RLS & Seed Data

**Feature**: [`specs/012-parts-catalog-schema-seed/spec.md`](spec.md)  
**Ticket**: [SIAA-45](https://the-three-devsketeers.atlassian.net/browse/SIAA-45)  
**Date**: 2026-10-11  

---

## 1. Prerequisites & Environment Setup

Verify local database connectivity and environment variables:

```bash
# Check database container or Supabase status
npx supabase status

# Ensure environment variables are loaded
cat .env.local | grep SUPABASE
```

---

## 2. Execute Database Migration

Apply the new inventory products migration:

```bash
# Apply pending migrations
npx supabase db push

# Alternatively, run a fresh migration reset
npx supabase db reset
```

**Expected Outcome**:
- Table `public.products` is created with all 17 columns and constraints.
- Five B-tree indexes (`idx_products_sku`, `idx_products_category`, `idx_products_brand`, `idx_products_model`, `idx_products_location`) are generated.
- Trigger `trigger_products_updated_at` is attached.
- RLS is enabled on `public.products`.

---

## 3. Verify Baseline 12-Item Seed Population

Inspect that canonical seed parts are populated correctly:

```sql
SELECT sku, name, category, model, wholesale, retail, location, stock, min_threshold
FROM public.products
ORDER BY sku;
```

**Expected Outcome**:
- Returns 12 rows corresponding to canonical motorcycle parts.
- E.g., `YAM-NMAX-BL01` at `Rack A-01 / Shelf 2`, `MOT-3100-10W40` at `Aisle 1 / Shelf 1`.
- Running the seed script twice causes 0 duplicate key errors due to `ON CONFLICT (sku) DO NOTHING`.

---

## 4. Verify Row-Level Security Access Control

### Scenario A: Public / Floor Terminal Read
```sql
-- Simulate unauthenticated / anon read
SET ROLE anon;
SELECT count(*) FROM public.products;
-- Expected: 12 rows returned successfully.
```

### Scenario B: Non-Admin Staff Write Rejection
```sql
-- Simulate non-admin staff update
SET ROLE authenticated;
-- Assume profile role is 'staff' or 'cashier'
UPDATE public.products SET cost = 100 WHERE sku = 'YAM-NMAX-BL01';
-- Expected: ERROR / 0 rows updated due to RLS check failure.
```

### Scenario C: Admin Full Access
```sql
-- Simulate admin update
SET ROLE authenticated;
-- With admin profile identity
UPDATE public.products SET stock = 10 WHERE sku = 'YAM-NMAX-BL01';
-- Expected: Update succeeds.
RESET ROLE;
```

---

## 5. Verify Prisma ORM Schema Alignment

Validate the Prisma schema and generate client types:

```bash
# Validate schema against Prisma definitions
npx prisma validate

# Generate Prisma client
npx prisma generate
```

**Expected Outcome**:
- `Validation passed with 0 errors.`
- `Product` model types are emitted into `@prisma/client`.

---

## 6. Verify Server Component Hydration & Store Performance

Start the Next.js development server and verify the Admin Inventory page:

```bash
npm run build # or npm run dev
```

1. Navigate to `http://localhost:3000/admin/inventory`.
2. Inspect network tab: Initial products are pre-rendered into HTML from server action `getProductsAction()`.
3. Type in `CatalogFilterBar` search input: Filter queries execute entirely in-memory under 100ms with 0 page reload.
