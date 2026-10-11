# Quickstart & Verification Guide: Motorcycle Models & Fitment Compatibility Matrix

**Feature**: `021-motomatcher-compatibility-schema-seed`  
**Jira Ticket**: [SIAA-53](https://the-three-devsketeers.atlassian.net/browse/SIAA-53) (STORY-4.6)  

---

## 1. Schema Migration & Database Reset

Run the Supabase database migration to establish tables, indexes, and RLS policies:

```bash
# Execute migration file directly or run Supabase reset
npx supabase db reset
```

Or apply the migration manually to PostgreSQL:

```bash
psql -U postgres -d postgres -f supabase/migrations/20261011000000_motomatcher_compatibility.sql
psql -U postgres -d postgres -f supabase/seed.sql
```

---

## 2. Prisma ORM Validation

Validate that the Prisma ORM schema matches PostgreSQL definitions:

```bash
npx prisma validate
```

Expected output:
```text
The schema at prisma/schema.prisma is valid 🚀
```

---

## 3. Automated Verification Tests

Run the dedicated test suite for MotoMatcher compatibility schema, types, and model fetching actions:

```bash
npm test -- lib/admin/__tests__/motomatcher-actions.test.ts
```

---

## 4. Manual Verification Walkthrough

1. **Verify Database Models**:
   Query `public.motorcycle_models`:
   ```sql
   SELECT id, make, model, displacement_cc, year_start, year_end, category FROM public.motorcycle_models;
   ```
   *Expected*: 5 rows returned (Yamaha NMAX 155, Yamaha Aerox 155, Honda Click 125i/150i, Honda ADV 160, Suzuki Raider 150 Fi).

2. **Verify Database Fitment Records**:
   Query `public.product_fitments`:
   ```sql
   SELECT pf.id, p.sku, m.make, m.model, pf.fitment_type, pf.year_range, pf.notes
   FROM public.product_fitments pf
   JOIN public.products p ON pf.product_id = p.id
   JOIN public.motorcycle_models m ON pf.model_id = m.id;
   ```
   *Expected*: 12 compatibility rows returned linking products to bikes with OEM / Aftermarket / Universal tags.

3. **Verify SSR Hydration**:
   Navigate to `http://localhost:3000/staff/compat`.
   Verify the Make and Model dropdowns display live models from the database/action with instant fitment search.
