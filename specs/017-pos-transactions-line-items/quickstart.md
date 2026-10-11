# Quickstart & Verification Guide: Supabase POS Transactions & Hybrid Line Items

**Feature Branch**: `feat/SIAA-50-pos-transactions-hybrid-line-items`  
**Jira Issue**: [SIAA-50](https://the-three-devsketeers.atlassian.net/browse/SIAA-50)  

---

## 1. Migration & Prisma Verification

### Step 1: Validate Prisma Schema
Run the Prisma schema validation check inside the worktree:
```bash
npx prisma validate
```
Expected output: `The schema at prisma/schema.prisma is valid`

### Step 2: Run Unit & Integration Tests
Run Vitest on the transaction schema and invariant tests:
```bash
npm test -- lib/pos/__tests__/transactions-schema.test.ts
```
Expected output: All test cases pass covering Zod contracts, financial invariants, tender rules, and immutable ledger expectations.

### Step 3: Run Typecheck & Linter
```bash
npm run typecheck
npm run lint
```
Expected output: Zero type errors, zero lint errors.

---

## 2. Database Schema & Audit Ledger Inspection

### Step 1: Transactions Table Verification
When applied to Supabase PostgreSQL, check:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transactions';
```
Ensure all required columns (`receipt_number`, `pricing_mode`, `subtotal`, `discount_rate`, `total_due`, `cash_tendered`, `change_due`, `payment_method`) exist with proper constraints.

### Step 2: Line Items Table Verification
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'transaction_items';
```
Ensure columns (`item_type`, `item_sku_or_code`, `unit_price`, `quantity`, `subtotal`, `bay`, `shelf_location`) exist.

### Step 3: Immutability Trigger Test
Execute an UPDATE or DELETE attempt in SQL:
```sql
UPDATE public.transactions SET subtotal = 999 WHERE receipt_number = 'TX-1041';
```
Expected result: PostgreSQL raises error:
`ERROR: Transactions and line items are immutable financial records and cannot be updated or deleted.`
