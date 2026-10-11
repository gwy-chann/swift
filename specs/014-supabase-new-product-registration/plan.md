# Implementation Plan: Supabase New Product Registration Server Action & SKU Uniqueness

**Feature**: `014-supabase-new-product-registration` (Jira: `SIAA-47`)
**Status**: Ready for Implementation

## 1. Architectural Boundaries & System Flow

```
+---------------------------------------------------------------------------------------+
| UI Layer                                                                              |
|  - app/admin/inventory/page.tsx: Page shell with "+ Add Part" button                  |
|  - components/admin/inventory/product-registration-modal.tsx: Form modal with markups |
|  - components/admin/inventory/inventory-catalog.tsx: Connects modal to server action  |
|  - lib/store/inventory-store.ts: Updates active state, prepending new product         |
+---------------------------------------------------------------------------------------+
                                        | (calls createProductAction)
                                        v
+---------------------------------------------------------------------------------------+
| Server Actions Layer                                                                  |
|  - lib/admin/product-actions.ts: createProductAction(payload)                         |
|     * Validates input fields and normalizes SKU                                       |
|     * Checks case-insensitive duplicate collision (LOWER(sku))                        |
|     * Computes wholesale (+18%) & retail (+35%/+40%) markup defaults if missing       |
|     * Inserts into public.products                                                    |
|     * If initial stock > 0, atomically inserts into public.stock_adjustment_logs      |
|     * Calls revalidatePath('/admin/inventory')                                        |
+---------------------------------------------------------------------------------------+
                                        | (queries & mutations)
                                        v
+---------------------------------------------------------------------------------------+
| Database & Persistence Layer                                                          |
|  - supabase/migrations/20261012000000_product_sku_unique_ci.sql:                      |
|     * CREATE UNIQUE INDEX idx_products_sku_lower ON public.products (LOWER(sku));     |
|  - lib/supabase/server.ts: Authenticated Supabase client                              |
|  - lib/prisma.ts: Prisma client fallback transaction                                  |
+---------------------------------------------------------------------------------------+
```

---

## 2. Component & Function Breakdown

### A. Database Migration
- File: `supabase/migrations/20261012000000_product_sku_unique_ci.sql`
- Content:
  - Add functional unique index on `LOWER(sku)` for `public.products`.
  - Ensures database constraint rejects any duplicate SKU regardless of casing.

### B. Validation & Types
- File: `lib/admin/product-actions.ts` / `lib/inventory/product-registration.ts`
- Define `CreateProductPayload` and `CreateProductResult`.
- Ensure `normalizeSku` trims and uppercases input.
- Validate non-negative cost, positive prices, shelf location, integer quantities.

### C. Server Action: `createProductAction`
- File: `lib/admin/product-actions.ts`
- Query Supabase / Prisma for `LOWER(sku) = LOWER(payload.sku)`.
- If match exists -> return `{ success: false, error: 'SKU already exists in the catalog.', code: 'SKU_ALREADY_EXISTS' }`.
- Insert into `products`:
  - `sku`, `name`, `category`, `brand`, `model`, `cost`, `wholesale`, `retail`, `stock`, `min_threshold`, `location`, `oem`, `image_url`, `description`.
- If `stock > 0`:
  - Insert into `stock_adjustment_logs`:
    - `sku`, `adjustment_type: 'restock'`, `quantity_delta: stock`, `previous_stock: 0`, `new_stock: stock`, `reason: 'Initial inventory registration'`, `user_name`.
- Revalidate:
  - `revalidatePath('/admin/inventory')`.
- Return `{ success: true, product }`.

### D. UI Component Wiring
- File: `components/admin/inventory/product-registration-modal.tsx`:
  - Add named export `NewProductModal = ProductRegistrationModal` to guarantee both names can be imported.
  - Wire submission to call server action with loading spinner state and error alert displaying `SKU_ALREADY_EXISTS`.
- File: `components/admin/inventory/inventory-catalog.tsx`:
  - Update `handleRegisterProduct` to invoke `createProductAction`.
  - On success: Prepend product to `useInventoryStore`, close modal, show success toast.
  - On error: Display error toast or alert within the modal.
- File: `app/admin/inventory/page.tsx`:
  - Ensure header and catalog allow opening `NewProductModal`.

---

## 3. Test & Verification Plan

1. **Unit & Integration Tests**:
   - `__tests__/lib/admin/product-actions.test.ts`:
     - Test duplicate SKU collision rejection (case-insensitive) returning `SKU_ALREADY_EXISTS`.
     - Test successful product creation with markup calculation.
     - Test initial inbound stock log written when stock > 0.
     - Test no stock log written when stock = 0.
     - Test invalid payload validation rejection.
2. **Typecheck & Lint**:
   - `npm run typecheck` (`tsc --noEmit`).
   - `npm run lint`.
   - `npm test`.
