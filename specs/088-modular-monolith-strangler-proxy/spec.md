# Feature Specification: Baseline Foundation, Modular Monolith Scaffolding & Strangler Reverse-Proxy Gateway

**Feature Branch**: `feat/SIAA-88-modular-monolith-strangler-proxy`  
**Created**: 2026-10-24  
**Status**: Ready for Planning / Implementation  
**Jira Issue**: [SIAA-88](https://the-three-devsketeers.atlassian.net/browse/SIAA-88)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 0 (Foundation & Infrastructure Setup)  
**Target View / Scope**: Backend Service Infrastructure (`swift-backend/*`, `nginx-strangler-gateway.conf`, `docker-compose.yml`)

---

## 1. Executive Summary & Objective

The SWIFT Motorcycle Spare Parts & POS platform is embarking on an enterprise modernization initiative to migrate from Next.js App Router Server Actions to a high-concurrency Spring Boot 3.3+ (Java 21 LTS) Modular Monolith backend. The strategic migration follows the **Strangler Fig Pattern** (Coexistence-First, Zero-Downtime), where existing Next.js frontend and backend capabilities remain 100% operational while micro-modules in Spring Boot are introduced incrementally.

This specification establishes **Phase 0: Baseline Foundation & Strangler Reverse-Proxy Gateway**:
1. **Spring Boot 3.3.x Modular Monolith Scaffold**:
   - Establish the `swift-backend` project directory with Java 21 LTS, Spring Boot 3.3+, Spring MVC, Spring Data JPA, and Spring Boot Actuator.
   - Enforce modular monolithic package boundaries: `com.swift.modules.{auth,catalog,motomatcher,pricing,pos,shift,analytics,audit}` alongside shared `com.swift.common` and `com.swift.config`.
2. **PostgreSQL Database Connectivity with Strict DDL Validation**:
   - Configure HikariCP connection pooling against the active Supabase PostgreSQL database.
   - Enforce `spring.jpa.hibernate.ddl-auto: validate` so that Hibernate strictly validates entity mappings without modifying existing tables, triggers, or stored procedures.
3. **NGINX Strangler Reverse-Proxy Gateway**:
   - Deploy `nginx-strangler-gateway.conf` acting as the single entry point for clients.
   - Route default traffic to Next.js (`127.0.0.1:3000`).
   - Route migrated API paths (e.g. `/api/v1/motomatcher/`) to Spring Boot (`127.0.0.1:8080`).
   - Sub-second automated fallback safeguard: If Spring Boot returns HTTP 502, 503, or connection timeout, automatically proxy to Next.js within 5 seconds and append `X-Swift-Fallback: true`.
4. **Actuator Health & Observability Telemetry**:
   - Expose `/actuator/health` and `/actuator/metrics` endpoints for container liveness and connection pool telemetry.
5. **Containerization & Developer Workflow**:
   - Provide a multi-stage `Dockerfile` and `docker-compose.yml` orchestrating the Strangler Gateway, Spring Boot backend, and Next.js service.

---

## 1.1 Clarifications & Decisions

### Session 2026-10-24
- **Q1: Which build tool is preferred for `swift-backend`?**  
  - **A**: Maven with Maven Wrapper (`mvnw`), adhering to enterprise Spring Initializr standards and Spring Boot 3.3 best practices.
- **Q2: How does NGINX detect Spring Boot failures for instant rollback?**  
  - **A**: Using `proxy_next_upstream error timeout http_502 http_503;` and `error_page 502 503 504 = @fallback_to_nextjs;` with `proxy_pass http://nextjs_backend;` appending `add_header X-Swift-Fallback "true" always;`.
- **Q3: What DDL auto behavior is required for JPA?**  
  - **A**: Strictly `validate`. Under no circumstances should Hibernate alter, create, or drop schema in the shared Supabase PostgreSQL instance.
- **Q4: How should local development without local Java be supported?**  
  - **A**: Provide a containerized multi-stage Docker build (`eclipse-temurin:21-jdk` / `eclipse-temurin:21-jre`) and `docker-compose.yml` so any developer with Docker can compile, run, and test the backend.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-88)

* **As a** Platform Engineer,  
* **I want** a production-ready Spring Boot 3.3 modular monolith scaffold and an NGINX strangler reverse-proxy gateway,  
* **so that** we can incrementally route migrated API calls to Spring Boot micro-modules while retaining the active Next.js backend as a zero-downtime fallback.

---

### Scenario 1: Strict JPA DDL validation against Supabase PostgreSQL (Priority: P1)

* **Given** Spring Boot initializes with `spring.jpa.hibernate.ddl-auto=validate`
* **When** HikariCP establishes connections to the shared Supabase PostgreSQL instance
* **Then** all existing tables, stored procedures, and triggers remain completely unmodified
* **And** any schema discrepancy between Java entity classes and PostgreSQL fails fast during application startup.

---

### Scenario 2: Edge proxy routing with sub-second automated fallback (Priority: P1)

* **Given** the NGINX strangler reverse proxy receives an HTTP request for `/api/v1/motomatcher/models`
* **When** the Spring Boot service is healthy (HTTP 200)
* **Then** NGINX proxies the request to `http://127.0.0.1:8080` and returns the response to the client
* **When** the Spring Boot service responds with HTTP 502, 503, or connection timeout
* **Then** NGINX automatically reroutes the request to Next.js at `http://127.0.0.1:3000` within 5 seconds
* **And** appends the response header `X-Swift-Fallback: true`.

---

### Scenario 3: Actuator health and metrics telemetry (Priority: P2)

* **Given** the Spring Boot service is running
* **When** a probe requests `GET /actuator/health`
* **Then** the response returns status `UP` along with database connection pool metrics.

---

### Edge Cases

- **Database Unavailability on Startup**: If Supabase PostgreSQL is unreachable, HikariCP times out after 20000ms (`connection-timeout`), failing startup fast with clear logs rather than hanging indefinitely.
- **Spring Boot Crashed/Not Started**: NGINX receives connection refused (111) on `127.0.0.1:8080`, triggering immediate fallback to Next.js upstream without returning 502 to client.
- **Both Backends Down**: If both Spring Boot and Next.js fail, NGINX returns standard 504 Gateway Timeout.
- **Virtual Thread Concurrency**: Requests handled in Spring Boot run on Project Loom virtual threads (`spring.threads.virtual.enabled: true`), preventing OS thread pool starvation under high concurrent cashier loads.

---

## 3. Functional Requirements

- **FR-001**: Scaffold Maven project `swift-backend/pom.xml` configured for Java 21 LTS and Spring Boot 3.3+.
- **FR-002**: Package modular monolith directory structure in `swift-backend/src/main/java/com/swift/`:
  - `com.swift.SwiftBackendApplication`
  - `com.swift.common` (base DTOs, API response envelopes, global exception handlers)
  - `com.swift.config` (database, security, OpenAPI documentation configs)
  - `com.swift.modules.{auth,catalog,motomatcher,pricing,pos,shift,analytics,audit}`
- **FR-003**: Configure `swift-backend/src/main/resources/application.yml` with HikariCP connection pool settings:
  - `maximum-pool-size: 20`
  - `minimum-idle: 5`
  - `connection-timeout: 20000`
  - `idle-timeout: 300000`
  - `max-lifetime: 1200000`
- **FR-004**: Enforce `spring.jpa.hibernate.ddl-auto: validate` in `application.yml` to prevent schema mutation.
- **FR-005**: Expose Spring Boot Actuator endpoints (`health`, `metrics`, `info`) in `application.yml` with database health details enabled.
- **FR-006**: Create `nginx-strangler-gateway.conf` with:
  - `upstream nextjs_backend { server 127.0.0.1:3000 max_fails=3 fail_timeout=10s; }`
  - `upstream springboot_backend { server 127.0.0.1:8080 max_fails=2 fail_timeout=5s; }`
  - Fallback location `@fallback_to_nextjs` returning header `X-Swift-Fallback: true`.
- **FR-007**: Create multi-stage `swift-backend/Dockerfile` using `eclipse-temurin:21-jdk` for compilation and `eclipse-temurin:21-jre` for runtime.
- **FR-008**: Create root `docker-compose.yml` declaring the `strangler-gateway`, `swift-backend`, and environment configurations.
- **FR-009**: Provide automated unit and integration tests (Spring Boot test verifying context load and Actuator health check).

---

## 4. Success Criteria & Non-Functional Requirements

- **SC-001**: Spring Boot application compiles cleanly and boots up in under 5 seconds.
- **SC-002**: `GET /actuator/health` returns HTTP 200 with status `"UP"`.
- **SC-003**: NGINX strangler gateway transparently passes unmigrated requests to Next.js with zero latency degradation (<1ms gateway overhead).
- **SC-004**: Automated fallback from Spring Boot to Next.js executes within sub-seconds (<5s) when Spring Boot is offline.
- **SC-005**: Zero schema changes are executed against the shared Supabase PostgreSQL database during boot.
