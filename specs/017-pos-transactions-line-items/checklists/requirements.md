# Requirements Quality Checklist: Supabase POS Transactions & Hybrid Line Items

**Feature Branch**: `feat/SIAA-50-pos-transactions-hybrid-line-items`  
**Jira Issue**: [SIAA-50](https://the-three-devsketeers.atlassian.net/browse/SIAA-50)  

---

## 1. Specification Completeness
- [x] Clear User Stories written in Mike Cohn format with rationale and priority.
- [x] Gherkin acceptance criteria covering Transactions Table Schema, Hybrid Line Items Table, Append-Only Financial Ledger RLS & Triggers, Prisma sync, and Historical Seed Data.
- [x] Explicit mapping to upstream Epic [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) and downstream blockers ([SIAA-51](https://the-three-devsketeers.atlassian.net/browse/SIAA-51) Atomic Checkout RPC, [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) 7-Day Revenue Trend, [SIAA-67](https://the-three-devsketeers.atlassian.net/browse/SIAA-67), [SIAA-68](https://the-three-devsketeers.atlassian.net/browse/SIAA-68)).

## 2. Architectural & Technical Integrity
- [x] Migration SQL file follows timestamped format: `20261014000000_pos_transactions.sql`.
- [x] Constraints enforce non-negative monetary figures (`subtotal >= 0`, `discount_rate >= 0`, `discount_amount >= 0`, `total_due >= 0`, `cash_tendered >= total_due`, `change_due >= 0`, `unit_price >= 0`, `quantity > 0`).
- [x] Check constraints restrict enum domains (`pricing_mode IN ('retail', 'wholesale')`, `item_type IN ('part', 'service')`, `payment_method IN ('Cash', 'GCash', 'Card', 'Maya')`).
- [x] Database B-tree indexes defined for `receipt_number`, `created_at DESC`, `cashier_id`, `pricing_mode`, `payment_method`, `transaction_id`, `item_type`, and `item_sku_or_code`.
- [x] Immutable Financial Ledger: RLS strictly limits operations to SELECT/INSERT, and PostgreSQL triggers reject any UPDATE or DELETE statement with an exception.
- [x] Prisma schema models `Transaction` and `TransactionItem` align 1:1 with `public.transactions` and `public.transaction_items` and pass `npx prisma validate`.
- [x] TypeScript contracts in `lib/types/transaction.ts` and `contracts/` define types and Zod schemas for validation.
- [x] Idempotent baseline seed data in `supabase/seed.sql` provides test transactions with both physical parts and labor services.

## 3. SWIFT Design Tokens & Code Standards
- [x] Zero hardcoded hex/rgb colors in any associated UI or helper components.
- [x] Strictly adhering to SWIFT design tokens (`lib/tokens.ts`, `app/globals.css`).
- [x] Atomic commit standards followed for every architectural layer.
