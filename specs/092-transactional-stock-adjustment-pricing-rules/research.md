# Research & Architecture Decisions: Transactional Stock Adjustment Engine & Pricing Markup Rules

**Feature**: `specs/092-transactional-stock-adjustment-pricing-rules`  
**Jira Issue**: [SIAA-92](https://the-three-devsketeers.atlassian.net/browse/SIAA-92)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Approved Architecture  

---

## 1. Technical Context & Stack Constraints

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Runtime & Framework** | Java 21 + Spring Boot 3.3.4 | Project standard modular monolith runtime with Virtual Threads enabled. |
| **Stored Procedure Integration** | `SimpleJdbcCall` / `JdbcTemplate` | Type-safe execution of PostgreSQL stored procedure `public.adjust_product_stock`. |
| **Concurrency Control** | `@Transactional(isolation = Isolation.REPEATABLE_READ)` + Pessimistic Row Lock (`FOR UPDATE`) | Eliminates lost updates and ensures strict sequential execution on SKU records during race conditions. |
| **Large Data Streaming** | `StreamingResponseBody` | Bypasses in-memory buffering, piping CSV bytes directly to HTTP response output stream to prevent JVM heap exhaustion. |
| **Pricing Rules Persistence** | Spring Data JPA (`JpaRepository<PricingRules, Long>`) | Singleton entity mapping for global pricing configurations and immutable audit logs. |
| **Reverse Proxy Handover** | NGINX Strangler Gateway | Incremental migration routing `/api/v1/inventory/stock-adjust` and `/api/v1/pricing/rules` to Spring Boot. |

---

## 2. Architecture Decisions & Tradeoff Analysis

### Decision 1: `SimpleJdbcCall` with Graceful Service Fallback
- **Context**: The existing database migration `20261011000000_stock_adjustment_rpc.sql` defines `public.adjust_product_stock(p_sku, p_type, p_delta, p_reason, p_user_name)`. In Spring Boot, we wrap this call using Spring JDBC's `SimpleJdbcCall`.
- **Alternatives Considered**:
  1. *Direct Spring Data JPA mutation*: Requires multiple roundtrips and doesn't reuse the audited stored procedure.
  2. *Raw JDBC SQL query execution*: Verbose and error-prone parameter binding.
  3. *`SimpleJdbcCall` with JPA pessimistic locking fallback*: Primary execution runs the PostgreSQL function; if executed in an H2 or local test environment without PL/pgSQL functions loaded, it falls back to an atomic service method with `ProductRepository.findWithPessimisticLockBySku(sku)`.
- **Selected**: **Alternative 3**. Provides zero behavioral drift in production while guaranteeing unit test portability.

---

### Decision 2: Streamed CSV Export via `StreamingResponseBody`
- **Context**: Auditors regularly export stock adjustment ledgers. Loading tens of thousands of rows into a Java `List<StockAdjustmentLog>` and serializing into a monolithic string risks Out-Of-Memory (OOM) errors.
- **Implementation Strategy**:
  - `InventoryStockController.exportCsv(...)` returns `StreamingResponseBody`.
  - Service queries records with an iterative cursor or paginated chunks and writes RFC 4180 lines:
    ```
    ID,SKU,Adjustment Type,Quantity Delta,Previous Stock,New Stock,Reason,User Name,Created At
    ```
  - Flushes output stream every 100 rows to ensure continuous network transmission and constant O(1) JVM heap memory consumption.

---

### Decision 3: Concurrency Serialization Testing Strategy
- **Context**: Jira SIAA-92 Acceptance Scenario 2 requires verifying that concurrent adjustments targeting the same SKU execute with 0 lost updates.
- **Testing Approach**:
  - Use `java.util.concurrent.ExecutorService` or `CompletableFuture.allOf` with 10 concurrent threads simultaneously submitting stock adjustments of `+1` or `-1` to the same SKU (initial stock 50).
  - Verify that the final database stock count exactly matches `50 + net_deltas`.
  - Verify that exactly 10 distinct audit ledger records are inserted.

---

### Decision 4: Pricing Markup Rules Module Architecture
- **Context**: `public.pricing_rules` is a singleton table (id=1). Shop management configures retail, wholesale, and aftermarket markups along with hourly labor rates.
- **Implementation Strategy**:
  - Dedicated `PricingRules` JPA entity with `@Table(name = "pricing_rules")`.
  - `PricingRulesAuditLog` entity with `@Table(name = "pricing_rules_audit_logs")`.
  - `PricingRulesController`:
    - `GET /api/v1/pricing/rules`: Returns active rules.
    - `PUT /api/v1/pricing/rules`: Validates constraints (markup in (0, 200], labor >= 0), updates singleton, writes audit record, returns updated rules.
