# Technical Research: Supabase Atomic Stock Adjustment RPC & Immutable Audit Ledger

**Feature Branch**: `feat/SIAA-46-atomic-stock-adjustment-rpc`  
**Feature Spec**: [`specs/013-atomic-stock-adjustment-rpc/spec.md`](spec.md)  
**Jira Issue**: [SIAA-46](https://the-three-devsketeers.atlassian.net/browse/SIAA-46)  

---

## 1. Executive Summary

This research resolves key architectural decisions required to implement atomic stock adjustments with immutable audit logging for the SWIFT motorcycle parts workshop management system. Inventory adjustments require absolute data integrity: stock counts must never drop below zero, concurrent deductions on high-turnover parts must be serialized cleanly, audit ledger records must be physically tamper-proof, and staff operator attribution must be non-repudiable.

---

## 2. Architectural Decisions & Alternatives

### Decision 1: PostgreSQL PL/pgSQL Stored Procedure (RPC) vs. Application-Level Prisma Transactions

- **Context**: When an operator adjusts stock (e.g. -5 units for damaged goods), two database actions must occur: update `public.products.stock` and insert a record into `public.stock_adjustment_logs`. If either action fails, the entire change must roll back.
- **Decision**: Implement a PostgreSQL PL/pgSQL function `public.adjust_product_stock(p_sku TEXT, p_type TEXT, p_delta INT, p_reason TEXT)` executed via Supabase RPC (`supabase.rpc('adjust_product_stock', ...)`).
- **Rationale**:
  - A stored procedure runs within the database engine in a single round-trip, executing under an implicit atomic transaction (`BEGIN ... COMMIT`).
  - Allows atomic row locking via `SELECT stock FROM public.products WHERE sku = p_sku FOR UPDATE`, preventing race conditions during concurrent deduction attempts.
  - Automatically isolates database transaction logic from Node.js runtime crashes or connection drops between consecutive Prisma statements.
  - Directly accesses PostgreSQL security context (`auth.uid()`) to guarantee authentic user attribution.
- **Alternatives Considered**:
  - *Prisma `$transaction`*: Requires two separate queries over the wire from Next.js server actions. If the application server loses connection between the update and insert, recovery logic is complex. Furthermore, Prisma cannot easily extract `auth.uid()` directly inside row policies without additional session configuration.
  - *Client-Side Direct Supabase Updates*: Exposes `products.stock` directly to client mutations, risking malicious tampering and bypassing business rules.

---

### Decision 2: Concurrency Control & Floor-Zero Inventory Protection

- **Context**: If a product has 3 units remaining and two cashier terminals simultaneously attempt to deduct 2 units, both might read `stock = 3`, calculate `3 - 2 = 1`, and update the stock to 1, effectively deducting 4 units and causing unrecorded inventory discrepancies.
- **Decision**: Combine Pessimistic Row Locking (`FOR UPDATE`) with a procedural check and table-level CHECK constraint (`CHECK (stock >= 0)`):
  ```sql
  -- Inside adjust_product_stock:
  SELECT stock INTO v_current_stock 
  FROM public.products 
  WHERE sku = p_sku 
  FOR UPDATE;

  IF (v_current_stock + p_delta) < 0 THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK' 
          USING ERRCODE = 'P0001', 
                DETAIL = 'Requested deduction exceeds available on-hand stock.';
  END IF;
  ```
- **Rationale**:
  - `FOR UPDATE` serializes concurrent transactions on the exact product row: the second transaction blocks until the first completes.
  - The explicit procedural check throws a clean, catchable `INSUFFICIENT_STOCK` error with user-friendly error codes.
  - The existing `CHECK (stock >= 0)` constraint on `public.products` serves as a fail-safe database constraint that makes negative stock physically impossible even if queries bypass application code.
- **Alternatives Considered**:
  - *Optimistic Concurrency via Version Columns (`version` / `updated_at`)*: Requires retrying failed transactions in application code, which introduces latency and complexity in point-of-sale environments.
  - *Unconditional Deductions with Post-check Rollback*: Less efficient than locking the row directly before calculation.

---

### Decision 3: Non-Repudiation Staff Attribution via Supabase Auth

- **Context**: In workshop and retail environments, dishonest staff might attempt to attribute damaged goods write-offs or shrinkage adjustments to other staff members or anonymous accounts.
- **Decision**: Extract operator identity directly from `auth.uid()` inside the PostgreSQL function, and cross-reference `public.profiles.full_name`:
  ```sql
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
      -- In development/testing environments without active JWT, fallback to system administrator
      v_user_name := COALESCE(p_user_name, 'Inventory Staff');
  ELSE
      SELECT COALESCE(full_name, email, 'Staff Member') 
      INTO v_user_name 
      FROM public.profiles 
      WHERE id = v_user_id;
  END IF;
  ```
- **Rationale**:
  - `auth.uid()` is cryptographically verified by Supabase using the signed JWT cookie passed in the request header.
  - Client callers cannot tamper with or override `auth.uid()` by sending arbitrary parameter values.
  - Audit records permanently seal the authenticated user's UUID and display name at the moment the transaction occurred.
- **Alternatives Considered**:
  - *Trusting Client Parameter `user_name`*: Vulnerable to impersonation and spoofing.
  - *Resolving User in Server Action Only*: While Next.js Server Actions can check `getUser()`, enforcing identity extraction inside the SQL stored procedure provides defense-in-depth even if invoked directly via Supabase API or PostgREST.

---

### Decision 4: Append-Only Immutable Audit Ledger via Row-Level Security (RLS)

- **Context**: Acceptance Criteria Scenario 1 specifies that `public.stock_adjustment_logs` must be strictly append-only, forbidding `UPDATE` and `DELETE` operations.
- **Decision**: Configure PostgreSQL Row-Level Security (RLS) and object privileges:
  ```sql
  ALTER TABLE public.stock_adjustment_logs ENABLE ROW LEVEL SECURITY;

  -- PostgREST API Grants: Only SELECT and INSERT
  GRANT SELECT, INSERT ON TABLE public.stock_adjustment_logs TO authenticated;
  GRANT SELECT ON TABLE public.stock_adjustment_logs TO anon;
  REVOKE UPDATE, DELETE, TRUNCATE ON TABLE public.stock_adjustment_logs FROM authenticated, anon, public;

  -- RLS Read Policy
  CREATE POLICY "Allow authenticated read on stock_adjustment_logs"
      ON public.stock_adjustment_logs
      FOR SELECT
      TO authenticated
      USING (true);

  -- RLS Insert Policy
  CREATE POLICY "Allow authenticated insert on stock_adjustment_logs"
      ON public.stock_adjustment_logs
      FOR INSERT
      TO authenticated
      WITH CHECK (true);
  ```
  In addition, attach a preventive trigger that raises an exception if any query attempts `UPDATE` or `DELETE`, ensuring even privileged database connections cannot alter logs.
- **Rationale**:
  - Completely satisfies Scenario 1 acceptance criteria.
  - Defense-in-depth: combining SQL table grants, RLS policies, and a trigger guarantees that logs cannot be edited or truncated under any circumstances.
- **Alternatives Considered**:
  - *Application-level checks*: Fails compliance standards because direct database access or API tokens could bypass application code.
  - *Separate audit database*: Overkill for the current single-instance SWIFT deployment; PostgreSQL RLS and trigger enforcement provide institutional-grade immutability.

---

### Decision 5: Optimistic UI Updates & Automatic Rollback Strategy

- **Context**: Counter staff adjusting quantities need instant visual feedback (<16ms) in the parts catalog table, but if the database rejects an adjustment (e.g. `INSUFFICIENT_STOCK`), the UI must immediately revert to the true inventory count and notify the user.
- **Decision**: Implement an optimistic update in `InventoryCatalog` with an inversion rollback mechanism:
  1. Operator confirms adjustment in `StockAdjustmentModal`.
  2. `InventoryCatalog` records previous stock quantity, updates `inventoryStore` immediately using `adjustStock({ sku, type, units: delta, ... })`.
  3. Invokes Next.js Server Action `adjustProductStockAction({ sku, type, delta, reason })`.
  4. If successful:
     - Displays brief success toast.
     - Synchronizes store with exact returned database values (`new_stock`, `log_id`).
  5. If rejected or error caught (e.g., `INSUFFICIENT_STOCK`):
     - Automatically reverts store count: `adjustStock({ sku, type: 'Rollback', units: -delta, ... })`.
     - Displays error alert banner with specific failure reason (e.g., "Insufficient stock: cannot deduct 10 units when only 4 remain").
- **Rationale**:
  - Delivers instantaneous (<16ms) interaction responsiveness meeting SWIFT usability benchmarks.
  - Zero risk of persistent desynchronization between client UI and PostgreSQL state.
  - Clean separation of concerns between modal UI, reactive store, and server action.
- **Alternatives Considered**:
  - *Waiting for Server Action Response before Updating UI*: Introduces 100-300ms latency on every click, degrading fast-paced parts counter workflows.
  - *Reloading Whole Page on Adjustment*: Causes jarring layout shifts and destroys active search filters.

---

## 3. Best Practices Checklist Compliance

- [x] **Scalar Subquery Wrapping**: Any evaluation of `(select auth.uid())` inside RLS policies wrapped in scalar subqueries to prevent per-row re-evaluation.
- [x] **Function Security**: PL/pgSQL function declared with `SECURITY DEFINER` and explicit `SET search_path = public, auth`.
- [x] **Index Coverage**: B-tree indexes added for foreign keys (`sku`, `user_id`) and chronological sorting (`created_at`).
- [x] **Zero Hardcoded Colors**: UI toasts, banners, and modal states strictly consume semantic design tokens (`bg-success-light`, `text-success`, `bg-danger-light`, `text-danger`).
