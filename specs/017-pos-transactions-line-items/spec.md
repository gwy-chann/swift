# Feature Specification: Supabase POS Transactions & Hybrid Line Items Schema with Immutable Financial Ledger

**Feature Branch**: `feat/SIAA-50-pos-transactions-hybrid-line-items`  
**Created**: 2026-10-11  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-50](https://the-three-devsketeers.atlassian.net/browse/SIAA-50) (STORY-3.7)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) (EPIC-3: Point of Sale & Hybrid Service Billing)  

---

## 1. Executive Summary & Objective

In a hybrid motorcycle parts and workshop service facility, finalizing customer sales at checkout requires persistent, tamper-evident recording of both physical inventory items and bay labor services within a unified transaction. Store auditors, accountants, and franchise managers require 100% financial integrity: once a sale is tendered, the receipt record and its itemized line items must be permanent and mathematically immutable.

This feature establishes the authoritative Supabase PostgreSQL schema for POS transactions (`public.transactions`) and itemized line items (`public.transaction_items`). It enforces strict append-only Row-Level Security (RLS) policies along with database-level immutability triggers preventing `UPDATE` and `DELETE` operations. It provides 1:1 synchronization with Prisma ORM (`Transaction` and `TransactionItem` models), TypeScript domain models and Zod contracts, baseline historical seed data in `supabase/seed.sql`, and database query utilities for historical receipt lookup and verification.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - POS Transactions Table Schema Provisioning (Priority: P1)

* **As a** Shop Auditor or Store Accountant,
* **I want** finalized sales transactions recorded in a dedicated `public.transactions` table with complete financial totals, pricing mode, cashier metadata, and discount breakdowns,
* **so that** store revenue, cash flow, and payment methods are accurately tracked with audit integrity.

**Acceptance Criteria**:
1. **Given** migration `20261014000000_pos_transactions.sql`, **When** applied to Supabase PostgreSQL, **Then** `public.transactions` table is created with:
   - `id`: UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
   - `receipt_number`: TEXT NOT NULL UNIQUE (e.g., `'TX-1041'`, `'TX-20261011-0001'`)
   - `cashier_id`: UUID NULL REFERENCES `auth.users(id)` ON DELETE SET NULL
   - `cashier_name`: TEXT NOT NULL (e.g., `'Mike Morales'`, `'SWIFT Fast-Lane Cashier'`)
   - `pricing_mode`: TEXT NOT NULL CHECK (`pricing_mode IN ('retail', 'wholesale')`)
   - `subtotal`: NUMERIC(10, 2) NOT NULL CHECK (`subtotal >= 0`)
   - `discount_type`: TEXT NULL (e.g., `'none'`, `'senior'`, `'pwd'`, `'vip'`)
   - `discount_rate`: NUMERIC(5, 4) NOT NULL DEFAULT 0.0000 CHECK (`discount_rate >= 0`)
   - `discount_amount`: NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (`discount_amount >= 0`)
   - `total_due`: NUMERIC(10, 2) NOT NULL CHECK (`total_due >= 0`)
   - `cash_tendered`: NUMERIC(10, 2) NOT NULL CHECK (`cash_tendered >= total_due`)
   - `change_due`: NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (`change_due >= 0`)
   - `payment_method`: TEXT NOT NULL DEFAULT `'Cash'` CHECK (`payment_method IN ('Cash', 'GCash', 'Card', 'Maya')`)
   - `created_at`: TIMESTAMPTZ NOT NULL DEFAULT `timezone('utc'::text, now())`
2. **Given** table creation, **When** evaluating database indexes, **Then** B-tree indexes exist for:
   - `receipt_number` (`idx_transactions_receipt_number`)
   - `created_at` (`idx_transactions_created_at` DESC)
   - `cashier_id` (`idx_transactions_cashier_id`)
   - `pricing_mode` (`idx_transactions_pricing_mode`)
   - `payment_method` (`idx_transactions_payment_method`)

---

### User Story 2 - Hybrid Transaction Line Items Table Schema Provisioning (Priority: P1)

* **As a** Shop Auditor or Store Accountant,
* **I want** itemized line items recorded in `public.transaction_items` capturing physical parts, workshop labor services, unit prices, quantities, and physical location snapshots,
* **so that** parts-versus-labor revenue breakdowns and shelf location audits are accurately captured.

**Acceptance Criteria**:
1. **Given** migration `20261014000000_pos_transactions.sql`, **When** applied, **Then** `public.transaction_items` table is created with:
   - `id`: UUID PRIMARY KEY DEFAULT `gen_random_uuid()`
   - `transaction_id`: UUID NOT NULL REFERENCES `public.transactions(id)` ON DELETE RESTRICT
   - `item_type`: TEXT NOT NULL CHECK (`item_type IN ('part', 'service')`)
   - `item_sku_or_code`: TEXT NOT NULL (e.g., `'YAM-NMAX-BL01'`, `'SRV-OIL-01'`)
   - `item_name`: TEXT NOT NULL
   - `unit_price`: NUMERIC(10, 2) NOT NULL CHECK (`unit_price >= 0`)
   - `quantity`: INT NOT NULL CHECK (`quantity > 0`)
   - `subtotal`: NUMERIC(10, 2) NOT NULL CHECK (`subtotal >= 0`)
   - `bay`: TEXT NULL (e.g., `'Bay 1 / Quick Bay'`, null for physical parts)
   - `shelf_location`: TEXT NULL (e.g., `'Rack A-01 / Shelf 2'`, null for services)
2. **Given** table creation, **When** evaluating database indexes, **Then** B-tree indexes exist for:
   - `transaction_id` (`idx_transaction_items_tx_id`)
   - `item_type` (`idx_transaction_items_item_type`)
   - `item_sku_or_code` (`idx_transaction_items_sku_code`)

---

### User Story 3 - Append-Only Financial Ledger RLS & Immutability Trigger Guard (Priority: P1)

* **As a** Security Compliance Auditor,
* **I want** row-level security policies and database triggers that forbid any UPDATE or DELETE operations on transactions and transaction line items,
* **so that** financial records cannot be falsified, altered, or deleted by any user or API client.

**Acceptance Criteria**:
1. **Given** `public.transactions` and `public.transaction_items`, **When** Row-Level Security is enabled, **Then**:
   - `SELECT` is permitted for authenticated staff/admin and anonymous demo clients (`USING (true)`).
   - `INSERT` is permitted for authenticated staff/cashiers.
   - `UPDATE` is strictly denied via RLS policy or absence of update permissions.
   - `DELETE` is strictly denied via RLS policy or absence of delete permissions.
2. **Given** an attempt to execute an SQL `UPDATE` or `DELETE` statement on either table, **When** the statement is evaluated, **Then** PostgreSQL trigger `trg_prevent_transaction_modifications` and `trg_prevent_transaction_item_modifications` abort the operation with an exception: `'Transactions and line items are immutable financial records and cannot be updated or deleted.'`.

---

### User Story 4 - Prisma ORM Schema Synchronization (Priority: P2)

* **As a** Full-Stack Developer,
* **I want** `Transaction` and `TransactionItem` Prisma models declared in `prisma/schema.prisma` matching `lib/types/transaction.ts`,
* **so that** type-safe ORM access, validation, and relation queries function without errors.

**Acceptance Criteria**:
1. **Given** `prisma/schema.prisma`, **When** models are added, **Then**:
   - `model Transaction` defines 1:1 fields and has relation `items TransactionItem[]`.
   - `model TransactionItem` defines 1:1 fields and references `transaction Transaction @relation(fields: [transactionId], references: [id], onDelete: Restrict)`.
2. **Given** `npx prisma validate`, **When** executed, **Then** validation exits with code 0 without errors or warnings.

---

### User Story 5 - Historical Seed Data & Validation Queries (Priority: P2)

* **As a** Store Manager or Tester,
* **I want** baseline demo transactions seeded in `supabase/seed.sql` representing realistic retail parts and repair bay services,
* **so that** historical analytics, receipt lookups, and reporting can be tested immediately out of the box.

**Acceptance Criteria**:
1. **Given** `supabase/seed.sql`, **When** applied, **Then** at least 3 baseline transactions (e.g. `TX-1041`, `TX-1042`, `TX-1043`) are inserted with both parts and labor services items.
2. **Given** subsequent runs of `seed.sql`, **When** executed, **Then** idempotency is preserved (using `ON CONFLICT (receipt_number) DO NOTHING`).

---

## 3. Business Invariants & Edge Cases

1. **Monetary Non-Negativity**: `subtotal`, `discount_amount`, `total_due`, `cash_tendered`, `change_due`, `unit_price`, and `line subtotal` MUST all be `>= 0.00`.
2. **Tender Sufficiency**: `cash_tendered >= total_due`.
3. **Change Accuracy**: `change_due = cash_tendered - total_due`.
4. **Quantity Positivity**: Item `quantity` MUST be `>= 1`.
5. **Ledger Immutability**: No rows in `transactions` or `transaction_items` can ever be updated or deleted. Voiding or returns will be handled in future stories as offset / reversal transactions, never destructive deletes.
