# Feature Specification: Dark Traffic Shadowing, Canary Traffic Ramping & Next.js Backend Decommissioning

**Feature Branch**: `feat/SIAA-98-dark-traffic-shadowing-canary-ramping-decommissioning`  
**Created**: 2026-10-25  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-98](https://the-three-devsketeers.atlassian.net/browse/SIAA-98)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Migration Phase**: Phase 6 (Shadow Parity & Cutover)  
**Actions Replaced (All 46 Server Actions)**:
- Catalog & Products (4): `searchPartsAction`, `getProductByIdAction`, `lookupShelfLocationAction`, `priceCheckBarcodeAction`
- Stock Adjustment & Inventory (4): `adjustStockAction`, `getProductInventoryAuditAction`, `getLowStockAlertsAction`, `registerProductAction`
- MotoMatcher Compatibility (5): `getMotorcycleModelsAction`, `getDisplacementsAction`, `getUniversalFitmentPartsAction`, `getCompatibilityMatrixAction`, `checkMotoMatcherPartAction`
- Pricing Rules & Discount Matrix (3): `getPricingRulesAction`, `updatePricingRuleAction`, `calculateCustomerDiscountAction`
- Workshop Labor Schedule (4): `getLaborServicesAction`, `saveLaborServiceAction`, `deleteLaborServiceAction`, `getWorkshopLaborScheduleAction`
- Staff Shift Attendance & Punch Clock (6): `clockInAction`, `clockOutAction`, `toggleShiftBreakAction`, `getActiveShiftAction`, `getAttendanceHistoryAction`, `verifyStaffPinAction`
- POS Checkout & Thermal Receipts (5): `processCheckoutAction`, `getTransactionsAction`, `getTransactionByReceiptAction`, `getThermalReceiptByReceiptAction`, `rehydratePosCartAction`
- Executive Analytics & CSV Export (7): `getExecutiveKpisAction`, `getRevenueTrendAction`, `getCategoryPnlAction`, `getCategoryPnlBreakdownAction`, `getServiceBayStatusAction`, `updateWorkOrderStatusAction`, `exportAccountingCsvAction`
- User Administration & Forensic Audit (5): `getUsersAction`, `createUserAction`, `updateUserRoleAction`, `toggleUserStatusAction`, `getForensicAuditLogsAction`
- Auth Sessions & Credentials (3): `loginAction`, `logoutAction`, `getSessionAction`  
**Target View / Scope**: Strangler Reverse-Proxy Gateway (`gateway/nginx-strangler-gateway.conf`), Parity Verification Harness (`swift-backend/src/test/java/com/swift/modules/parity/*`), Parity Diff Engine & Canary Automation (`scripts/*`), Next.js Lean API Client (`lib/api-client.ts`, `lib/**/actions.ts`)

---

## 1. Executive Summary & Objective

Phase 6 represents the culminating milestone of the SWIFT Next.js-to-Spring Boot Strangler Fig migration. Over Phases 0 through 5, high-concurrency business domains (MotoMatcher, Product Catalog, Stock Adjustments, Pricing Rules, Workshop Labor, Staff Punch Clock, POS Checkout, and Executive Analytics) were successfully engineered into a Spring Boot 3.3 (Java 21 LTS) modular monolith with virtual threads and HikariCP connection pooling.

To retire the legacy Next.js backend safely without catastrophic production regressions or service interruption, Phase 6 institutes:
1. **Asynchronous Dark Traffic Shadowing**:
   - NGINX read-traffic mirroring (`mirror /shadow`) clones live production HTTP GET requests to the Spring Boot backend asynchronously.
   - Client responses continue to be returned from Next.js with **0 added latency**; mirrored responses are processed out-of-band by the Parity Diff Engine.
2. **Automated 46-Endpoint Parity Assertion Suite**:
   - A comprehensive REST Assured and TypeScript assertion engine compares Spring Boot and Next.js responses across all 46 endpoints against golden-master contract schemas.
   - Validates 100% byte-accurate semantic equivalence, HTTP status codes, numeric cents precision, and ISO 8601 timestamps while ignoring non-deterministic fields (session nonces, request UUIDs).
3. **Automated Weighted Canary Traffic Ramping**:
   - Fine-grained traffic shifting (10% ➔ 25% ➔ 50% ➔ 80% ➔ 100%) through NGINX weighted upstream pools and `split_clients`.
   - Real-time Prometheus metrics telemetry scraping Spring Boot `/actuator/prometheus` for error rate and P95/P99 latencies.
4. **14-Day Canary Graduation Gate & Legacy Server Action Decommissioning**:
   - Automated graduation evaluator verifies: 14 consecutive days operating at 100% traffic with 0 rollbacks, P99 latency < 120ms, and error rate < 0.01%.
   - Upon meeting the criteria, Next.js permanently transitions into a lean client consuming Spring Boot REST APIs (`lib/api-client.ts`), and legacy Server Actions in `lib/**/actions.ts` are deprecated and safely retired.

---

## 1.1 Clarifications & Architecture Decisions

### Session 2026-10-25
- **Q1: How does NGINX mirror traffic without blocking client response times?**
  - **A**: NGINX `mirror` directive issues an internal background subrequest (`location = /shadow`). The master response is written to the client connection immediately. The mirrored subrequest ignores client aborts (`proxy_ignore_client_abort on`) and sends its copy to Spring Boot out-of-band.
- **Q2: Which HTTP methods are subject to dark shadowing?**
  - **A**: Strictly idempotent **read requests** (`GET`, `HEAD`, `OPTIONS`). Mutation endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) are not mirrored to avoid duplicate inventory decrements, double clock-ins, or phantom financial transactions. Mutations transition directly via weighted canary cutover with sub-second rollback.
- **Q3: What fields are masked during automated parity diffing?**
  - **A**: Non-deterministic runtime fields—such as dynamic UUIDs, request tracing IDs (`traceparent`, `X-Request-Id`), generated JWT issuance timestamps (`iat`, `exp`), and millisecond-level database timestamps (`created_at`)—are normalized or compared with tolerance windows (±2s) while business payloads, calculations, and error codes require 100% exact parity.
- **Q4: How does Next.js interact with Spring Boot after Server Action retirement?**
  - **A**: Next.js App Router client components and Server Components invoke the centralized `lib/api-client.ts` client wrapper, passing session cookies / JWT headers to the Strangler Gateway on `/api/v1/*`. Legacy server actions are replaced by lean delegators that forward requests to `apiClient` with deprecation logging.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-98)

* **As a** Lead Architect and SRE,  
* **I want** dark traffic shadowing, automated parity diffing, and weighted canary ramping across all 46 endpoints,  
* **so that** we can mathematically verify 100% bug-free equivalence in production before retiring legacy Next.js backend code.

---

### Scenario 1: Dark traffic shadowing with zero production latency impact (Priority: P1)

* **Given** live production read traffic hits `GET /api/v1/motomatcher/models` (or any read endpoint)
* **When** NGINX asynchronously mirrors the request to Spring Boot via `mirror /shadow/read-mirror`
* **Then** the client receives the Next.js response immediately with 0ms added latency
* **And** the Parity Diff Engine verifies that Spring Boot and Next.js responses match 100% in contract and payload
* **And** errors in the shadow backend do not alter or disrupt the client's HTTP response.

---

### Scenario 2: Dynamic weighted canary traffic ramping (Priority: P1)

* **Given** the system is configured at canary stage `canary-stage-25` (25% Spring Boot, 75% Next.js)
* **When** 1,000 requests are dispatched across POS and Catalog endpoints
* **Then** approximately 250 requests are processed by Spring Boot (`upstream springboot_backend`) and 750 by Next.js
* **And** SRE operators can shift weights to 50%, 80%, and 100% with zero NGINX downtime via reload (`nginx -s reload`).

---

### Scenario 3: 14-day canary graduation and safe code retirement (Priority: P1)

* **Given** weighted canary routing reaches 100% on Spring Boot
* **When** the system operates for 14 consecutive days with 0 rollbacks, P99 < 120ms, and error rate < 0.01%
* **Then** the canary graduation gatekeeper (`scripts/canary-graduation-check.ts`) marks the milestone as PASSED
* **And** legacy Next.js Server Actions in `lib/**/actions.ts` transition to thin delegators calling `lib/api-client.ts`
* **And** the Next.js application permanently operates as a lean client of the Spring Boot REST API.

---

### Scenario 4: Automated parity assertion suite against golden-master responses (Priority: P2)

* **Given** the REST Assured parity test suite executes in `swift-backend`
* **When** requests are issued against all 46 endpoints using golden-master test vectors
* **Then** all 46 endpoints return HTTP 200/201 (or expected error codes) matching golden-master schema definitions
* **And** numeric monetary figures match exact two-decimal cent precision.

---

### Scenario 5: Sub-second automated rollback threshold telemetry (Priority: P2)

* **Given** Spring Boot experiences a transient spike exceeding 0.01% error rate or P99 > 120ms during canary ramping
* **When** Prometheus/Actuator telemetry signals the threshold violation
* **Then** NGINX gateway automatically fails over to `@fallback_to_nextjs` within 5 seconds
* **And** appends the response telemetry header `X-Swift-Fallback: true`.

---

## 3. Functional Requirements

- **FR-001**: Configure NGINX reverse-proxy gateway (`gateway/nginx-strangler-gateway.conf`) with `mirror /shadow` directive for all `/api/v1/` read endpoints without impacting primary client latency.
- **FR-002**: Provide configurable canary upstream weights (`10%`, `25%`, `50%`, `80%`, `100%`) using NGINX `split_clients` and upstream weights with zero-downtime hot-reload scripts (`gateway/set-canary-stage.sh` / `.ps1`).
- **FR-003**: Implement REST Assured parity assertion suite in `swift-backend/src/test/java/com/swift/modules/parity/RestAssuredParityVerificationTests.java` covering all 46 endpoints across all 9 business modules.
- **FR-004**: Add `micrometer-registry-prometheus` and `rest-assured` dependencies to `swift-backend/pom.xml`, exposing `/actuator/prometheus` metrics.
- **FR-005**: Build Parity Diff Engine (`scripts/parity-diff-engine.ts`) supporting normalized JSON diffing, field masking, timestamp tolerances, and diff logging.
- **FR-006**: Build Canary Graduation Gatekeeper (`scripts/canary-graduation-check.ts`) evaluating the 14-day zero-defect criteria (P99 < 120ms, error rate < 0.01%, 0 rollbacks).
- **FR-007**: Implement central Lean API Client (`lib/api-client.ts`) providing unified type-safe HTTP communication from Next.js to Spring Boot.
- **FR-008**: Update legacy Next.js Server Actions in `lib/**/actions.ts` to delegate to `apiClient` while retaining backward-compatible signatures and deprecation telemetry.

---

## 4. Non-Functional & Operational Requirements

- **Zero Production Latency Added**: NGINX shadow subrequests must not increase time-to-first-byte (TTFB) on client responses.
- **Fault Isolation**: Shadow backend errors or slow responses must never abort or delay the primary response.
- **Zero-Downtime Rollout**: Upstream canary adjustments must execute via NGINX graceful reload without dropping TCP connections.
- **Precision Fidelity**: Monetary pricing, discounts, tax rates, and inventory totals must match to the exact integer cent.
- **Constitutional Compliance**: Design tokens, TypeScript strict mode (`tsc --noEmit`), and atomic commit traceability must be maintained 100%.
