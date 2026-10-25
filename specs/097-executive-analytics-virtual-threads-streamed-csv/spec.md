# Feature Specification: High-Performance Executive Analytics Virtual Threads & Streamed Accounting CSV

**Feature Branch**: `feat/SIAA-97-executive-analytics-virtual-threads-streamed-csv`  
**Created**: 2026-10-25  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-97](https://the-three-devsketeers.atlassian.net/browse/SIAA-97)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 5 (Analytics & Reporting)  
**Actions Replaced (7)**: `getExecutiveKpisAction`, `getRevenueTrendAction`, `getCategoryPnlAction`, `getCategoryPnlBreakdownAction`, `getServiceBayStatusAction`, `updateWorkOrderStatusAction`, `exportAccountingCsvAction`  
**Stored Procedures & Tables Wrapped (4)**: `public.get_executive_kpis`, `public.get_revenue_trend_7d`, `public.get_category_pnl`, `public.service_bays` / `public.work_orders`  
**Target View / Scope**: Analytics & Reporting Module (`swift-backend/src/main/java/com/swift/modules/analytics/*`, `gateway/nginx-strangler-gateway.conf`)

---

## 1. Executive Summary & Objective

In Phase 5 of the Next.js to Spring Boot ecosystem migration (Strangler Fig pattern), SWIFT migrates the executive analytics engine and financial reporting dispatcher from Next.js server actions to a high-concurrency Spring Boot 3.3 modular monolith backend.

Store Owners, Financial Accountants, and General Managers rely on real-time operational dashboard metrics (gross revenue today, revenue growth vs yesterday, active work order queues, pending parts count, profit margins, critical low-stock items, rolling 7-day revenue trend comparison, categorized P&L breakdowns, and live workshop service bay utilization). In addition, financial audits and bookkeeping require high-volume CSV exports covering daily, weekly, monthly, or annual transaction datasets.

Under high traffic or large accounting export queries, Node.js event-loop buffering or traditional OS-thread-per-request architectures risk CPU starvation, JVM heap exhaustion (OOM), and request latency spikes. 

This specification establishes:
1. **Parallel Dashboard Query Dispatch via Java 21 Virtual Threads (`StructuredTaskScope.ShutdownOnFailure`)**:
   - `GET /api/v1/analytics/kpis`: Concurrently queries executive KPIs, 7-day revenue trend, category P&L, and workshop service bays in parallel on lightweight virtual threads (`spring.threads.virtual.enabled: true`), aggregating complete dashboard telemetry with sub-150ms latency.
   - Dedicated granular endpoints for client polling and sub-widgets:
     - `GET /api/v1/analytics/revenue-trend`: Returns rolling 7-day revenue trend split by parts counter sales and workshop labor.
     - `GET /api/v1/analytics/category-pnl`: Returns category P&L and COGS summary for `daily`, `weekly`, or `monthly` periods.
     - `GET /api/v1/analytics/service-bays`: Returns live workshop bay status cards and assigned work order details.
     - `PATCH /api/v1/analytics/work-orders/{id}/status`: Atomically updates work order status (`QUEUED`, `IN PROGRESS`, `PENDING_PARTS`, `COMPLETED`, `CANCELLED`) with live bay utilization recalculation.
2. **Non-Blocking Streaming Accounting CSV Export (`StreamingResponseBody`)**:
   - `GET /api/v1/analytics/accounting-csv?period=daily|weekly|monthly|annual`: Streams RFC 4180-compliant CSV records directly to the HTTP response output stream without buffering full datasets in JVM heap memory.
   - Enforces `Content-Type: text/csv; charset=UTF-8` and `Content-Disposition: attachment; filename="swift_revenue_report_YYYY-MM-DD.csv"`.
3. **PostgreSQL Stored Procedure Integration & Graceful In-Memory Fallbacks**:
   - Wraps `public.get_executive_kpis(p_date)`, `public.get_revenue_trend_7d(p_end_date)`, and `public.get_category_pnl(p_start_date, p_end_date)` via Spring JDBC `JdbcTemplate`.
   - Provides deterministic mock fallback calculations for standalone H2 test execution and disconnected edge environments.
4. **Strangler Reverse Proxy Handover**:
   - Configures NGINX gateway to forward `/api/v1/analytics/` directly to Spring Boot backend (`swift-backend:8080`) with `@fallback_to_nextjs` sub-second error safeguard.

---

## 1.1 Clarifications & Architecture Decisions

### Session 2026-10-25
- **Q1: How does Java 21 Structured Concurrency prevent thread leaks when aggregating dashboard telemetry?**
  - **A**: `AnalyticsServiceImpl` leverages Java 21 `StructuredTaskScope.ShutdownOnFailure` inside a virtual-thread executor context. The four child query subtasks (KPIs, revenue trend, category P&L, service bays) are forked simultaneously. If any subtask throws an unhandled exception or times out, the scope cancels all remaining subtasks immediately (`scope.shutdown()`), preventing dangling queries and resource leaks.
- **Q2: What is the streaming strategy for 100,000+ row accounting CSV exports?**
  - **A**: Rather than loading all rows into a `List<CategoryPnlItem>` in heap memory and serializing to a massive `String`, `CsvExportService` utilizes Spring's `StreamingResponseBody`. Rows are streamed directly to the underlying `OutputStream` with flushed row buffers, guaranteeing near-constant O(1) JVM heap memory footprint regardless of dataset size.
- **Q3: What parameters are supported by the accounting CSV export endpoint?**
  - **A**: The endpoint accepts query parameters `period` (`daily`, `weekly`, `monthly`, `annual`), `startDate` (`YYYY-MM-DD`), and `endDate` (`YYYY-MM-DD`). Default is `daily`. The response headers specify `attachment; filename="swift_revenue_report_YYYY-MM-DD.csv"`.
- **Q4: How does Spring Boot handle service bay and work order management?**
  - **A**: Spring Boot maps entities `ServiceBay` (`service_bays`) and `WorkOrder` (`work_orders`). When `PATCH /api/v1/analytics/work-orders/{id}/status` is called, the status is updated, `updated_at` (and `completed_at` if status is `COMPLETED`) is populated, and updated bay details are returned.
- **Q5: How does the system ensure testability in H2 without Supabase PL/pgSQL stored procedures?**
  - **A**: `AnalyticsStoredProcedureWrapper` checks database metadata or catches JDBC errors when PL/pgSQL functions are absent, falling back gracefully to JPA repository aggregations and deterministic calculations.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-97)

* **As a** Store Owner and Accountant,  
* **I want** executive dashboard KPIs and large accounting CSV exports to dispatch in parallel on virtual threads and stream continuously,  
* **so that** financial reporting is instantaneous without blocking worker threads or overflowing JVM heap memory.

---

### Scenario 1: Parallel database query dispatch via Java 21 Virtual Threads (Priority: P1)

* **Given** an executive accesses the dashboard at `"GET /api/v1/analytics/kpis"` (or `"GET /api/v1/analytics/dashboard"`)
* **When** Spring Boot dispatches queries for KPIs, revenue trend, category P&L, and bay statuses
* **Then** all queries execute concurrently using Java 21 `"StructuredTaskScope"` on virtual threads
* **And** the aggregated dashboard payload resolves in under 150ms
* **And** returns `HTTP 200 OK` with complete payload matching `ExecutiveDashboardResponseDto`.

---

### Scenario 2: Non-blocking streaming accounting CSV export (Priority: P1)

* **Given** an accountant requests an annual sales export at `"GET /api/v1/analytics/accounting-csv?period=annual"`
* **When** `"StreamingResponseBody"` writes transaction rows directly to client output stream
* **Then** data streams continuously with Content-Disposition header `"attachment; filename=..."`
* **And** JVM heap memory remains stable without buffering the complete dataset in memory
* **And** output conforms to RFC 4180 with standard column headers: `Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %` followed by rows and summary footer.

---

### Scenario 3: Service bay work order status update (Priority: P1)

* **Given** an active work order in Bay #2 with ID `"wo-101"`
* **When** `"PATCH /api/v1/analytics/work-orders/wo-101/status"` is called with `{"status": "COMPLETED"}`
* **Then** the bay status updates immediately and real-time bay utilization recalculates
* **And** returns `HTTP 200 OK` with updated status, `completed_at` timestamp, and `success: true`.

---

### Scenario 4: Rolling 7-day revenue trend query (Priority: P2)

* **Given** a request to `"GET /api/v1/analytics/revenue-trend"`
* **When** Spring Boot invokes `public.get_revenue_trend_7d` or JPA fallback
* **Then** returns `HTTP 200 OK` containing exactly 7 days of breakdown data (date, day label, parts revenue, labor revenue, total revenue, height percentages) and peak day amount.

---

### Scenario 5: Categorized P&L COGS breakdown by period (Priority: P2)

* **Given** a request to `"GET /api/v1/analytics/category-pnl?period=monthly"`
* **When** Spring Boot calculates or fetches P&L data for the monthly date window
* **Then** returns `HTTP 200 OK` containing categorized revenue, COGS, net profit, margin percentages, and overall financial summary.

---

## 3. Success Criteria & Non-Functional Invariants

1. **Sub-150ms Dashboard Response**: End-to-end aggregated executive KPI request resolves in under 150ms under standard operational conditions.
2. **Virtual Thread Concurrency**: All parallel dashboard subtasks execute on Java 21 Virtual Threads managed via `StructuredTaskScope.ShutdownOnFailure` without pinning OS platform threads.
3. **O(1) Heap Memory Streamed CSV**: Large accounting CSV export streams 100,000+ records via `StreamingResponseBody` with heap utilization remaining below 64MB buffer ceiling.
4. **RFC 4180 Conformance**: All CSV cell values containing commas, quotes, or newlines are properly escaped with double quotes.
5. **Zero Downtime Strangler Proxy**: NGINX gateway reroutes `/api/v1/analytics/` requests with sub-second `@fallback_to_nextjs` resilience.
