# Research & Architectural Decisions: Supabase New Product Registration Server Action & SKU Uniqueness

**Feature**: `014-supabase-new-product-registration` (Jira: `SIAA-47`)
**Status**: Completed

## 1. Context & Technical Constraints

The SWIFT Motorcycle Parts POS & Inventory Management System requires inventory registration to be immediately persisted to PostgreSQL via Supabase, with automatic calculation of tier pricing (Retail vs. Wholesale), atomic creation of initial inbound stock audit logs, and bulletproof SKU uniqueness guarantees.

### Key Constraints:
1. **Next.js 15 App Router Server Actions**: All database mutations originate from server actions in `lib/admin/product-actions.ts`. Must call `revalidatePath('/admin/inventory')` to purge cached catalog views.
2. **PostgreSQL & Supabase Client**: Production uses Supabase server client (`lib/supabase/server.ts`). Local or disconnected environments fall back to Prisma client (`lib/prisma.ts`).
3. **Case-Insensitive SKU Collision Guard**: Barcode scanners and user typists may submit SKUs with differing casing (e.g. `yam-nmax-bl01` vs `YAM-NMAX-BL01`). PostgreSQL standard UNIQUE constraints on `TEXT` columns are case-sensitive. A functional unique index `CREATE UNIQUE INDEX IF NOT EXISTS idx_products_sku_lower ON public.products(LOWER(sku));` is required.
4. **Audit Trail Accountability**: Products created with initial stock > 0 MUST record an entry in `public.stock_adjustment_logs` capturing `adjustment_type: 'restock'`, `quantity_delta: stock`, `previous_stock: 0`, and `new_stock: stock`.
5. **Zero Hardcoded Colors & SWIFT Design Tokens**: All modal and alert UI elements must strictly consume semantic classes (`bg-bg-surface`, `border-border`, `text-text-primary`, `bg-primary`, `text-success`, `bg-danger-light`).

---

## 2. Decision Log & Trade-Off Analysis

### Decision 1: Case-Insensitive SKU Uniqueness Strategy
- **Option A**: Application-level pre-check query (`SELECT 1 FROM products WHERE LOWER(sku) = LOWER($1)`).
  - *Cons*: Vulnerable to race conditions under concurrent submissions.
- **Option B**: PostgreSQL migration adding functional unique index `LOWER(sku)`.
  - *Pros*: Enforces atomicity and uniqueness at the database engine level (PostgreSQL Error Code `23505`).
  - *Selected*: **Option B + Application normalization**. Application normalizes input with `normalizeSku(sku)` and checks, while PostgreSQL migration guarantees zero database collision.

### Decision 2: Inbound Stock Audit Log Creation
- **Option A**: Trigger on `public.products` `AFTER INSERT`.
  - *Cons*: Triggers can obscure application logic and make custom user attribution harder.
- **Option B**: Server Action multi-step insertion / Supabase RPC or Prisma `$transaction`.
  - *Pros*: Explicit, traceable, supports user attribution from authenticated session context.
  - *Selected*: **Option B**. The server action creates the product and, if `stock > 0`, writes the `stock_adjustment_logs` record with attribution.

### Decision 3: Component Wiring & Naming Compatibility
- The Jira specification references `NewProductModal` triggered by the `+ Add Part` button.
- The existing codebase has `ProductRegistrationModal` in `components/admin/inventory/product-registration-modal.tsx`.
- *Decision*: Provide `NewProductModal` as an explicit named export alias of `ProductRegistrationModal` to support both interfaces cleanly while wiring `createProductAction()` in `InventoryCatalog` / `page.tsx`.

---

## 3. Performance & Security Considerations
- **Indexing**: `idx_products_sku_lower` ensures O(1) / <15ms lookup speed during uniqueness evaluation.
- **Role-Level Security (RLS)**: Inserting products requires authenticated admin privileges (`public.is_admin()`).
- **Validation**: Strict boundary validation prevents negative cost, zero-margin wholesale sales, or malformed shelf coordinates.
