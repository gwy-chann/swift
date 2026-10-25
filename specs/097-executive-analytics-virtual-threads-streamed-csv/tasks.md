# Implementation Tasks: High-Performance Executive Analytics Virtual Threads & Streamed Accounting CSV

**Feature**: `specs/097-executive-analytics-virtual-threads-streamed-csv`  
**Jira Issue**: [SIAA-97](https://the-three-devsketeers.atlassian.net/browse/SIAA-97)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: In Progress  

---

## Phase 1: Specification & Design Artifacts (Unit 1)

- [x] **Task 1.1**: Define specification and architecture decisions (`spec.md`, `research.md`).
- [x] **Task 1.2**: Define requirements checklist (`checklists/requirements.md`).
- [x] **Task 1.3**: Define entity data model and TypeScript contracts (`data-model.md`, `contracts/analytics.contract.ts`).
- [x] **Task 1.4**: Define implementation plan, quickstart, and tasks (`plan.md`, `quickstart.md`, `tasks.md`).
- [x] **Task 1.5**: Commit Unit 1 specification artifacts (`docs(specs): [SIAA-97] define executive analytics virtual threads and streamed csv specifications`).

---

## Phase 2: Domain Entities, Repositories & DTOs (Unit 4 - Part 1)

- [ ] **Task 2.1**: Implement `ServiceBay` and `WorkOrder` JPA entities in `com.swift.modules.analytics.model`.
- [ ] **Task 2.2**: Implement `ServiceBayRepository` and `WorkOrderRepository` in `com.swift.modules.analytics.repository`.
- [ ] **Task 2.3**: Define Java 21 DTO records in `com.swift.modules.analytics.dto`:
  - `ExecutiveKpiDto`
  - `RevenueTrendDayDto` & `WeeklyRevenueDto`
  - `CategoryPnlItemDto`, `CategoryPnlSummaryDto`, & `CategoryPnlDto`
  - `ServiceBayDisplayDto`
  - `ExecutiveDashboardResponseDto`
  - `UpdateWorkOrderStatusRequest` & `UpdateWorkOrderResponseDto`

---

## Phase 3: Services, Structured Task Scope & CSV Streaming (Unit 4 - Part 2)

- [ ] **Task 3.1**: Implement `AnalyticsStoredProcedureWrapper` executing `public.get_executive_kpis`, `public.get_revenue_trend_7d`, and `public.get_category_pnl` via `JdbcTemplate` with in-memory fallbacks.
- [ ] **Task 3.2**: Implement `AnalyticsService` and `AnalyticsServiceImpl` orchestrating `StructuredTaskScope.ShutdownOnFailure` to query KPIs, revenue trend, category P&L, and bay status concurrently on virtual threads.
- [ ] **Task 3.3**: Implement `CsvExportService` and `CsvExportServiceImpl` streaming RFC 4180 CSV via `StreamingResponseBody` directly to the client output stream.

---

## Phase 4: Controllers & Gateway Routing (Unit 5)

- [ ] **Task 4.1**: Implement `AnalyticsController` exposing:
  - `GET /api/v1/analytics/kpis` (and `/api/v1/analytics/dashboard`)
  - `GET /api/v1/analytics/revenue-trend`
  - `GET /api/v1/analytics/category-pnl`
  - `GET /api/v1/analytics/service-bays`
  - `PATCH /api/v1/analytics/work-orders/{id}/status`
  - `GET /api/v1/analytics/accounting-csv`
- [ ] **Task 4.2**: Configure `gateway/nginx-strangler-gateway.conf` reverse proxy routing for `/api/v1/analytics/` to Spring Boot backend with `@fallback_to_nextjs`.
- [ ] **Task 4.3**: Commit Unit 4 & 5 implementation (`feat(analytics): [SIAA-97] implement virtual thread parallel query dispatch and streamed accounting csv`).

---

## Phase 5: Verification, Concurrency & Benchmark Testing (Unit 4 - Part 3)

- [ ] **Task 5.1**: Implement `AnalyticsControllerTests` verifying REST endpoints, query filters, and status mutation.
- [ ] **Task 5.2**: Implement `VirtualThreadsStructuredScopeTests` verifying concurrent execution, sub-150ms latency, and scope shutdown on failure.
- [ ] **Task 5.3**: Implement `CsvStreamingMemoryBenchmarkTests` validating heap memory stability during 100,000+ row export streams.
- [ ] **Task 5.4**: Execute Maven test suite and verify clean compilation and passing tests.

---

## Phase 6: Tasks Completion & Sync (Unit 6)

- [ ] **Task 6.1**: Mark all tasks complete in `tasks.md`.
- [ ] **Task 6.2**: Commit Unit 6 completion (`docs(specs): [SIAA-97] mark all implementation tasks complete and sync contracts`).
