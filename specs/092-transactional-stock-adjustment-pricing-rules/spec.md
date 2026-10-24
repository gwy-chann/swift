# Feature Specification: Transactional Stock Adjustment Engine & Pricing Markup Rules

**Feature Branch**: `feat/SIAA-92-transactional-stock-adjustment-pricing-rules`  
**Created**: 2026-10-25  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-92](https://the-three-devsketeers.atlassian.net/browse/SIAA-92)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 3 (Catalog & Inventory)  
**Actions Replaced (5)**: `adjustProductStockAction`, `getStockAdjustmentLogsAction`, `exportStockAdjustmentLogsAction`, `getPricingRulesAction`, `updatePricingRulesAction`  
**Stored Procedures Replaced (1)**: `public.adjust_product_stock`  
**Target View / Scope**: Inventory & Pricing Modules (`swift-backend/src/main/java/com/swift/modules/inventory/*`, `com.swift.modules.pricing/*`, `gateway/nginx-strangler-gateway.conf`)

---

## 1. Executive Summary & Objective

In Phase 3 ([SIAA-91](https://the-three-devsketeers.atlassian.net/browse/SIAA-91)), SWIFT migrated the master product catalog and physical rack/shelf locator to Spring Boot 3.3.

This feature ([SIAA-92](https://the-three-devsketeers.atlassian.net/browse/SIAA-92)) establishes the **Transactional Stock Adjustment Engine & Pricing Markup Rules** within Spring Boot. Inventory Auditors and Store Managers require stock mutations to execute strictly within ACID transactional boundaries with immutable ledger logs, eliminating lost updates and race conditions during high-volume counter operations. Additionally, statutory shrinkage audits require high-throughput streaming CSV exports without JVM heap bloat, and store-wide markup rules require centralized atomic persistence and audit tracking.

This specification implements:
1. **Atomic Stock Adjustment API (`POST /api/v1/inventory/stock-adjust`)**:
   - Executes transactional stock adjustments via `SimpleJdbcCall` invoking PostgreSQL stored procedure `public.adjust_product_stock` (with fallback to pessimistic-locking JPA service).
   - Guarantees serialized row-level locking (`FOR UPDATE`) with zero lost updates and floor-zero non-negative stock constraints.
   - Generates immutable audit records in `public.stock_adjustment_logs`.
2. **Stock Adjustment Audit Ledger & Filter Query API (`GET /api/v1/inventory/stock-adjust/logs`)**:
   - Supports multi-criteria filtering by SKU, adjustment type (e.g., `Damaged`, `Restock`, `Audit Count`), date range, operator, and text search with real-time aggregate shrinkage metrics.
3. **High-Performance Streamed CSV Export (`GET /api/v1/inventory/stock-adjust/export-csv`)**:
   - Implements Spring MVC `StreamingResponseBody` directly piping RFC 4180-compliant CSV chunks to the HTTP response stream, preventing JVM heap bloat and Out-Of-Memory errors even under millions of ledger records.
4. **Centralized Pricing Markup Rules REST Controller (`/api/v1/pricing/rules`)**:
   - `GET /api/v1/pricing/rules`: Retrieves active shop markup percentages (retail, wholesale, aftermarket) and benchmark hourly labor rate.
   - `PUT /api/v1/pricing/rules`: Updates global pricing rules, enforces range constraints (0 < markup <= 200%, labor >= 0), and writes immutable audit entries into `public.pricing_rules_audit_logs`.
5. **Strangler Reverse Proxy Routing**:
   - Routes `/api/v1/inventory/stock-adjust` and `/api/v1/pricing/rules` through NGINX to Spring Boot with seamless fallback to Next.js (`@fallback_to_nextjs`).

---

## 1.1 Clarifications & Architecture Decisions

- **Q1: Which database stored procedure or execution path is utilized for stock adjustments?**
  - **A**: `SimpleJdbcCall` invokes `public.adjust_product_stock(p_sku, p_type, p_delta, p_reason, p_user_name)`. If database stored procedures are unavailable or in test environments without Supabase functions, an atomic JPA/JDBC fallback with `@Transactional(isolation = Isolation.REPEATABLE_READ)` and pessimistic row locks (`PESSIMISTIC_WRITE`) guarantees 100% test and runtime reliability.
- **Q2: How does CSV streaming avoid JVM heap exhaustion?**
  - **A**: The endpoint returns `org.springframework.web.servlet.mvc.method.annotation.StreamingResponseBody`. A buffered writer writes rows line-by-line from a cursor-based repository query directly into the output stream, maintaining O(1) memory overhead.
- **Q3: What error response structure and HTTP status codes are returned?**
  - **A**:
    - Zero delta: `HTTP 400 Bad Request` with error code `"ZERO_DELTA_NOT_ALLOWED"`.
    - Non-existent SKU: `HTTP 404 Not Found` with error code `"PRODUCT_NOT_FOUND"`.
    - Insufficient stock (resulting stock < 0): `HTTP 400 Bad Request` or `HTTP 422 Unprocessable Entity` with error code `"INSUFFICIENT_STOCK"`.
    - Invalid pricing rules (markup <= 0 or > 200, labor < 0): `HTTP 400 Bad Request` with error code `"VALIDATION_ERROR"`.
    - Successful stock adjustment: `HTTP 200 OK` with detailed stock adjustment payload.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-92)

* **As an** Inventory Auditor,  
* **I want** stock adjustments to execute within ACID transactional boundaries with immutable ledger logs,  
* **so that** inventory variance and shrinkage are accurately audited without lost updates or race conditions.

---

### Scenario 1: Atomic stock adjustment via stored procedure (Priority: P1)

* **Given** SKU `"BRK-PAD-001"` has an active stock count of `50`
* **When** an adjustment of `"-5"` with reason `"Damaged"` is submitted to `"POST /api/v1/inventory/stock-adjust"`
* **Then** Spring Boot executes `"public.adjust_product_stock"` via `SimpleJdbcCall`
* **And** the product stock in table `"products"` becomes `45`
* **And** an immutable audit record is inserted into `"stock_adjustment_logs"`
* **And** returns HTTP 200 with `previousStock = 50`, `newStock = 45`, `quantityDelta = -5`, and `adjustmentType = "Damaged"`.

---

### Scenario 2: Concurrent stock adjustments serialization (Priority: P1)

* **Given** two concurrent adjustments target SKU `"BRK-PAD-001"` simultaneously (e.g., `-5` units and `+10` units)
* **When** both transactions execute concurrently under row-level database locks
* **Then** database row locks (`FOR UPDATE`) ensure serialized execution with 0 lost updates
* **And** the final product stock reflects exactly the sum of both deltas (`50 - 5 + 10 = 55`) with two distinct audit ledger entries.

---

### Scenario 3: Streamed stock adjustment audit log CSV export (Priority: P1)

* **Given** an auditor requests `"GET /api/v1/inventory/stock-adjust/export-csv"` with optional date or SKU filters
* **When** the report is generated
* **Then** Spring MVC streams the RFC 4180-compliant CSV data directly to the response output stream via `StreamingResponseBody` without JVM heap bloat
* **And** the response headers include `Content-Type: text/csv; charset=UTF-8` and `Content-Disposition: attachment; filename="stock-adjustment-audit-...csv"`.

---

### Scenario 4: Global pricing markup rules query and atomic update (Priority: P1)

* **Given** active shop pricing rules configured in the database
* **When** `"GET /api/v1/pricing/rules"` is requested
* **Then** Spring Boot returns HTTP 200 with retail markup (35%), wholesale markup (18%), aftermarket markup (40%), and hourly labor rate (450.00)
* **When** an Admin submits `"PUT /api/v1/pricing/rules"` with new rates (`retailMarkup = 38.0`, `hourlyLaborRate = 500.0`)
* **Then** Spring Boot validates bounds, updates singleton row 1, inserts an immutable audit log into `pricing_rules_audit_logs`, and returns the updated rules.

---

### Scenario 5: Boundary validations and negative stock rejection (Priority: P2)

* **Given** SKU `"BRK-PAD-001"` has an active stock count of `5`
* **When** an adjustment of `"-10"` is submitted to `"POST /api/v1/inventory/stock-adjust"`
* **Then** Spring Boot rejects the transaction with HTTP 400 or HTTP 422 (`"INSUFFICIENT_STOCK"`)
* **And** the product stock remains unchanged at `5` with zero audit log insertion.

---

## 3. Functional Requirements

- **FR-001**: System MUST expose `POST /api/v1/inventory/stock-adjust` to execute atomic stock adjustments.
- **FR-002**: System MUST reject adjustments with `quantityDelta = 0` returning HTTP 400 (`"ZERO_DELTA_NOT_ALLOWED"`).
- **FR-003**: System MUST enforce row-level locking (`FOR UPDATE`) during adjustments to prevent lost updates during concurrent requests.
- **FR-004**: System MUST reject adjustments causing stock to fall below zero returning HTTP 400/422 (`"INSUFFICIENT_STOCK"`).
- **FR-005**: System MUST record every successful stock adjustment in `public.stock_adjustment_logs` with operator attribution, previous stock, new stock, delta, type, and timestamp.
- **FR-006**: System MUST expose `GET /api/v1/inventory/stock-adjust/logs` with pagination (`limit`, `offset`) and filtering (`sku`, `adjustmentType`, `startDate`, `endDate`, `search`), returning items and aggregate summary metrics.
- **FR-007**: System MUST expose `GET /api/v1/inventory/stock-adjust/export-csv` utilizing `StreamingResponseBody` for RFC 4180 CSV export.
- **FR-008**: System MUST expose `GET /api/v1/pricing/rules` and `PUT /api/v1/pricing/rules` for managing shop-wide markup tiers and labor rates.
- **FR-009**: System MUST validate pricing markup ranges (`0 < markup <= 200%`, `hourlyLaborRate >= 0`) and record changes in `public.pricing_rules_audit_logs`.
- **FR-010**: Strangler reverse proxy NGINX MUST route `/api/v1/inventory/stock-adjust` and `/api/v1/pricing/rules` to Spring Boot backend.

---

## 4. Success Criteria

- **SC-001**: Single stock adjustment executes in `< 30ms` average latency under database row locking.
- **SC-002**: Concurrent adjustments on the same SKU exhibit 100% serialization with 0 lost updates across parallel worker threads.
- **SC-003**: CSV export of 50,000+ audit log records consumes `< 15MB` JVM peak heap memory using streaming output chunks.
- **SC-004**: 100% parity with legacy Next.js server actions (`adjustProductStockAction`, `getStockAdjustmentLogsAction`, `getPricingRulesAction`, `updatePricingRulesAction`).
