# Implementation Tasks: Baseline Foundation, Modular Monolith Scaffolding & Strangler Reverse-Proxy Gateway

**Feature**: `088-modular-monolith-strangler-proxy`  
**Jira Ticket**: [SIAA-88](https://the-three-devsketeers.atlassian.net/browse/SIAA-88)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  

---

## Phase 1: Setup & Environment Initialization

- [x] T001 Initialize `swift-backend/pom.xml` with Spring Boot 3.3.4 parent, Java 21, and core dependencies (`spring-boot-starter-web`, `spring-boot-starter-data-jpa`, `spring-boot-starter-validation`, `spring-boot-starter-actuator`, `org.postgresql:postgresql`, `springdoc-openapi`)
- [x] T002 [P] Configure Maven wrapper files (`swift-backend/mvnw`, `swift-backend/mvnw.cmd`, `swift-backend/.mvn/wrapper/maven-wrapper.properties`)
- [x] T003 [P] Create multi-stage `swift-backend/Dockerfile` with `eclipse-temurin:21-jdk` build stage and `eclipse-temurin:21-jre` runtime stage

---

## Phase 2: Foundational Architecture & Package Scaffolding

- [x] T004 Implement main Spring Boot entrypoint in `swift-backend/src/main/java/com/swift/SwiftBackendApplication.java` with `@SpringBootApplication`
- [x] T005 [P] Create shared API envelope and error record classes in `swift-backend/src/main/java/com/swift/common/dto/ApiResponse.java` and `ErrorDetails.java`
- [x] T006 [P] Implement global exception handler in `swift-backend/src/main/java/com/swift/common/exception/GlobalExceptionHandler.java`
- [x] T007 [P] Scaffold package boundaries and documentation for all 8 domain modules:
  - `swift-backend/src/main/java/com/swift/modules/auth/package-info.java`
  - `swift-backend/src/main/java/com/swift/modules/catalog/package-info.java`
  - `swift-backend/src/main/java/com/swift/modules/motomatcher/package-info.java`
  - `swift-backend/src/main/java/com/swift/modules/pricing/package-info.java`
  - `swift-backend/src/main/java/com/swift/modules/pos/package-info.java`
  - `swift-backend/src/main/java/com/swift/modules/shift/package-info.java`
  - `swift-backend/src/main/java/com/swift/modules/analytics/package-info.java`
  - `swift-backend/src/main/java/com/swift/modules/audit/package-info.java`

---

## Phase 3: User Story 1 (P1) - Strict JPA DDL Validation against Supabase PostgreSQL

**Story Goal**: Connect HikariCP to Supabase PostgreSQL with strict `ddl-auto: validate` so that existing tables and stored procedures remain untouched and schema discrepancies fail fast.

- [x] T008 [US1] Configure production datasource and JPA properties in `swift-backend/src/main/resources/application.yml` (HikariCP pool: max-size 20, min-idle 5, timeout 20000ms; `spring.jpa.hibernate.ddl-auto: validate`)
- [x] T009 [P] [US1] Create test datasource configuration in `swift-backend/src/main/resources/application-test.yml` for isolated unit tests
- [x] T010 [US1] Implement JPA configuration in `swift-backend/src/main/java/com/swift/config/JpaConfig.java` enabling transaction management and auditing
- [x] T011 [US1] Write unit test in `swift-backend/src/test/java/com/swift/SwiftBackendApplicationTests.java` verifying Spring ApplicationContext loads cleanly

---

## Phase 4: User Story 2 (P1) - Edge Proxy Routing with Sub-Second Automated Fallback

**Story Goal**: Route `/api/v1/motomatcher/` to Spring Boot while defaulting everything else to Next.js, with sub-second automated fallback and `X-Swift-Fallback: true` header when Spring Boot fails.

- [x] T012 [US2] Create NGINX strangler reverse-proxy configuration in `gateway/nginx-strangler-gateway.conf` defining upstreams for Next.js (`127.0.0.1:3000`) and Spring Boot (`127.0.0.1:8080`)
- [x] T013 [US2] Implement sub-second fallback location `@fallback_to_nextjs` with `proxy_next_upstream error timeout http_502 http_503` and `add_header X-Swift-Fallback "true" always;` in `gateway/nginx-strangler-gateway.conf`
- [x] T014 [P] [US2] Create NGINX test script or curl verification assertions for gateway routing and fallback header behavior

---

## Phase 5: User Story 3 (P2) - Actuator Health & Metrics Telemetry

**Story Goal**: Expose Spring Boot Actuator health and metrics endpoints for liveness, readiness, and connection pool observability.

- [x] T015 [US3] Configure Actuator endpoints exposure in `swift-backend/src/main/resources/application.yml` (`management.endpoints.web.exposure.include: health,metrics,info`)
- [x] T016 [US3] Configure OpenAPI documentation bean in `swift-backend/src/main/java/com/swift/config/OpenApiConfig.java` for Swagger UI `/swagger-ui.html`
- [x] T017 [US3] Implement Actuator health probe verification test in `swift-backend/src/test/java/com/swift/HealthActuatorTests.java` asserting `GET /actuator/health` returns status `UP`

---

## Phase 6: Polish & Containerized Orchestration

- [x] T018 Create `docker-compose.yml` defining `strangler-gateway`, `swift-backend`, and network bindings for unified local orchestration
- [x] T019 [P] Update `.gitignore` to ignore Maven build artifacts (`swift-backend/target/`, `swift-backend/.mvn/wrapper/maven-wrapper.jar`)
- [x] T020 Run TypeScript typecheck (`npx tsc --noEmit`) to verify zero repository regressions
