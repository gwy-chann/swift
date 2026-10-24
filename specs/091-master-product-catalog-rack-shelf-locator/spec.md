# Feature Specification: Master Product Catalog & Physical Rack/Shelf Locator

**Feature Branch**: `feat/SIAA-91-master-product-catalog-rack-shelf-locator`  
**Created**: 2026-10-25  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-91](https://the-three-devsketeers.atlassian.net/browse/SIAA-91)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 3 (Catalog & Inventory)  
**Actions Replaced (2)**: `getProductsAction`, `createProductAction`  
**Target View / Scope**: Product Catalog & Pricing Modules (`swift-backend/src/main/java/com/swift/modules/catalog/*`, `com.swift.modules.pricing/*`, `gateway/nginx-strangler-gateway.conf`)

---

## 1. Executive Summary & Objective

In Phase 0 ([SIAA-88](https://the-three-devsketeers.atlassian.net/browse/SIAA-88)), Phase 1 ([SIAA-89](https://the-three-devsketeers.atlassian.net/browse/SIAA-89)), and Phase 2 ([SIAA-90](https://the-three-devsketeers.atlassian.net/browse/SIAA-90)), SWIFT established the modular monolith architecture, JWT/session interop, and MotoMatcher fitment engine.

Phase 3 ([SIAA-91](https://the-three-devsketeers.atlassian.net/browse/SIAA-91)) transitions the **Master Product Catalog & Physical Rack/Shelf Locator** from Next.js server actions to Spring Boot 3.3. Inventory Clerks and Warehouse Floor Mechanics require instant, reliable access to catalog records with physical storage coordinates (`rack_id`, `shelf_id`, `bin_locator`) to retrieve parts in under 5 seconds during busy service jobs.

This specification implements:
1. **Product Catalog REST Controller (`/api/v1/admin/products`)**:
   - `GET /api/v1/admin/products`: Retrieves the catalog of products, supporting optional search (`query`) and `category` filtering with sub-50ms query latency.
   - `POST /api/v1/admin/products`: Registers a new part with automated markup calculation, physical rack and shelf locator tagging, and strict case-insensitive SKU conflict enforcement.
2. **Pricing Calculator Service (`PricingCalculatorService`)**:
   - Automated markup computation for retail SRP (+35% for OEM, +40% for aftermarket) and wholesale (+18%) with half-up monetary rounding when explicit prices are not supplied.
3. **Physical Rack & Shelf Locator Mapping**:
   - Explicit attributes (`rackId`, `shelfId`, `binLocator`) mapped to database columns and backward-compatible formatted `location` string (`Rack A-01 / Shelf 03`).
4. **Unique SKU Integrity & Validation**:
   - Jakarta Bean Validations (`@NotBlank`, `@Positive`) returning HTTP 400 Bad Request on malformed inputs, and HTTP 409 Conflict when an existing SKU is encountered.
5. **Strangler Gateway Routing**:
   - NGINX routing of `/api/v1/admin/products` to Spring Boot with `@fallback_to_nextjs`.

---

## 1.1 Clarifications & Architecture Decisions

- **Q1: How are retail and wholesale prices calculated if omitted in `CreateProductRequest`?**  
  - **A**: `PricingCalculatorService` computes:
    - `wholesale = round(cost * (1 + 0.18), 2)` (18% markup)
    - `retail = isOem ? round(cost * (1 + 0.35), 2) : round(cost * (1 + 0.40), 2)` (35% OEM / 40% Aftermarket markup)
    - If explicit positive wholesale or retail prices are provided in the request payload, those explicitly provided values take precedence.
- **Q2: How are physical rack and shelf attributes persisted?**  
  - **A**: `Product` entity stores `rackId` (`rack_id`), `shelfId` (`shelf_id`), and `binLocator` (`bin_locator`), and constructs composite `location` (e.g. `Rack A-01 / Shelf 03` or custom bin locator) to maintain 100% backward compatibility with Next.js UI badges.
- **Q3: What HTTP status codes are returned on validation or duplicate errors?**  
  - **A**:
    - Input validation failures (e.g., blank SKU/name, non-positive cost): `HTTP 400 Bad Request` with field validation errors.
    - Duplicate SKU conflict: `HTTP 409 Conflict` with code `"SKU_ALREADY_EXISTS"` and error message `"Product with SKU \"...\" already exists."`.
    - Successful registration: `HTTP 201 Created` with saved `ProductDto`.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-91)

* **As an** Inventory Clerk,  
* **I want** to browse the catalog and register new parts with physical rack and shelf location tags,  
* **so that** floor mechanics can locate physical inventory in under 5 seconds and prevent stockout confusion.

---

### Scenario 1: Registering a new product with automated markup calculation (Priority: P1)

* **Given** a valid `CreateProductRequest` with SKU `"ENG-OIL-10W40"`, cost `"250.00"`, category `"Oils"`, brand `"Yamalube"`, rack `"A-01"`, and shelf `"03"`
* **When** `POST /api/v1/admin/products` is called with Admin credentials
* **Then** `PricingCalculatorService` computes retail price `337.50` (35% markup) and wholesale price `295.00` (18% markup)
* **And** the product is inserted into `public.products` with `rack_id = "A-01"`, `shelf_id = "03"`, and `location = "Rack A-01 / Shelf 03"`
* **And** returns HTTP 201 Created with the saved product record.

---

### Scenario 2: Enforce unique SKU constraint (Priority: P1)

* **Given** a product with SKU `"ENG-OIL-10W40"` already exists in the database
* **When** another registration request is submitted with the same SKU (regardless of casing, e.g. `"eng-oil-10w40"`)
* **Then** Spring Boot returns HTTP 409 Conflict with code `"SKU_ALREADY_EXISTS"` and an informative error message.

---

### Scenario 3: Master product catalog browsing & search (Priority: P1)

* **Given** cataloged products stored in `public.products`
* **When** `GET /api/v1/admin/products` is invoked with optional query `query="ENG-OIL"` or `category="Oils"`
* **Then** Spring Boot returns HTTP 200 with matching products ordered by name
* **And** each product record contains its physical rack, shelf, bin locator, and computed markup tiers.

---

### Scenario 4: Request validation and boundary errors (Priority: P2)

* **Given** a product registration payload with missing SKU, empty product name, or non-positive cost (`<= 0`)
* **When** `POST /api/v1/admin/products` is called
* **Then** Jakarta Bean Validation rejects the payload and returns HTTP 400 Bad Request with field error details.

---

### Scenario 5: Missing physical locator fallback (Priority: P2)

* **Given** a new product registration where rack and shelf are omitted or blank
* **When** `POST /api/v1/admin/products` is called
* **Then** the product is created with `rackId = null`, `shelfId = null`, and `location = null` (or `"Unassigned"`) without throwing exceptions.

---

## 3. Functional Requirements

- **FR-001**: System MUST provide `POST /api/v1/admin/products` to register new products in the catalog.
- **FR-002**: System MUST validate input fields using Jakarta Bean Validation (`@NotBlank` for SKU, name, category, brand; `@Positive` for cost).
- **FR-003**: System MUST calculate wholesale price (+18%) and retail price (+35% OEM / +40% aftermarket) via `PricingCalculatorService` when not provided.
- **FR-004**: System MUST check for existing SKU case-insensitively and reject duplicates with `HTTP 409 Conflict`.
- **FR-005**: System MUST persist physical location attributes (`rack_id`, `shelf_id`, `bin_locator`) and sync `location`.
- **FR-006**: System MUST provide `GET /api/v1/admin/products` with optional search and category filtering returning HTTP 200.
- **FR-007**: Strangler reverse proxy in NGINX MUST route `/api/v1/admin/products` to Spring Boot backend.

---

## 4. Success Criteria

- **SC-001**: Product creation executes in `< 50ms` on average under standard load.
- **SC-002**: 100% parity with mathematical formulas in Next.js `calculateMarkupPrices`: wholesale = 18%, OEM retail = 35%, aftermarket retail = 40%.
- **SC-003**: 100% duplicate SKU detection rate preventing any duplicate SKU insertion into `public.products`.
- **SC-004**: Floor mechanics can identify physical part storage location in `< 5 seconds` via clear rack/shelf tags.
