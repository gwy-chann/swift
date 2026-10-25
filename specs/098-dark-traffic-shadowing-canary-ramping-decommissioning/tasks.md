# Implementation Tasks: Dark Traffic Shadowing, Canary Traffic Ramping & Next.js Backend Decommissioning

**Feature**: `098-dark-traffic-shadowing-canary-ramping-decommissioning`  
**Jira Issue**: [SIAA-98](https://the-three-devsketeers.atlassian.net/browse/SIAA-98)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Phase**: Phase 6 (Shadow Parity & Cutover)

---

## Task List

### Phase 1: Specifications & Contracts (Unit 1)
- [x] **Task 1.1**: Define complete 8-artifact SpecKit deliverable in `specs/098-dark-traffic-shadowing-canary-ramping-decommissioning/` (`spec.md`, `research.md`, `checklists/requirements.md`, `data-model.md`, `contracts/`, `plan.md`, `quickstart.md`, `tasks.md`).
- [x] **Task 1.2**: Author Zod schemas and TypeScript types for `ParityDiffReport`, `EndpointParityResult`, and `CanaryHealthSnapshot` in `specs/098-dark-traffic-shadowing-canary-ramping-decommissioning/contracts/`.

### Phase 2: Dependencies & Prometheus Telemetry (Unit 2)
- [x] **Task 2.1**: Update `swift-backend/pom.xml` to include `io.rest-assured:rest-assured` (test scope) and `io.micrometer:micrometer-registry-prometheus`.
- [x] **Task 2.2**: Enable `/actuator/prometheus` endpoint in `swift-backend/src/main/resources/application.properties` and permit actuator access in `SecurityConfig.java`.

### Phase 3: REST Assured Parity Test Suite & Automation Harness (Unit 4)
- [x] **Task 3.1**: Implement `RestAssuredParityVerificationTests.java` covering all 46 endpoints across all 10 domain modules (MotoMatcher, Products, Inventory, Pricing, Services, Shifts, POS, Analytics, User Admin, Auth).
- [x] **Task 3.2**: Implement `scripts/parity-diff-engine.ts` supporting field masking, normalized JSON diffing, ISO 8601 tolerance comparison, and exit code reporting.
- [x] **Task 3.3**: Implement `scripts/canary-graduation-check.ts` evaluating 14-day zero defect criteria (P99 < 120ms, error rate < 0.01%, 0 rollbacks).

### Phase 4: NGINX Dark Mirroring, Canary Routing & Next.js Lean Client (Unit 5)
- [x] **Task 4.1**: Update `gateway/nginx-strangler-gateway.conf` with `mirror /shadow;` and `location = /shadow` for asynchronous read shadowing with 0ms client latency penalty.
- [x] **Task 4.2**: Configure weighted canary upstream pool supporting stages 10%, 25%, 50%, 80%, 100% with automated fallback to `@fallback_to_nextjs`.
- [x] **Task 4.3**: Provide SRE zero-downtime hot-reload script `gateway/set-canary-stage.ps1` and `gateway/set-canary-stage.sh`.
- [x] **Task 4.4**: Implement centralized lean API client `lib/api-client.ts` with typed error handling and credentials forwarding.
- [x] **Task 4.5**: Add `@deprecated` delegator notices to legacy Server Actions in `lib/**/actions.ts` to transition Next.js to a lean client.

### Phase 5: Verification & Task Completion (Unit 6)
- [x] **Task 5.1**: Execute Spring Boot backend parity suite (`mvn test`) and verify 100% test pass rate.
- [x] **Task 5.2**: Execute `scripts/parity-diff-engine.ts` and `scripts/canary-graduation-check.ts`.
- [x] **Task 5.3**: Run `npx tsc --noEmit` and confirm 0 TypeScript compiler errors.
- [x] **Task 5.4**: Mark all tasks in `tasks.md` complete and prepare git atomic commit series.
