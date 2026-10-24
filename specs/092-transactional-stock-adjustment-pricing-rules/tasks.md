# Implementation Tasks: Transactional Stock Adjustment Engine & Pricing Markup Rules

**Feature**: `specs/092-transactional-stock-adjustment-pricing-rules`  
**Jira Issue**: [SIAA-92](https://the-three-devsketeers.atlassian.net/browse/SIAA-92)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Implementation  

---

## Task Breakdown & Dependencies

### Phase 1: Domain Entities & Repositories
- [ ] **Task 1.1**: Create `StockAdjustmentLog` JPA entity and `StockAdjustmentLogRepository` in `com.swift.modules.inventory.model` & `repository`.
- [ ] **Task 1.2**: Create `PricingRules` and `PricingRulesAuditLog` entities with `PricingRulesRepository` and `PricingRulesAuditLogRepository` in `com.swift.modules.pricing.model` & `repository`.
- [ ] **Task 1.3**: Add pessimistic locking query method `findWithPessimisticLockBySku` in `ProductRepository`.

### Phase 2: DTOs and Core Business Logic Services
- [ ] **Task 2.1**: Define DTO records: `StockAdjustmentRequest`, `StockAdjustmentResponse`, `StockAuditLogsResponse`, `StockAuditSummaryMetricsDto`, `PricingRulesDto`, and `UpdatePricingRulesRequest`.
- [ ] **Task 2.2**: Implement `InventoryService` and `InventoryServiceImpl` with `SimpleJdbcCall` wrapping `public.adjust_product_stock` and atomic pessimistic locking fallback.
- [ ] **Task 2.3**: Implement `PricingRulesService` and `PricingRulesServiceImpl` with singleton retrieval, validation, and audit trail creation.

### Phase 3: REST Controllers & Streaming CSV Response
- [ ] **Task 3.1**: Implement `InventoryStockController` with `POST /api/v1/inventory/stock-adjust` and `GET /api/v1/inventory/stock-adjust/logs`.
- [ ] **Task 3.2**: Implement `StreamingResponseBody` CSV export endpoint `GET /api/v1/inventory/stock-adjust/export-csv`.
- [ ] **Task 3.3**: Implement `PricingRulesController` with `GET /api/v1/pricing/rules` and `PUT /api/v1/pricing/rules`.

### Phase 4: Gateway Reverse Proxy & Security Configuration
- [ ] **Task 4.1**: Configure `SecurityConfig.java` to secure inventory and pricing routes with proper roles (`ADMIN`, `STAFF`).
- [ ] **Task 4.2**: Update NGINX Strangeler reverse proxy configuration (`gateway/nginx-strangler-gateway.conf`) to route `/api/v1/inventory/` and `/api/v1/pricing/` to Spring Boot.

### Phase 5: Verification & Multi-Threaded Concurrency Testing
- [ ] **Task 5.1**: Build `InventoryStockControllerTests.java` covering Scenarios 1, 3, and 5 (atomic adjustment, streamed CSV, and negative stock rejection).
- [ ] **Task 5.2**: Build `InventoryConcurrencyTests.java` simulating 10 parallel threads executing adjustments on the same SKU to verify 0 lost updates (Scenario 2).
- [ ] **Task 5.3**: Build `PricingRulesControllerTests.java` verifying Scenario 4 (querying and updating global markup rules and audit tracking).
