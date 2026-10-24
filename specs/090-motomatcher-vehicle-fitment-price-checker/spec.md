# Feature Specification: MotoMatcher Vehicle Fitment & Product Price Checker

**Feature Branch**: `feat/SIAA-90-motomatcher-vehicle-fitment-price-checker`  
**Created**: 2026-10-24  
**Status**: Ready for Planning / Implementation  
**Jira Issue**: [SIAA-90](https://the-three-devsketeers.atlassian.net/browse/SIAA-90)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 2 (Read-Heavy Catalog & Cache)  
**Actions Replaced (4)**: `getMotorcycleModelsAction`, `getFitmentMatrixAction`, `addFitmentRuleAction`, `lookupProductPriceAction`  
**Stored Procedures Replaced / Delegated (1)**: `public.get_moto_matcher_matrix`  
**Target View / Scope**: MotoMatcher & Catalog Modules (`swift-backend/src/main/java/com/swift/modules/motomatcher/*`, `com.swift.modules.catalog/*`, `contracts/*`)

---

## 1. Executive Summary & Objective

In Phase 0 ([SIAA-88](https://the-three-devsketeers.atlassian.net/browse/SIAA-88)) and Phase 1 ([SIAA-89](https://the-three-devsketeers.atlassian.net/browse/SIAA-89)), SWIFT established the Spring Boot 3.3 modular monolith foundation, NGINX strangler reverse proxy, and dual-platform identity bridge.

Phase 2 ([SIAA-90](https://the-three-devsketeers.atlassian.net/browse/SIAA-90)) delivers the **MotoMatcher Vehicle Fitment & Product Price Checker** service in Spring Boot. Counter clerks, cashiers, and workshop mechanics rely heavily on sub-50ms catalog lookups to inspect parts compatibility by motorcycle model and perform instant barcode price checks on the shop floor.

This specification implements:
1. **MotoMatcher REST Controller (`/api/v1/motomatcher/*`)**:
   - `GET /api/v1/motomatcher/models`: Retrieves the full catalog of motorcycle models with Caffeine in-memory caching (`@Cacheable(value = "motorcycleModels", key = "'all'")`), ensuring sub-10ms response times for repeat queries.
   - `GET /api/v1/motomatcher/matrix?modelId={uuid}&category={cat}&search={q}`: Invokes PostgreSQL stored procedure `public.get_moto_matcher_matrix(?, ?, ?)` via Spring `JdbcTemplate` and returns JSON with OEM vs Aftermarket partitioned arrays matching Next.js schema with 100% field parity.
   - `POST /api/v1/motomatcher/rules`: Creates a new motorcycle-to-product fitment mapping in table `public.product_fitments`, automatically evicting the Caffeine cache (`@CacheEvict(value = "motorcycleModels", allEntries = true)`).
2. **Product Price Checker REST Controller (`/api/v1/inventory/pricecheck`)**:
   - `GET /api/v1/inventory/pricecheck?query={skuOrBarcodeOrName}`: Queries `public.products` by exact SKU, barcode, or case-insensitive partial name match.
   - Computes dual-tier pricing (Retail SRP, Wholesale), cost, gross markup percentage, wholesale markup percentage, gross margin percentage, statutory 20% Senior Citizen / PWD discounted price, and physical shelf locator (`location`), maintaining 100% field parity with `lookupProductPriceAction`.
3. **Caffeine Cache Infrastructure**:
   - High-performance, near-zero garbage collection in-memory caching configured with maximum size 5,000 entries and 1-hour expiration.
4. **Automated Parity & Integration Verification**:
   - Comprehensive MockMvc / REST Assured integration tests asserting 100% contract parity against fixtures from `lib/motomatcher/actions.ts` and `lib/staff/actions.ts`.

---

## 1.1 Clarifications & Decisions

### Session 2026-10-24
- **Q1: Which database table stores part-to-model fitment rules?**  
  - **A**: The canonical database table is `public.product_fitments` created in migration `20261010120000_motomatcher_compatibility.sql`, containing `(product_id, model_id, fitment_type, year_range, notes)`.
- **Q2: How does Spring Boot execute `public.get_moto_matcher_matrix`?**  
  - **A**: `MotoMatcherServiceImpl` uses Spring's `JdbcTemplate` with query `SELECT public.get_moto_matcher_matrix(?::uuid, ?, ?)::text`, deserializing the JSONB response directly into `MotoMatcherMatrixDto` via Jackson `ObjectMapper`.
- **Q3: What caching strategy should be used for motorcycle models?**  
  - **A**: In-memory Caffeine Cache via Spring Cache (`@Cacheable(value = "motorcycleModels", key = "'all'")`). When `/api/v1/motomatcher/rules` creates a fitment rule, `@CacheEvict(value = "motorcycleModels", allEntries = true)` evicts stale data.
- **Q4: How does price check compute margin and statutory discounts?**  
  - **A**:
    - `grossMarkupPercent = ((retail - cost) / cost) * 100` (rounded to 1 decimal place; 0 if cost <= 0).
    - `wholesaleMarkupPercent = ((wholesale - cost) / cost) * 100` (rounded to 1 decimal place; 0 if cost <= 0).
    - `scPwdPrice = retail * 0.8` (rounded to 2 decimal places).
- **Q5: What response structure should `/api/v1/inventory/pricecheck` return?**  
  - **A**: Standard envelope `{ "success": true, "product": { ... } }` or `{ "success": false, "code": "PRODUCT_NOT_FOUND" | "INVALID_QUERY", "error": "..." }`, identical to Next.js `ProductPriceCheckResult`.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-90)

* **As a** Counter Clerk or Mechanic,  
* **I want** motorcycle compatibility queries and barcode price checks to resolve in sub-50ms via Spring Boot,  
* **so that** customer inquiries on the shop floor are resolved instantly without lag or fitment error returns.

---

### Scenario 1: Querying MotoMatcher fitment matrix via PostgreSQL RPC (Priority: P1)

* **Given** a customer requests compatible parts for motorcycle `modelId="b0000000-0000-0000-0000-000000000001"` and category `"Brakes"`
* **When** `GET /api/v1/motomatcher/matrix?modelId=b0000000-0000-0000-0000-000000000001&category=Brakes` is invoked
* **Then** Spring Boot executes stored procedure `public.get_moto_matcher_matrix(?, ?, ?)` via `JdbcTemplate`
* **And** returns HTTP 200 with JSON payload containing partitioned `oem_parts` and `aftermarket_parts` matching Next.js schema with 100% field parity.

---

### Scenario 2: In-memory Caffeine cache hit for motorcycle models (Priority: P1)

* **Given** motorcycle models have been retrieved and cached under key `"all"` in cache `"motorcycleModels"`
* **When** a subsequent request hits `GET /api/v1/motomatcher/models`
* **Then** the response is served from Caffeine in-memory cache in <10ms without querying PostgreSQL.

---

### Scenario 3: Realtime SKU and barcode price check with margin simulator (Priority: P1)

* **Given** a clerk scans barcode or queries SKU `"YAM-NMAX-BL01"` at `GET /api/v1/inventory/pricecheck?query=YAM-NMAX-BL01`
* **When** the product is retrieved from table `public.products`
* **Then** the response contains `cost`, `retailPrice`, `wholesalePrice`, `grossMarkupPercent`, `wholesaleMarkupPercent`, `scPwdPrice`, and physical shelf locator `location`
* **And** returns HTTP 200 with `{ "success": true, "product": { ... } }`.

---

### Scenario 4: Fitment rule creation & cache eviction (Priority: P2)

* **Given** an authenticated user posts a new fitment mapping to `POST /api/v1/motomatcher/rules`
* **When** the rule is persisted into `public.product_fitments`
* **Then** the response returns `{ "success": true, "ruleId": "<uuid>" }`
* **And** the Caffeine cache for `motorcycleModels` is automatically evicted.

---

### Scenario 5: Missing or invalid product price check handling (Priority: P2)

* **Given** a query for a non-existent barcode `"UNKNOWN-CODE-999"` or blank input `"   "`
* **When** `GET /api/v1/inventory/pricecheck` is invoked
* **Then** blank queries return HTTP 400 with `code="INVALID_QUERY"`
* **And** unknown items return HTTP 404 with `code="PRODUCT_NOT_FOUND"` and error `"No item found for barcode / code: \"UNKNOWN-CODE-999\"."`.

---

## 3. Functional Requirements

- **FR-001**: `MotoMatcherController` MUST expose `GET /api/v1/motomatcher/models` returning all motorcycle models ordered by `make` and `model`.
- **FR-002**: `GET /api/v1/motomatcher/models` MUST use Caffeine cache `@Cacheable(value = "motorcycleModels", key = "'all'")`.
- **FR-003**: `MotoMatcherController` MUST expose `GET /api/v1/motomatcher/matrix` accepting required `modelId` (UUID) and optional `category` and `search` query parameters.
- **FR-004**: `MotoMatcherService` MUST invoke `public.get_moto_matcher_matrix(?::uuid, ?, ?)` via Spring `JdbcTemplate` and return `oem_parts` and `aftermarket_parts`.
- **FR-005**: If `modelId` is null or invalid, `GET /api/v1/motomatcher/matrix` MUST return empty arrays for `oem_parts` and `aftermarket_parts`.
- **FR-006**: `MotoMatcherController` MUST expose `POST /api/v1/motomatcher/rules` accepting `productId` (UUID), `modelId` (UUID), `fitmentType` (`oem` | `aftermarket` | `universal`), optional `yearRange`, and optional `notes`.
- **FR-007**: `POST /api/v1/motomatcher/rules` MUST persist the record into `public.product_fitments` and trigger `@CacheEvict(value = "motorcycleModels", allEntries = true)`.
- **FR-008**: `ProductPriceCheckController` MUST expose `GET /api/v1/inventory/pricecheck` accepting `query` string parameter.
- **FR-009**: `ProductPriceCheckService` MUST query `public.products` by exact SKU, barcode, or case-insensitive partial name match.
- **FR-010**: `ProductPriceCheckService` MUST compute:
  - `grossMarkupPercent = Math.round(((retail - cost) / cost) * 1000.0) / 10.0`
  - `wholesaleMarkupPercent = Math.round(((wholesale - cost) / cost) * 1000.0) / 10.0`
  - `scPwdPrice = Math.round(retail * 0.8 * 100.0) / 100.0`
- **FR-011**: Output of `/api/v1/inventory/pricecheck` MUST match `ProductPriceCheckResult` schema with 100% field parity.

---

## 4. Success Criteria

1. **Sub-10ms Models Retrieval**: Cached `GET /api/v1/motomatcher/models` responds in <10ms on repeat calls.
2. **Sub-50ms Fitment Matrix**: `GET /api/v1/motomatcher/matrix` responds in <50ms executing `public.get_moto_matcher_matrix`.
3. **Sub-50ms Barcode Price Check**: `GET /api/v1/inventory/pricecheck` executes in <50ms with accurate markup and shelf location.
4. **100% Contract Parity**: Output JSON perfectly matches TypeScript types in `lib/types/motomatcher.ts` and `lib/staff/types.ts`.
5. **Zero Test Regressions**: All existing Spring Boot and Next.js tests pass without errors.
