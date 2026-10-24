# Implementation Tasks: MotoMatcher Vehicle Fitment & Product Price Checker

**Feature**: `specs/090-motomatcher-vehicle-fitment-price-checker`  
**Jira Issue**: [SIAA-90](https://the-three-devsketeers.atlassian.net/browse/SIAA-90)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Completed  

---

## Phase 1: Dependencies & Tooling Setup (Unit 2)

- [x] **TASK-1.1**: Add `spring-boot-starter-cache` and `com.github.ben-manes.caffeine:caffeine` to `swift-backend/pom.xml`.
- [x] **TASK-1.2**: Implement `CacheConfig.java` in `com.swift.config` enabling `@EnableCaching` with 1-hour TTL and 5,000 maximum entries.

---

## Phase 2: Domain Entities & Repositories (Unit 4a)

- [x] **TASK-2.1**: Implement `MotorcycleModel.java` entity mapping `public.motorcycle_models`.
- [x] **TASK-2.2**: Implement `ProductFitment.java` entity mapping `public.product_fitments`.
- [x] **TASK-2.3**: Implement `Product.java` entity mapping `public.products` (subset for pricing, stock, shelf location).
- [x] **TASK-2.4**: Implement `MotorcycleModelRepository.java`, `ProductFitmentRepository.java`, and `ProductRepository.java`.

---

## Phase 3: Data Transfer Objects (DTOs) & Contracts (Unit 4b)

- [x] **TASK-3.1**: Implement `MotorcycleModelDto.java` in `com.swift.modules.motomatcher.dto`.
- [x] **TASK-3.2**: Implement `MotoMatcherMatrixPartDto.java` and `MotoMatcherMatrixDto.java` with `@JsonProperty` matching Next.js wire format.
- [x] **TASK-3.3**: Implement `AddFitmentRuleRequest.java` and `AddFitmentRuleResponse.java`.
- [x] **TASK-3.4**: Implement `ProductPriceCheckItemDto.java` and `ProductPriceCheckResponse.java` in `com.swift.modules.catalog.dto`.

---

## Phase 4: Business Logic & Services (Unit 4c)

- [x] **TASK-4.1**: Implement `MotoMatcherService` interface and `MotoMatcherServiceImpl`:
  - `getMotorcycleModels()` with `@Cacheable(value = "motorcycleModels", key = "'all'")`.
  - `getFitmentMatrix(UUID modelId, String category, String search)` executing `SELECT public.get_moto_matcher_matrix(?::uuid, ?, ?)::text` via `JdbcTemplate`.
  - `addFitmentRule(AddFitmentRuleRequest request)` persisting into `ProductFitmentRepository` with `@CacheEvict(value = "motorcycleModels", allEntries = true)`.
- [x] **TASK-4.2**: Implement `ProductPriceCheckService` and `ProductPriceCheckServiceImpl`:
  - Query by exact SKU, barcode, or partial name.
  - Compute gross markup %, wholesale markup %, gross margin %, SC/PWD 20% discount price, and map shelf location.
  - Return exact error envelopes for `INVALID_QUERY` and `PRODUCT_NOT_FOUND`.

---

## Phase 5: REST Controllers & Security Configuration (Unit 5)

- [x] **TASK-5.1**: Implement `MotoMatcherController` with endpoints:
  - `GET /api/v1/motomatcher/models`
  - `GET /api/v1/motomatcher/matrix`
  - `POST /api/v1/motomatcher/rules`
- [x] **TASK-5.2**: Implement `ProductPriceCheckController` with endpoint:
  - `GET /api/v1/inventory/pricecheck`
- [x] **TASK-5.3**: Update `com.swift.config.SecurityConfig` to authorize `/api/v1/motomatcher/**` and `/api/v1/inventory/**`.

---

## Phase 6: Automated Tests & Parity Verification (Unit 4d)

- [x] **TASK-6.1**: Implement `MotoMatcherControllerTests` with MockMvc and Caffeine cache hit assertion.
- [x] **TASK-6.2**: Implement `ProductPriceCheckControllerTests` asserting exact calculations and error conditions.
- [x] **TASK-6.3**: Run `mvn clean test` to confirm all Spring Boot backend tests pass.

---

## Phase 7: Convergence, Atomic Commits & PR (Unit 6)

- [x] **TASK-7.1**: Run `speckit-converge` and TypeScript/lint checks.
- [x] **TASK-7.2**: Commit changes in canonical atomic commit units linked to `[SIAA-90]`.
- [x] **TASK-7.3**: Push branch and create Pull Request via `create-pr`.
