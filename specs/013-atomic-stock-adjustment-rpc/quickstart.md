# Quickstart & Validation Guide: Supabase Atomic Stock Adjustment RPC & Immutable Audit Ledger

**Feature Branch**: `feat/SIAA-46-atomic-stock-adjustment-rpc`  
**Feature Spec**: [`specs/013-atomic-stock-adjustment-rpc/spec.md`](spec.md)  
**Contracts**: [`contracts/stock-adjustment-rpc.sql`](contracts/stock-adjustment-rpc.sql) | [`contracts/stock-adjustment-actions.ts`](contracts/stock-adjustment-actions.ts)  
**Jira Issue**: [SIAA-46](https://the-three-devsketeers.atlassian.net/browse/SIAA-46)  

---

## 1. Prerequisites

Ensure local environment dependencies are running and configured:
```bash
# 1. Verify Node.js and TypeScript environment
node -v
npm run build --dry-run # or npx tsc --noEmit

# 2. Verify Supabase CLI status (if using local Supabase)
npx supabase status
```

---

## 2. Validation Scenarios

### Scenario 1: Apply Migration & Verify Table Structure

Apply migration `supabase/migrations/20261011000000_stock_adjustment_rpc.sql` and verify that the table, indexes, and RPC function exist.

```sql
-- Verify table columns and constraints
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
  AND table_name = 'stock_adjustment_logs'
ORDER BY ordinal_position;

-- Verify B-Tree indexes
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename = 'stock_adjustment_logs';
```

**Expected Outcome**:
- Table `stock_adjustment_logs` contains columns: `id`, `sku`, `adjustment_type`, `quantity_delta`, `previous_stock`, `new_stock`, `reason`, `user_id`, `user_name`, `created_at`.
- Dedicated indexes exist on `sku`, `created_at`, and `user_id`.

---

### Scenario 2: Successful Atomic Inbound Restock via RPC

Execute an adjustment adding +10 units to product `YAM-NMAX-BL01`:

```sql
SELECT public.adjust_product_stock(
    p_sku := 'YAM-NMAX-BL01',
    p_type := 'Restock Inbound',
    p_delta := 10,
    p_reason := 'PO-8821 Received',
    p_user_name := 'Carlos Rodriguez (Admin)'
);
```

**Expected Outcome**:
```json
{
  "success": true,
  "sku": "YAM-NMAX-BL01",
  "previous_stock": 14,
  "new_stock": 24,
  "quantity_delta": 10,
  "adjustment_type": "Restock Inbound",
  "user_name": "Carlos Rodriguez (Admin)"
}
```
- In `public.products`, `stock` is updated to 24.
- In `public.stock_adjustment_logs`, an audit row is created recording the delta (+10), previous stock (14), and new stock (24).

---

### Scenario 3: Insufficient Stock Rejection & Complete Rollback

Attempt to deduct 100 units from a product with only 24 units on hand:

```sql
SELECT public.adjust_product_stock(
    p_sku := 'YAM-NMAX-BL01',
    p_type := 'Damaged Goods',
    p_delta := -100,
    p_reason := 'Water damage in warehouse'
);
```

**Expected Outcome**:
- PostgreSQL raises exception: `P0001: INSUFFICIENT_STOCK`.
- The product's on-hand stock remains strictly unchanged (24 units).
- No row is written to `public.stock_adjustment_logs`.

---

### Scenario 4: Immutability Verification (Denial of UPDATE / DELETE)

Attempt to tamper with or modify an existing audit log entry:

```sql
-- Attempt to update an existing audit log
UPDATE public.stock_adjustment_logs 
SET quantity_delta = 999 
WHERE sku = 'YAM-NMAX-BL01';

-- Attempt to delete an existing audit log
DELETE FROM public.stock_adjustment_logs 
WHERE sku = 'YAM-NMAX-BL01';
```

**Expected Outcome**:
- PostgreSQL aborts with exception: `55000: TAMPER_FORBIDDEN: stock_adjustment_logs is an immutable append-only ledger. Updates and deletions are strictly prohibited.`

---

### Scenario 5: Next.js Server Action & Optimistic UI Rollback

Run automated unit and integration tests covering the Server Action and UI state store:

```bash
# Run Vitest test suite
npm test -- lib/admin/product-actions.test.ts
```

**Test Flow**:
1. Call `adjustProductStockAction({ sku: 'YAM-NMAX-BL01', type: 'Damaged Goods', delta: -5, reason: 'Cracked casing' })`.
2. Confirm success returns typed object with new stock.
3. Call `adjustProductStockAction` with excessive negative delta (-999).
4. Confirm response `{ success: false, code: 'INSUFFICIENT_STOCK' }`.
5. Verify in `InventoryCatalog` that optimistic stock decrement immediately rolls back to previous stock and renders a danger toast alert.
