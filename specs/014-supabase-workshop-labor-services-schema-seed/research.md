# Research & Technical Architecture: Supabase Workshop Labor Services

**Feature Branch**: `feat/SIAA-49-supabase-labor-services-schema-rates`  
**Jira Issue**: [SIAA-49](https://the-three-devsketeers.atlassian.net/browse/SIAA-49)  

---

## 1. Technical Stack & Architectural Decisions

### A. PostgreSQL Schema Design for `labor_services`
- **Identifier**: `id UUID PRIMARY KEY DEFAULT gen_random_uuid()` aligns with Supabase and Prisma UUID conventions.
- **Service Code**: `code TEXT UNIQUE NOT NULL` (e.g., `SRV-OIL-01`, `SRV-CVT-01`) acts as a human-readable catalog identifier and foreign key anchor for future repair orders or POS line-items.
- **Bay Assignment**: `bay TEXT NOT NULL` designates physical repair bays (`Bay 1 / Quick Bay`, `Bay 2 / Scooter Bay`, etc.).
- **Rate Type**: `rate NUMERIC(10, 2) NOT NULL CHECK (rate >= 0)` avoids floating-point roundoff issues while supporting exact Philippine Peso denominations.
- **Duration**: `duration TEXT NOT NULL` records typical turnaround times (`15 mins`, `45 mins`, `90 mins`).
- **Active Flag**: `active BOOLEAN NOT NULL DEFAULT true` enables soft-archiving without breaking referential integrity in completed historical invoices.

### B. Index Strategy
- `idx_labor_services_code` (B-Tree on `code`): O(log n) lookups for point-of-sale barcode/code entry.
- `idx_labor_services_active` (B-Tree on `active`): Rapid index-only scans for catalog queries filtering currently offered services.

### C. Row-Level Security (RLS) Policy Architecture
- Following the precedent in `supabase/migrations/20261010000000_inventory_products.sql`:
  - `Allow public read access on labor_services`: Permitted for `SELECT` using `(true)` to support fast counter POS terminals and guest kiosks.
  - `Allow admin full access on labor_services`: Restricted to `authenticated` users with `public.is_admin() = true` for `INSERT`, `UPDATE`, and `DELETE`.

### D. Server Action Architecture (`lib/pos/actions.ts`)
- In alignment with `lib/admin/product-actions.ts`:
  - Uses `createClient()` from `@/lib/supabase/server` or fallback logic.
  - If Supabase environment is unavailable or query fails, falls back gracefully to `MOCK_SERVICES` from `lib/mock-data/services.ts`.
  - Serializes `rate` cleanly as standard JavaScript `number` for consumption by the UI and cart store.

### E. Fast-Lane POS Terminal Integration (`app/staff/pos/page.tsx`)
- Currently, `app/staff/pos/page.tsx` defines a hardcoded array of 2 dummy items.
- We will replace the hardcoded array by hydrating labor services via `getLaborServicesAction()`.
- Labor service items are represented in the POS cart either as specialized service items or adapted `Product`-compatible items with `category: "SERVICES"`, preserving flat-rate price stability across retail vs. wholesale pricing toggles.

---

## 2. Invariants & Business Rules
1. **Flat Rate Invariance**: Unlike physical products whose prices shift dynamically based on Wholesale vs. Retail mode, labor service flat rates remain invariant.
2. **Infinite Stock / No Inventory Depletion**: Workshop services are not inventory-tracked stock items. They have infinite availability (`stock: 999` or non-tracked).
3. **Idempotent Migration & Seeding**: Running migrations or seed scripts multiple times must never duplicate rows or trigger constraint crashes.
