# Architecture & Stack Research: Supabase Atomic Checkout RPC with Stock Decrements

**Feature**: SIAA-51 (STORY-3.8)  
**Spec Directory**: `specs/019-pos-checkout-atomic-rpc/`  

---

## 1. Concurrency Control & Row-Level Locking Architecture

### 1.1 The Multi-Terminal Race Condition
In a motorcycle parts store with high walk-in volume, two cashiers at different terminals can scan the last available piece of an exhaust gasket (`stock = 1`) simultaneously.
- If inventory checking and updating happen in separate statements outside an atomic stored procedure, both transactions read `stock = 1` and both succeed, driving `stock` to `-1` (overselling).
- Using optimistic concurrency (`UPDATE ... WHERE stock >= qty`) can detect conflicts, but does not provide serialized atomic batch validation across multi-item baskets containing 10+ items.

### 1.2 Pessimistic Row Locking (`FOR UPDATE`) in PostgreSQL
Within `public.process_pos_checkout`, before decrementing each physical part, we execute:
```sql
SELECT stock INTO v_current_stock
FROM public.products
WHERE sku = v_item_sku
FOR UPDATE;
```
This places an exclusive row-level lock on the product row for the duration of the transaction.
- Concurrent checkout attempts on the same SKU queue behind the lock.
- Once the first transaction commits (decrementing stock), the second transaction immediately reads the updated stock, detects `v_new_stock < 0`, and aborts cleanly.
- To prevent deadlocks when transactions purchase the same set of items in different orders, items are sorted deterministically by SKU before acquiring locks:
  ```sql
  FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items) ... ORDER BY item_sku_or_code ASC
  ```

---

## 2. PostgreSQL Stored Procedure Interface & Data Contract

### 2.1 Stored Procedure Signature
```sql
CREATE OR REPLACE FUNCTION public.process_pos_checkout(
    p_transaction JSONB,
    p_items JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth;
```

### 2.2 Security Definer & Non-Repudiation
- Marked `SECURITY DEFINER` to allow atomic modifications to `public.products`, `public.stock_adjustment_logs`, `public.transactions`, and `public.transaction_items` even if individual RLS restricts direct client updates on `products`.
- Secures `search_path = public, auth` to mitigate search-path injection vulnerabilities.
- Non-repudiation: Extracts `auth.uid()` via `v_cashier_id := auth.uid()`. If absent (e.g. API or test runner), falls back to `p_transaction->>'cashier_id'`.

### 2.3 Exception & Error Code Standards
- **Insufficient Stock**:
  ```sql
  RAISE EXCEPTION 'INSUFFICIENT_STOCK: %', v_item.item_sku_or_code
      USING ERRCODE = 'P0001',
            DETAIL = format('Part %s has only %s on-hand, but %s was requested.', v_item.item_sku_or_code, v_current_stock, v_item.quantity);
  ```
- **Product Not Found**:
  ```sql
  RAISE EXCEPTION 'PRODUCT_NOT_FOUND: %', v_item.item_sku_or_code
      USING ERRCODE = 'P0002';
  ```
- **Empty Items Basket**:
  ```sql
  RAISE EXCEPTION 'EMPTY_ITEMS_PAYLOAD'
      USING ERRCODE = 'P0003';
  ```

---

## 3. Audit Ledger Synchronization (`public.stock_adjustment_logs`)

Whenever a physical item (`item_type = 'part'`) is checked out:
- `quantity_delta` is recorded as `-v_item.quantity` (strictly negative).
- `adjustment_type` is recorded as `'POS Sale'`.
- `previous_stock` and `new_stock` reflect the exact before-and-after values.
- `reason` references the unique receipt: `'POS Sale Receipt: ' || v_receipt_number`.
- `user_id` and `user_name` are populated from the resolved cashier credentials.

Labor services (`item_type = 'service'`) do not generate stock adjustment entries, preserving ledger purity.

---

## 4. Next.js App Router & Server Action Architecture

### 4.1 Server Action Pattern
- Location: `lib/pos/actions.ts`
- Name: `processCheckoutAction(payload: CheckoutPayload): Promise<CheckoutResult>`
- Execution flow:
  1. Validates payload using Zod schema (`checkoutPayloadSchema`).
  2. Resolves Supabase server client (`createClient()`).
  3. Invokes RPC `supabase.rpc('process_pos_checkout', { p_transaction, p_items })`.
  4. Parses result or handles PostgreSQL exception with error pattern matching.
  5. If database connection fails, falls back to memory mock engine for local testing.

---

## 5. UI Integration & SWIFT Design Token Adherence

- Staff POS (`app/staff/pos/page.tsx`) and Admin POS (`app/admin/pos/page.tsx`):
  - Replace existing naive loop with `processCheckoutAction`.
  - Add toast alert using semantic SWIFT design tokens:
    - Background: `bg-danger` / `bg-danger-light`
    - Text: `text-danger`
    - Border: `border-danger`
    - Zero arbitrary hardcoded hex codes.
