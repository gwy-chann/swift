# Implementation Tasks: Master Product Catalog & Physical Rack/Shelf Locator

**Feature**: `specs/091-master-product-catalog-rack-shelf-locator`  
**Jira Issue**: [SIAA-91](https://the-three-devsketeers.atlassian.net/browse/SIAA-91)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Completed  

---

## Phase 1: Specification & Design Artifacts (Unit 1)

- [x] **TASK-1.1**: Create `specs/091-master-product-catalog-rack-shelf-locator/spec.md` with Gherkin acceptance criteria matching Jira SIAA-91.
- [x] **TASK-1.2**: Create `research.md` documenting Spring Boot 3.3, Jakarta Bean Validation, and pricing calculation decisions.
- [x] **TASK-1.3**: Create `data-model.md` defining `Product` entity locator fields and DTOs.
- [x] **TASK-1.4**: Create TypeScript / Zod validation contracts in `contracts/`.
- [x] **TASK-1.5**: Create quality checklist `checklists/requirements.md` and `plan.md`.
- [x] **TASK-1.6**: Create `quickstart.md` with verification guide.

---

## Phase 2: Database Schema & Migration (Unit 3)

- [x] **TASK-2.1**: Create database migration `supabase/migrations/20261025000000_product_rack_shelf_locator.sql` adding `rack_id`, `shelf_id`, and `bin_locator` columns with index on `(rack_id, shelf_id)`.

---

## Phase 3: Domain Models & Repositories (Unit 4a)

- [x] **TASK-3.1**: Extend `Product.java` entity in `com.swift.modules.catalog.model` with `@Column(name = "rack_id") private String rackId`, `@Column(name = "shelf_id") private String shelfId`, and `@Column(name = "bin_locator") private String binLocator`.
- [x] **TASK-3.2**: Add `findAllByOrderByNameAsc()` and search/filter query methods to `ProductRepository.java`.

---

## Phase 4: Data Transfer Objects (DTOs) & Contracts (Unit 4b)

- [x] **TASK-4.1**: Implement `CreateProductRequest.java` record with Jakarta Bean Validations (`@NotBlank`, `@Positive`, `@NotNull`).
- [x] **TASK-4.2**: Implement `ProductResponse.java` and `ProductListResponse.java` in `com.swift.modules.catalog.dto`.
- [x] **TASK-4.3**: Define `DuplicateSkuException.java` in `com.swift.modules.catalog.exception`.

---

## Phase 5: Business Logic & Pricing Engine (Unit 4c)

- [x] **TASK-5.1**: Implement `PricingCalculatorService.java` and `PricingCalculatorServiceImpl.java` in `com.swift.modules.pricing.service` computing wholesale (+18%) and retail (+35% OEM / +40% aftermarket) with `BigDecimal` half-up rounding.
- [x] **TASK-5.2**: Implement unit tests `PricingCalculatorServiceTest.java` verifying 100% calculation parity.
- [x] **TASK-5.3**: Implement `ProductCatalogService.java` and `ProductCatalogServiceImpl.java` in `com.swift.modules.catalog.service` orchestrating SKU uniqueness validation, automated markup calculation, location string formatting, and persistence.

---

## Phase 6: REST Controllers & Strangler Reverse Proxy (Unit 5)

- [x] **TASK-6.1**: Implement `ProductCatalogController.java` with `GET /api/v1/admin/products` and `POST /api/v1/admin/products`.
- [x] **TASK-6.2**: Configure `@ExceptionHandler` or controller advice returning HTTP 409 Conflict for `DuplicateSkuException` and HTTP 400 Bad Request for `MethodArgumentNotValidException`.
- [x] **TASK-6.3**: Update `com.swift.config.SecurityConfig` to permit `/api/v1/admin/products/**`.
- [x] **TASK-6.4**: Update `gateway/nginx-strangler-gateway.conf` to route `/api/v1/admin/products` to Spring Boot backend with `@fallback_to_nextjs`.

---

## Phase 7: Automated Tests & Parity Verification (Unit 4d)

- [x] **TASK-7.1**: Implement `ProductCatalogControllerTests.java` testing:
  - Valid product registration returning HTTP 201 Created with computed retail (35%) and wholesale (18%) markups.
  - Duplicate SKU returning HTTP 409 Conflict.
  - Validation failures returning HTTP 400 Bad Request.
  - Listing products returning HTTP 200 OK.
- [x] **TASK-7.2**: Run `mvn clean test` to ensure all unit and integration tests pass without failure.

---

## Phase 8: Convergence, Atomic Commits & Pull Request (Unit 6)

- [x] **TASK-8.1**: Run `npm run typecheck` or verify full project compilation.
- [x] **TASK-8.2**: Commit changes in canonical atomic commit units following `.agents/rules/atomic-commit.md` with Jira key `[SIAA-91]`.
- [x] **TASK-8.3**: Push branch `feat/SIAA-91-master-product-catalog-rack-shelf-locator` and open Pull Request via `gh pr create`.
