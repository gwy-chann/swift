# Architecture Research: Baseline Foundation, Modular Monolith Scaffolding & Strangler Reverse-Proxy Gateway

**Feature**: `088-modular-monolith-strangler-proxy`  
**Jira Ticket**: [SIAA-88](https://the-three-devsketeers.atlassian.net/browse/SIAA-88)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  

---

## 1. Architectural Strategy: Strangler Fig Pattern

The Strangler Fig application pattern is the industry standard for incrementally replacing legacy systems with modern architectures while guaranteeing 100% zero downtime.

```
                    ┌─────────────────────────┐
                    │ Client (Browser / POS)  │
                    └───────────┬─────────────┘
                                │ HTTP / REST
                                ▼
                    ┌─────────────────────────┐
                    │ NGINX Strangler Gateway │
                    └─────┬─────────────┬─────┘
                          │             │
        Unmigrated routes │             │ Migrated routes
     (or fallback on 502) │             │ (e.g. /api/v1/motomatcher)
                          ▼             ▼
                 ┌─────────────┐   ┌──────────────────────────┐
                 │ Next.js App │   │ Spring Boot 3.3 Monolith │
                 │ (Port 3000) │   │ (Port 8080)              │
                 └──────┬──────┘   └────────────┬─────────────┘
                        │                       │
                        │                       │ HikariCP (ddl: validate)
                        ▼                       ▼
                    ┌───────────────────────────────┐
                    │   Shared Supabase PostgreSQL  │
                    │   (Tables, Stored Procedures) │
                    └───────────────────────────────┘
```

### Key Decisions:
1. **Edge-Level Resilience**: The gateway intercepts failures (`502 Bad Gateway`, `503 Service Unavailable`, `504 Gateway Timeout`) from the new Spring Boot backend and reroutes to the active Next.js backend with an `X-Swift-Fallback: true` header.
2. **Zero Blast Radius**: If Spring Boot experiences an unexpected regression or deployment crash, store cashiers and administrators experience zero downtime.

---

## 2. Technology Stack & Framework Selection

| Concern | Selection | Rationale |
| :--- | :--- | :--- |
| **Language Runtime** | Java 21 LTS | Long-term enterprise support; Project Loom Virtual Threads provide lightweight concurrency for high cashier volume without reactive programming complexity. |
| **Framework** | Spring Boot 3.3.x | Enterprise standard; native virtual threads support (`spring.threads.virtual.enabled=true`), comprehensive Actuator observability, seamless Jakarta EE 10 integration. |
| **Build Tool** | Apache Maven 3.9+ | Standard dependency resolution, reproducible builds, and wide CI/CD toolchain support. |
| **Persistence & ORM** | Spring Data JPA + Hibernate 6 | Mature relational mapping with strict `ddl-auto: validate` mode ensuring no unexpected schema alterations against Supabase. |
| **Connection Pooling** | HikariCP | High-performance JDBC connection pool with granular configuration for max pool size, connection timeouts, and leak detection. |
| **Reverse Proxy** | NGINX 1.25+ | Lightweight, sub-millisecond reverse proxy with native `proxy_next_upstream` and `error_page` fallback capabilities. |
| **Containerization** | Docker Multi-stage Build | Enables building and running the entire Spring Boot stack without requiring a host-level JDK installation. |

---

## 3. Modular Monolith Architecture vs Microservices

To avoid premature distributed systems overhead (network latency, distributed transactions, event bus complexity, deployment overhead), SWIFT adopts a **Modular Monolith**:
- Single Spring Boot deployment artifact (`swift-backend.jar`).
- Package-private encapsulation separating domain modules:
  - `com.swift.modules.auth`
  - `com.swift.modules.catalog`
  - `com.swift.modules.motomatcher`
  - `com.swift.modules.pricing`
  - `com.swift.modules.pos`
  - `com.swift.modules.shift`
  - `com.swift.modules.analytics`
  - `com.swift.modules.audit`
- Modules interact via Java interfaces and Spring Service beans rather than HTTP or Kafka, maintaining sub-millisecond execution speeds and straightforward ACID transaction demarcation (`@Transactional`).

---

## 4. Database Safety & Hibernate Validation

The Supabase PostgreSQL database is shared between Next.js (Prisma / PostgREST) and Spring Boot during the multi-month migration.
- **Strict Rule**: `spring.jpa.hibernate.ddl-auto: validate`
- **Validation Mechanics**: During `ApplicationContext` startup, Hibernate inspects database metadata against `@Entity` definitions. If a column type or table is missing or mismatched, Spring Boot immediately throws `SchemaManagementException` and aborts initialization.
- **Zero Schema Mutation**: Under no circumstance does Hibernate run `CREATE TABLE`, `ALTER TABLE`, or `DROP TABLE`. Database migrations remain exclusively managed by existing Supabase SQL migration files.
