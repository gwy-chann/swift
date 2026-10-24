# Research & Architecture Decisions: MotoMatcher Vehicle Fitment & Product Price Checker

**Feature**: `specs/090-motomatcher-vehicle-fitment-price-checker`  
**Jira Issue**: [SIAA-90](https://the-three-devsketeers.atlassian.net/browse/SIAA-90)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Approved Architecture  

---

## 1. Technical Context & Stack Constraints

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Runtime & Framework** | Java 21 + Spring Boot 3.3.4 | Project standard modular monolith runtime. |
| **In-Memory Cache** | Caffeine Cache (`com.github.ben-manes.caffeine:caffeine`) | Ultra-fast near-optimal cache with W-TinyLFU eviction and near-zero GC pause overhead (<1ms in-memory hit). |
| **Database Access** | Spring `JdbcTemplate` & Spring Data JPA | Direct stored procedure execution for complex JSONB RPCs via `JdbcTemplate`; repository entities for CRUD and model queries. |
| **JSON Deserialization** | Jackson `ObjectMapper` | High-throughput direct mapping of PostgreSQL `JSONB` strings into typed Java records/DTOs. |
| **Gateway Routing** | NGINX Reverse Proxy (`/api/v1/motomatcher/`, `/api/v1/inventory/`) | Strangler pattern routing incoming client requests directly to Spring Boot with `@fallback_to_nextjs`. |

---

## 2. Architecture Decisions & Tradeoff Analysis

### Decision 1: `JdbcTemplate` vs Hibernate `StoredProcedureQuery` for `public.get_moto_matcher_matrix`
- **Context**: The existing PostgreSQL stored procedure `public.get_moto_matcher_matrix(p_model_id UUID, p_category TEXT, p_search TEXT) RETURNS JSONB` already aggregates candidate OEM and aftermarket parts, performs upsell delta math, and formats JSON.
- **Alternatives Considered**:
  1. *JPA `@NamedStoredProcedureQuery` / `StoredProcedureQuery`*: Requires complex parameter registration and object mapping, often struggling with PostgreSQL `JSONB` return types.
  2. *Rewrite query logic in Spring Data JPA*: Duplicates complex CTEs, benchmark comparisons, and upsell delta formatting already thoroughly tested in SQL migration `20261016000000_moto_matcher_matrix_rpc.sql`.
  3. *Spring `JdbcTemplate` with raw SQL query*:
     ```java
     String sql = "SELECT public.get_moto_matcher_matrix(?::uuid, ?, ?)::text";
     String json = jdbcTemplate.queryForObject(sql, String.class, modelId, category, search);
     ```
- **Selected**: **Alternative 3 (`JdbcTemplate`)**. It allows executing the database RPC with zero overhead, passing the JSON string straight into Jackson `ObjectMapper` to yield `MotoMatcherMatrixDto`.

---

### Decision 2: Caffeine In-Memory Caching vs Redis
- **Context**: Motorcycle models catalog (`public.motorcycle_models`) is read-heavy (queried on every counter terminal session) and mutates very infrequently.
- **Alternatives Considered**:
  1. *External Redis instance*: Requires additional infrastructure, network hop (1-3ms), and connection pooling.
  2. *Spring default `ConcurrentMapCache`*: Lacks TTL, maximum size eviction, and stats monitoring.
  3. *Caffeine Cache*: In-process memory (<0.1ms), near-zero overhead, configurable size limits, and automatic eviction on updates.
- **Selected**: **Alternative 3 (Caffeine)**. Add `spring-boot-starter-cache` and `com.github.ben-manes.caffeine:caffeine` to `pom.xml`. Configure a 1-hour expiration and 5,000 maximum entries.

---

### Decision 3: Product Price Check Query Strategy & Margin Simulator
- **Context**: Cashiers and counter staff scan barcodes or enter SKUs. Sometimes customers ask for parts by name. Sub-50ms execution is critical to eliminate shop-floor lag.
- **Selected Strategy**:
  1. Sanitize query string (trim whitespace, reject empty/blank with `INVALID_QUERY`).
  2. First query by exact SKU: `SELECT p FROM Product p WHERE LOWER(p.sku) = LOWER(:query)`.
  3. If not found, query by partial name: `SELECT p FROM Product p WHERE LOWER(p.name) LIKE LOWER(CONCAT('%', :query, '%')) ORDER BY p.name ASC` limit 1.
  4. Perform in-memory margin calculations:
     - `cost`: purchase cost from supplier.
     - `retailPrice`: standard retail price (SRP).
     - `wholesalePrice`: bulk wholesale price.
     - `scPwdPrice`: 20% statutory Senior Citizen / PWD discount = `retail * 0.8`.
     - `grossMarkupPercent`: `((retail - cost) / cost) * 100` (1 decimal place).
     - `wholesaleMarkupPercent`: `((wholesale - cost) / cost) * 100` (1 decimal place).
  5. Return exact envelope matching Next.js `ProductPriceCheckResult`.

---

### Decision 4: Contract Parity & Wire Format Alignment
- Next.js MotoMatcher payload uses `snake_case` keys in JSON (`oem_parts`, `aftermarket_parts`, `retail_price`, `stock_level`, `shelf_location`, `fitment_type`, `upsell_delta_amount`, `upsell_badge`, `oem_reference_sku`).
- Next.js Price Check payload uses `camelCase` keys (`retailPrice`, `wholesalePrice`, `scPwdPrice`, `grossMarkupPercent`, `wholesaleMarkupPercent`, `location`).
- Java DTOs will use `@JsonProperty` annotations or Jackson naming conventions to maintain 100% field parity with client contracts.
