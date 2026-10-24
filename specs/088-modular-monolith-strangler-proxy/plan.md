# Technical Implementation Plan: Baseline Foundation, Modular Monolith Scaffolding & Strangler Reverse-Proxy Gateway

**Feature**: `088-modular-monolith-strangler-proxy`  
**Jira Ticket**: [SIAA-88](https://the-three-devsketeers.atlassian.net/browse/SIAA-88)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Approved for Implementation  

---

## 1. Architectural Blueprint & Target Topology

```
                  ┌──────────────────────────────────────────┐
                  │          HTTP Request (:80)              │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                  ┌──────────────────────────────────────────┐
                  │       NGINX Strangler Reverse Proxy       │
                  │       (nginx-strangler-gateway.conf)     │
                  └─────────┬──────────────────────┬─────────┘
                            │                      │
        Default: /          │                      │ Migrated: /api/v1/motomatcher/
        (or 502/503/timeout)│                      │ & /actuator/
                            ▼                      ▼
                  ┌───────────────────┐  ┌───────────────────┐
                  │ Next.js Frontend  │  │ Spring Boot 3.3   │
                  │ & Server Actions  │  │ Modular Monolith  │
                  │ (Port 3000)       │  │ (Port 8080)       │
                  └─────────┬─────────┘  └─────────┬─────────┘
                            │                      │
             Prisma / SQL   │                      │ HikariCP / JPA
             (Shared DB)    │                      │ (ddl: validate)
                            ▼                      ▼
                  ┌──────────────────────────────────────────┐
                  │       Supabase PostgreSQL Instance       │
                  │   (Existing tables, RPCs & triggers)     │
                  └──────────────────────────────────────────┘
```

---

## 2. Directory Structure & Modular Monolith Layout

```
swift-backend/
├── pom.xml
├── mvnw
├── mvnw.cmd
├── .mvn/
│   └── wrapper/
│       └── maven-wrapper.properties
├── Dockerfile
├── src/
│   ├── main/
│   │   ├── java/com/swift/
│   │   │   ├── SwiftBackendApplication.java
│   │   │   ├── common/
│   │   │   │   ├── dto/
│   │   │   │   │   ├── ApiResponse.java
│   │   │   │   │   └── ErrorDetails.java
│   │   │   │   └── exception/
│   │   │   │       ├── GlobalExceptionHandler.java
│   │   │   │       └── ResourceNotFoundException.java
│   │   │   ├── config/
│   │   │   │   ├── JpaConfig.java
│   │   │   │   ├── OpenApiConfig.java
│   │   │   │   └── SecurityConfig.java
│   │   │   └── modules/
│   │   │       ├── auth/
│   │   │       │   └── package-info.java
│   │   │       ├── catalog/
│   │   │       │   └── package-info.java
│   │   │       ├── motomatcher/
│   │   │       │   └── package-info.java
│   │   │       ├── pricing/
│   │   │       │   └── package-info.java
│   │   │       ├── pos/
│   │   │       │   └── package-info.java
│   │   │       ├── shift/
│   │   │       │   └── package-info.java
│   │   │       ├── analytics/
│   │   │       │   └── package-info.java
│   │   │       └── audit/
│   │   │           └── package-info.java
│   │   └── resources/
│   │       ├── application.yml
│   │       └── application-test.yml
│   └── test/
│       └── java/com/swift/
│           ├── SwiftBackendApplicationTests.java
│           └── HealthActuatorTests.java
gateway/
└── nginx-strangler-gateway.conf
docker-compose.yml
```

---

## 3. Implementation Steps & Phased Execution

### Step 1: Maven Project Configuration (`swift-backend/pom.xml`)
- Parent: `spring-boot-starter-parent:3.3.4`
- Java version: `21`
- Dependencies:
  - `spring-boot-starter-web`
  - `spring-boot-starter-data-jpa`
  - `spring-boot-starter-validation`
  - `spring-boot-starter-actuator`
  - `org.postgresql:postgresql`
  - `org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0`
  - `spring-boot-starter-test` (test scope)

### Step 2: Spring Boot Application Class & Package Boundaries
- `SwiftBackendApplication.java` annotated with `@SpringBootApplication`.
- Shared `common` package with `ApiResponse` record envelope and `@RestControllerAdvice` global exception handling.
- Declarative module package structures with `package-info.java` documenting module responsibilities.

### Step 3: Datasource & JPA Validation Configuration
- `src/main/resources/application.yml` with HikariCP pool properties and `spring.jpa.hibernate.ddl-auto: validate`.
- `src/main/resources/application-test.yml` for isolated unit test runs without requiring live Supabase credentials during CI.

### Step 4: Actuator Health Probes & Telemetry
- Configure Spring Boot Actuator with `show-details: always` and probe endpoints enabled.
- Verify `GET /actuator/health` and `GET /actuator/metrics`.

### Step 5: NGINX Strangler Reverse Proxy Gateway
- Configure `gateway/nginx-strangler-gateway.conf` defining:
  - `upstream nextjs_backend`
  - `upstream springboot_backend`
  - `location /api/v1/motomatcher/` routing to Spring Boot with `@fallback_to_nextjs`
  - `location @fallback_to_nextjs` adding `X-Swift-Fallback: true`
  - `location /` default routing to Next.js

### Step 6: Docker Multi-Stage Containerization
- `swift-backend/Dockerfile` with Maven build stage (`eclipse-temurin:21-jdk`) and minimal runtime stage (`eclipse-temurin:21-jre`).
- Root `docker-compose.yml` declaring `strangler-gateway` and `swift-backend`.

---

## 4. Verification & Testing Strategy

1. **Unit & Context Verification**:
   - `SwiftBackendApplicationTests` verifies Spring ApplicationContext loads cleanly.
   - `HealthActuatorTests` performs MockMvc request to `/actuator/health` and validates `UP` status.
2. **Gateway Configuration Verification**:
   - Validate NGINX syntax.
   - Test fallback behavior when Spring Boot is offline.
3. **Typecheck & Linting**:
   - Ensure repository TypeScript (`npx tsc --noEmit`) passes without regression.
