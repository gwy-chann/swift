# Implementation Plan: Dark Traffic Shadowing, Canary Traffic Ramping & Next.js Backend Decommissioning

**Feature**: `098-dark-traffic-shadowing-canary-ramping-decommissioning`  
**Jira Issue**: [SIAA-98](https://the-three-devsketeers.atlassian.net/browse/SIAA-98)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Phase**: Phase 6 (Shadow Parity & Cutover)

---

## 1. Technical Architecture & Component Hierarchy

```
                                  Client Browser / Cashier POS
                                               │
                                               ▼
                              ┌──────────────────────────────────┐
                              │  NGINX Strangler Gateway (:80)   │
                              │  - Read Traffic Mirroring        │
                              │  - Weighted Canary Upstream Pool │
                              │  - Sub-Second Fallback Safeguard │
                              └────────┬────────────────┬────────┘
                                       │                │
            Mirrored Read Requests     │                │ Primary / Canary Traffic
            (X-Swift-Shadow: true)     │                │ (10% to 100%)
                                       │                │
                                       ▼                ▼
                     ┌──────────────────────┐    ┌──────────────────────┐
                     │   Spring Boot 3.3    │    │   Next.js Frontend   │
                     │   Modular Monolith   │    │    & Lean Client     │
                     │        (:8080)       │    │        (:3000)       │
                     └──────────┬───────────┘    └──────────┬───────────┘
                                │                           │
                                ▼                           ▼
                     ┌──────────────────────────────────────────┐
                     │     Parity Diff Engine & Assertion       │
                     │  - REST Assured Suite (46 Endpoints)     │
                     │  - scripts/parity-diff-engine.ts         │
                     │  - scripts/canary-graduation-check.ts    │
                     └──────────────────────────────────────────┘
```

---

## 2. Layer-by-Layer Architectural Decomposition (Atomic Commits)

In accordance with `.agents/rules/atomic-commit.md`, implementation changes are decomposed into canonical units:

### Unit 1: Specification & Design Artifacts (`docs(specs): [SIAA-98] ...`)
- `specs/098-dark-traffic-shadowing-canary-ramping-decommissioning/` complete 8 artifacts:
  - `spec.md`, `research.md`, `checklists/requirements.md`, `data-model.md`, `contracts/`, `plan.md`, `quickstart.md`, `tasks.md`.

### Unit 2: Dependencies & Tooling Configs (`chore(tooling): [SIAA-98] ...`)
- `swift-backend/pom.xml`: Add `io.rest-assured:rest-assured` (test) and `io.micrometer:micrometer-registry-prometheus`.
- Expose `/actuator/prometheus` in `swift-backend/src/main/resources/application.properties` and security config.

### Unit 4: Domain Models, Business Logic & Verification Tests (`feat(parity): [SIAA-98] ...`)
- `swift-backend/src/test/java/com/swift/modules/parity/RestAssuredParityVerificationTests.java`:
  - 46-endpoint comprehensive parity test suite using REST Assured against MockMvc/SpringBootTest.
  - Validates all 10 domain modules (Catalog, Stock, MotoMatcher, Pricing, Workshop, Shift Attendance, POS, Analytics, User Admin, Auth).
- `scripts/parity-diff-engine.ts`:
  - Normalized JSON deep comparison engine with field masking, timestamp tolerances, and diff reporter.
- `scripts/canary-graduation-check.ts`:
  - 14-day zero-defect criteria validator (0 rollbacks, P99 < 120ms, error rate < 0.01%).

### Unit 5: Gateway Routing & Next.js Lean Client Transition (`feat(gateway): [SIAA-98] ...`)
- `gateway/nginx-strangler-gateway.conf`:
  - Add `mirror /shadow;` and `location = /shadow` for asynchronous read shadowing.
  - Add dynamic weighted canary upstream with stages (`10%`, `25%`, `50%`, `80%`, `100%`).
- `gateway/set-canary-stage.ps1` & `gateway/set-canary-stage.sh`:
  - SRE operational tool to dynamically shift canary stages with zero downtime.
- `lib/api-client.ts`:
  - Centralized type-safe HTTP client dispatching to Spring Boot REST API through gateway.
- `lib/**/actions.ts`:
  - Mark legacy server actions with `@deprecated` notice and wire them to delegate to `apiClient`.

### Unit 6: Tasks Completion & Sync (`docs(specs): [SIAA-98] ...`)
- Mark all items in `specs/098-dark-traffic-shadowing-canary-ramping-decommissioning/tasks.md` complete `[x]`.

---

## 3. Verification Plan

1. **Spring Boot Backend Parity Suite**:
   ```powershell
   $env:JAVA_HOME = "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2024.3.3\jbr"
   & "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2024.3.3\plugins\maven\lib\maven3\bin\mvn.cmd" test "-Dtest=RestAssuredParityVerificationTests,HealthActuatorTests"
   ```
2. **Prometheus Telemetry Endpoint Verification**:
   - Verify `/actuator/prometheus` renders valid OpenMetrics format containing `http_server_requests_seconds`.
3. **Parity Diff Engine & Canary Graduation Scripts**:
   ```powershell
   npx tsx scripts/parity-diff-engine.ts
   npx tsx scripts/canary-graduation-check.ts
   ```
4. **TypeScript Strict Typecheck**:
   ```powershell
   npx tsc --noEmit
   ```
