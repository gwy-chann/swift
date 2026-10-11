# Research & Technical Architecture: Supabase POS Transactions & Hybrid Line Items

**Feature Branch**: `feat/SIAA-50-pos-transactions-hybrid-line-items`  
**Jira Issue**: [SIAA-50](https://the-three-devsketeers.atlassian.net/browse/SIAA-50)  

---

## 1. Technical Stack & Architectural Decisions

### A. Dual Table Model: Master-Detail Architecture
1. **`public.transactions`**: Represents the master checkout invoice record.
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `receipt_number TEXT UNIQUE NOT NULL` (e.g., `'TX-1041'`, formatted for thermal printers and search queries)
   - `cashier_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL`
   - `cashier_name TEXT NOT NULL`
   - `pricing_mode TEXT NOT NULL CHECK (pricing_mode IN ('retail', 'wholesale'))`
   - `subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)`
   - `discount_type TEXT NULL CHECK (discount_type IN ('none', 'senior', 'pwd', 'vip'))`
   - `discount_rate NUMERIC(5, 4) NOT NULL DEFAULT 0.0000 CHECK (discount_rate >= 0)`
   - `discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (discount_amount >= 0)`
   - `total_due NUMERIC(10, 2) NOT NULL CHECK (total_due >= 0)`
   - `cash_tendered NUMERIC(10, 2) NOT NULL CHECK (cash_tendered >= total_due)`
   - `change_due NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (change_due >= 0)`
   - `payment_method TEXT NOT NULL DEFAULT 'Cash' CHECK (payment_method IN ('Cash', 'GCash', 'Card', 'Maya'))`
   - `created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())`

2. **`public.transaction_items`**: Itemized hybrid line items.
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE RESTRICT`
   - `item_type TEXT NOT NULL CHECK (item_type IN ('part', 'service'))`
   - `item_sku_or_code TEXT NOT NULL`
   - `item_name TEXT NOT NULL`
   - `unit_price NUMERIC(10, 2) NOT NULL CHECK (unit_price >= 0)`
   - `quantity INT NOT NULL CHECK (quantity > 0)`
   - `subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0)`
   - `bay TEXT NULL` (assigned service bay if `item_type = 'service'`)
   - `shelf_location TEXT NULL` (physical rack/shelf if `item_type = 'part'`)

### B. Immutable Financial Ledger Guarantee
To guarantee 100% audit integrity and prevent tampering or accidental alterations:
1. **Row-Level Security (RLS)**:
   - `SELECT` is open to authenticated staff and authorized roles.
   - `INSERT` is open to authenticated cashiers / staff.
   - No `UPDATE` or `DELETE` policies exist.
2. **PostgreSQL Immutability Trigger**:
   - `trg_prevent_transaction_modifications` on `public.transactions` `BEFORE UPDATE OR DELETE`.
   - `trg_prevent_transaction_item_modifications` on `public.transaction_items` `BEFORE UPDATE OR DELETE`.
   - If an `UPDATE` or `DELETE` query is sent (even with superuser or bypass), the trigger raises an exception:
     `'Transactions and line items are immutable financial records and cannot be updated or deleted.'`

### C. Performance & Indexing Strategy
- `idx_transactions_receipt_number` on `public.transactions(receipt_number)` for sub-millisecond receipt reprint & lookup.
- `idx_transactions_created_at` on `public.transactions(created_at DESC)` for 7-day revenue analytics, daily closure reports, and auditor timeline browsing.
- `idx_transactions_cashier_id` on `public.transactions(cashier_id)` for cashier shift reconciliation.
- `idx_transaction_items_tx_id` on `public.transaction_items(transaction_id)` for lightning-fast join queries.
- `idx_transaction_items_item_type` on `public.transaction_items(item_type)` for parts vs. labor revenue partition analysis.

### D. Prisma ORM Synchronization (`prisma/schema.prisma`)
- Declare `model Transaction` and `model TransactionItem` with exact field mappings, relations, and table mappings (`@@map("transactions")`, `@@map("transaction_items")`).
- Run `npx prisma validate` to guarantee type definitions compile.

### E. TypeScript & Zod Validation (`lib/types/transaction.ts`, `contracts/`)
- Align TypeScript interfaces with `public.transactions` and `public.transaction_items`.
- Expose Zod schemas for client-server transaction payloads.

---

## 2. Invariants & Business Rules
1. **Immutability Invariant**: Transactions once created cannot be updated or deleted.
2. **Line Item Subtotal Invariant**: `subtotal = unit_price * quantity`.
3. **Receipt Total Invariant**: `total_due = max(0, subtotal - discount_amount)`.
4. **Tender Invariant**: `cash_tendered >= total_due` and `change_due = cash_tendered - total_due`.
5. **Referential Integrity**: Line items are permanently linked to their master transaction (`ON DELETE RESTRICT`).
