# Research & Architecture Decisions: High-Concurrency POS Checkout Orchestration & Thermal Receipts

**Feature**: `specs/096-pos-checkout-orchestration-thermal-receipts`  
**Jira Issue**: [SIAA-96](https://the-three-devsketeers.atlassian.net/browse/SIAA-96)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Approved Architecture  

---

## 1. Technical Context & Stack Constraints

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Runtime & Framework** | Java 21 + Spring Boot 3.3.4 | High-throughput concurrent POS processing with Virtual Threads and Jakarta validation. |
| **Domain Module** | `com.swift.modules.pos` | Dedicated module encapsulating checkout orchestration, transactions, and receipt formatting. |
| **Pessimistic Locking** | `SELECT ... FOR UPDATE` via `@Lock(LockModeType.PESSIMISTIC_WRITE)` | Eliminates inventory race conditions and negative inventory under simultaneous cashier checkouts. |
| **Deadlock Avoidance** | Deterministic SKU ordering (`ORDER BY item_sku_or_code ASC`) | Acquires locks in strict alphabetical order to eliminate cyclic resource graph deadlocks. |
| **Stored Procedure** | `public.process_pos_checkout` | Native PostgreSQL execution via Spring JDBC `JdbcTemplate` / `SimpleJdbcCall`. |
| **Thermal Receipts** | ESC/POS Command Generator | Generates binary/text escape sequences for 58mm/80mm thermal printers alongside standard JSON. |
| **Strangler Reverse Proxy** | NGINX Gateway | Routes `/api/v1/pos/` traffic to Spring Boot (`swift-backend:8080`) with `@fallback_to_nextjs`. |

---

## 2. Architecture Decisions & Tradeoff Analysis

### Decision 1: POS Module Boundary & Subpackages
- **Context**: SIAA-96 migrates 5 Next.js server actions:
  - `getLaborServicesAction`
  - `processCheckoutAction`
  - `getTransactionsAction`
  - `getTransactionByReceiptAction`
  - `getThermalReceiptByReceiptAction`
- **Implementation Structure**:
  - `com.swift.modules.pos.controller.PosCheckoutController`
  - `com.swift.modules.pos.service.PosCheckoutService` & `PosCheckoutServiceImpl`
  - `com.swift.modules.pos.service.ThermalReceiptService` & `ThermalReceiptServiceImpl`
  - `com.swift.modules.pos.service.PosStoredProcedureWrapper`
  - `com.swift.modules.pos.model.Transaction` & `TransactionItem`
  - `com.swift.modules.pos.repository.TransactionRepository` & `TransactionItemRepository`
  - `com.swift.modules.pos.dto.*` (Request and Response records)

---

### Decision 2: Stored Procedure Wrapping & Hybrid Fallback
- **Context**: In production on Supabase/PostgreSQL, `public.process_pos_checkout` is executed. In CI or local H2 in-memory testing, stored procedures are not preloaded.
- **Strategy**:
  - `PosStoredProcedureWrapper` wraps the PL/pgSQL function using `JdbcTemplate`.
  - When running against PostgreSQL, the stored procedure executes natively.
  - If the database dialect is H2 or the procedure is absent, `PosCheckoutServiceImpl` executes the JPA fallback:
    1. Sorts items by SKU.
    2. Queries each physical product with pessimistic lock (`productRepository.findWithPessimisticLockBySku(sku)`).
    3. Validates stock availability.
    4. Updates stock and saves `StockAdjustmentLog`.
    5. Saves `Transaction` and `TransactionItem` entities.
- **Benefit**: 100% test coverage in CI with zero external database dependencies, while preserving high-performance stored procedure execution in production.

---

### Decision 3: ESC/POS Command Generation
- **Context**: Scenario 3 requires printable ESC/POS formatting commands matching the physical receipt template.
- **Template Spec**:
  - Header: Centered (`ESC a 1`), Bold (`ESC E 1`), Double Height (`GS ! 16`) for store name: `"SWIFT MOTO SERVICE"`.
  - Store details: `"104 Rizal Ave, Motor City"`, `"TIN: 409-281-992-000"`, `"Tel: (02) 8921-4450"`.
  - Separator: `--------------------------------` (32 chars for 58mm) or `------------------------------------------` (42 chars for 80mm).
  - Receipt metadata: Receipt No, Cashier Name, Date/Time.
  - Line items: Name, Quantity, Unit Price, Subtotal.
  - Totals: Subtotal, Discount, Total Due, Cash Tendered, Change Due.
  - Barcode: CODE128 or CODE39 representation (`GS k 4 ...`).
  - Footer & Cut: Warranty disclaimer, feed 3 lines (`ESC d 3`), partial paper cut (`GS V 66 0`).

---

### Decision 4: Concurrency Stress Test Architecture
- **Context**: Jira requirement checklist Item 5 requires simulating 50 concurrent cashiers checking out without deadlocks.
- **Strategy**:
  - JUnit 5 integration test using `java.util.concurrent.Executors.newVirtualThreadPerTaskExecutor()` or `CompletableFuture` with a `CountDownLatch`.
  - Preconditions: Create a product with `50` units in stock.
  - Execution: Spawn 50 threads that concurrently fire `/api/v1/pos/checkout` buying `1` unit each.
  - Verification: All 50 succeed with HTTP 200, exactly 50 transaction records created, product stock is exactly 0, and zero deadlock exceptions thrown.
