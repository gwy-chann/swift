# Feature Specification: High-Concurrency POS Checkout Orchestration & Thermal Receipts

**Feature Branch**: `feat/SIAA-96-pos-checkout-orchestration-thermal-receipts`  
**Created**: 2026-10-25  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-96](https://the-three-devsketeers.atlassian.net/browse/SIAA-96)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 4 (Core Transaction Engine)  
**Actions Replaced (5)**: `getLaborServicesAction`, `processCheckoutAction`, `getTransactionsAction`, `getTransactionByReceiptAction`, `getThermalReceiptByReceiptAction`  
**Stored Procedures Replaced (1)**: `public.process_pos_checkout`  
**Target View / Scope**: POS Checkout & Receipt Module (`swift-backend/src/main/java/com/swift/modules/pos/*`, `gateway/nginx-strangler-gateway.conf`)

---

## 1. Executive Summary & Objective

In Phase 4 of the Next.js to Spring Boot ecosystem migration (Strangler Fig pattern), SWIFT migrates the mission-critical **POS Checkout Orchestration & Thermal Receipts Engine** from Next.js server actions to a high-concurrency Spring Boot 3.3 modular monolith backend.

Floor cashiers at motorcycle parts retail counters and service bays require fast, deterministic, and atomic checkout operations. High-traffic peak sales hours regularly create inventory contention where multiple cashier terminals ring up identical high-turnover parts (e.g., brake pads, 10W-40 4T synthetic oil, spark plugs) simultaneously. Without strict row-level pessimistic locking (`SELECT ... FOR UPDATE`), concurrent transactions risk race conditions, overselling negative inventory, and stock discrepancies.

This specification establishes:
1. **High-Concurrency POS Checkout Endpoints (`/api/v1/pos`)**:
   - `POST /api/v1/pos/checkout`: Atomically processes multi-item transactions containing catalog parts, workshop labor services, custom discounts, and cash tender. Enforces row-level stock locks, updates inventory, generates immutable stock audit logs, and creates financial transaction records within < 45 seconds total cashier workflow.
   - `GET /api/v1/pos/transactions`: Retrieves paginated or limited history of executed POS transactions with itemized line details.
   - `GET /api/v1/pos/transactions/{receiptNumber}`: Looks up a specific transaction header and line items by human-readable receipt identifier.
   - `GET /api/v1/pos/receipts/{receiptNumber}/thermal`: Generates both ESC/POS raw printer command streams (supporting 58mm and 80mm roll widths) and structured JSON receipt payloads matching SWIFT's physical receipt specifications.
   - `GET /api/v1/pos/services`: Retrieves active workshop labor services for fast-lane checkout cart population.
2. **PostgreSQL Stored Procedure Integration via `SimpleJdbcCall`**:
   - Invokes existing atomic stored procedure `public.process_pos_checkout(p_transaction, p_items)` with deterministic SKU sorting (`ORDER BY item_sku_or_code ASC`) to prevent deadlocks.
   - Provides transactional JPA fallback with pessimistic write locks (`@Lock(LockModeType.PESSIMISTIC_WRITE)`) for offline and standalone H2 test execution.
3. **Cash Tender & Change Validation Rules**:
   - Validates that `cashTendered >= totalDue` for cash payments.
   - Computes authoritative `changeDue = cashTendered - totalDue` with two-decimal precision.
   - Rejects underpaid transactions with `HTTP 400 Bad Request` and descriptive error message `"Insufficient cash tendered"`.
4. **Strangler Reverse Proxy Handover**:
   - Updates NGINX strangler gateway configuration to forward `/api/v1/pos/` traffic directly to Spring Boot with `@fallback_to_nextjs` safeguard.

---

## 1.1 Clarifications & Architecture Decisions

### Session 2026-10-25
- **Q1: How does the system prevent database deadlocks when 50 cashiers ring up overlapping items concurrently?**
  - **A**: All line items in the checkout payload are sorted deterministically in ascending alphanumeric order by `item_sku_or_code` prior to acquiring row locks (`SELECT ... FOR UPDATE`). This uniform lock acquisition hierarchy eliminates cyclic dependency deadlocks across concurrent database transactions.
- **Q2: What is the format of the generated receipt number?**
  - **A**: If the client provides a pre-generated receipt number (e.g., `REC-YYYYMMDD-XXXX` or `TX-YYYYMMDD-XXXX`), the server validates and uses it. If omitted, the server generates a standardized identifier adhering to `REC-YYYYMMDD-XXXX` (where `XXXX` is a randomized 4-digit hexadecimal or numerical suffix).
- **Q3: What formats are returned by the thermal receipt endpoint?**
  - **A**: The endpoint `GET /api/v1/pos/receipts/{receiptNumber}/thermal` returns a `ThermalReceiptResponse` DTO containing:
    1. Structured JSON representation matching `ThermalReceiptData` (store metadata, itemized lines, totals, VAT breakdown, cashier info).
    2. Raw ESC/POS byte sequence encoded in Base64 and printable text containing initialization (`ESC @`), character alignment (`ESC a`), bolding (`ESC E`), barcode commands (`GS k`), and paper cut (`GS V 66 0`).
- **Q4: How does Spring Boot handle stored procedure availability in test profiles?**
  - **A**: `PosStoredProcedureWrapper` attempts invocation of `public.process_pos_checkout` via Spring JDBC. If running against an in-memory H2 database where PL/pgSQL stored procedures are not present, the service gracefully switches to `PosCheckoutServiceImpl`'s transactional JPA fallback which acquires pessimistic write locks on `Product` entities and persists records to `transactions`, `transaction_items`, and `stock_adjustment_logs`.
- **Q5: How are workshop labor line items handled during stock deduction?**
  - **A**: Line items with `itemType = "service"` (workshop labor) bypass product stock decrements and stock audit logs, but are recorded in `transaction_items` and reflected in `subtotal` and `totalDue`.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-96)

* **As a** Cashier,  
* **I want** to process combined motorcycle parts and workshop labor checkout transactions with guaranteed row-level inventory locking,  
* **so that** sales are billed in under 45 seconds, inventory counts never oversell, and formatted thermal receipts print immediately.

---

### Scenario 1: Atomic POS checkout with row-level stock deduction (Priority: P1)

* **Given** a valid `PosCheckoutRequest` containing parts SKUs, labor services, cash tendered, and discounts
* **When** `"POST /api/v1/pos/checkout"` is executed
* **Then** Spring Boot invokes stored procedure `"public.process_pos_checkout"`
* **And** product rows are locked with `"SELECT ... FOR UPDATE"` in ascending SKU order to prevent concurrent overselling and deadlocks
* **And** physical stock is deducted, transaction record is created, and receipt number `"REC-YYYYMMDD-XXXX"` is returned
* **And** returns `HTTP 200 OK` with transaction ID, receipt number, total due, parts decremented, and timestamp.

---

### Scenario 2: Cash tender validation and change calculation (Priority: P1)

* **Given** a total bill of `"450.00"` and tendered cash of `"500.00"`
* **When** `"POST /api/v1/pos/checkout"` is validated
* **Then** change due is verified as exactly `"50.00"`
* **And** if tendered amount is less than total bill (e.g. `"400.00"` tendered for `"450.00"` bill)
* **Then** the request is rejected with `HTTP 400 Bad Request`
* **And** error message contains `"Insufficient cash tendered. Total due: 450.00, Cash tendered: 400.00"`.

---

### Scenario 3: Thermal receipt payload generation (Priority: P1)

* **Given** an executed transaction with receipt number `"REC-20261024-001"`
* **When** `"GET /api/v1/pos/receipts/REC-20261024-001/thermal"` is requested
* **Then** `"ThermalReceiptService"` returns printable ESC/POS formatting commands matching the exact physical receipt template
* **And** response includes store header (`SWIFT MOTO SERVICE`), date, cashier name, line items, totals, payment details, and warranty notice (`Parts warranty valid for 7 days with receipt.`).

---

### Scenario 4: Concurrent checkout stress resilience (Priority: P1)

* **Given** a product SKU `"PART-OIL-10W40"` with an initial stock of `50` units
* **When** 50 concurrent cashier checkout requests each attempt to purchase `1` unit simultaneously
* **Then** all 50 transactions complete successfully without deadlock exceptions
* **And** final product stock settles at exactly `0` units
* **When** an additional 51st cashier attempts to purchase `1` unit
* **Then** the request fails with `HTTP 409 Conflict` (or `HTTP 400 Bad Request`) indicating `"INSUFFICIENT_STOCK"`.

---

### Scenario 5: Transaction lookup and labor services retrieval (Priority: P2)

* **Given** existing transactions in the database
* **When** `"GET /api/v1/pos/transactions?limit=10"` is called
* **Then** returns `HTTP 200 OK` with up to 10 most recent transactions ordered by `created_at` descending
* **When** `"GET /api/v1/pos/services"` is called
* **Then** returns active workshop labor services sorted by service code ascending.

---

## 3. Success Criteria & Non-Functional Invariants

1. **Transaction Latency**: End-to-end checkout execution completes within < 150ms under single-user load, and < 500ms p99 latency during 50-thread concurrent bursts.
2. **Zero Overselling**: Under no circumstances can inventory stock drop below zero for physical catalog parts.
3. **Deadlock Freedom**: Zero `DeadlockLoserDataAccessException` or PostgreSQL `deadlock detected` errors during high-concurrency multi-item checkouts.
4. **Thermal Printer Compatibility**: ESC/POS stream conforms to Epson ESC/POS standard (supported by standard 58mm and 80mm thermal receipt printers).
5. **Audit Trail Completeness**: Every physical stock deduction writes a corresponding row to `stock_adjustment_logs` referencing the receipt number.
