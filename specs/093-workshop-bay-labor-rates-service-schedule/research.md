# Research & Architecture Decisions: Workshop Bay Labor Rates & Flat-Rate Service Schedule

**Feature**: `specs/093-workshop-bay-labor-rates-service-schedule`  
**Jira Issue**: [SIAA-93](https://the-three-devsketeers.atlassian.net/browse/SIAA-93)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Approved Architecture  

---

## 1. Technical Context & Stack Constraints

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Runtime & Framework** | Java 21 + Spring Boot 3.3.4 | Project standard modular monolith runtime with Virtual Threads enabled. |
| **Domain Module** | `com.swift.modules.services` | Clean modular boundary for workshop repair bays, flat-rate labor services, and audit logging. |
| **Persistence Layer** | Spring Data JPA (`LaborServiceRepository`, `ServiceRateAuditLogRepository`) | Type-safe ORM mapped to PostgreSQL tables `public.labor_services` and `public.service_rate_audit_logs`. |
| **Audit Logging Mechanism** | `@Transactional` Service Listener / Event Publisher | Ensures rate change audit logs are captured atomically in the same database transaction as the service update. |
| **Identifier Resolution** | Dual UUID & Code Path Matching | Resolves entities by either primary key UUID or business code (`CVT-01`), supporting both UI forms and cashier hotkeys. |
| **Reverse Proxy Handover** | NGINX Strangler Gateway | Incremental migration routing `/api/v1/services/labor` to Spring Boot with `@fallback_to_nextjs`. |

---

## 2. Architecture Decisions & Tradeoff Analysis

### Decision 1: Module Placement (`com.swift.modules.services`)
- **Context**: SIAA-93 migrates workshop labor service management and rate audit logging.
- **Alternatives Considered**:
  1. *Merge into `com.swift.modules.pricing`*: Pricing module currently handles global markup percentages and base hourly labor benchmark (SIAA-92). Adding full workshop bay schedules and catalog entities would violate single-responsibility.
  2. *Create independent `com.swift.modules.services`*: Encapsulates workshop labor catalog, bay assignments, task durations, and rate change audit histories cleanly.
- **Selected**: **Alternative 2**. Maintains clean domain boundaries in the Spring Boot modular monolith, with package structure `controller`, `dto`, `model`, `repository`, and `service`.

---

### Decision 2: Atomic Rate Change Audit Trail
- **Context**: Acceptance Scenario 1 mandates that whenever a service rate changes, `service_rate_audit_logs` records previous rate, new rate, user ID/name, reason, and timestamp.
- **Alternatives Considered**:
  1. *Database Trigger*: Conceals business logic in PL/pgSQL and complicates automated testing in CI/CD without Postgres extensions.
  2. *Application-level `@Transactional` Service Logic*: When updating a service, compare `currentRate` with `newRate`. If different, persist a `ServiceRateAuditLogEntity` within the same transaction.
- **Selected**: **Alternative 2**. Provides 100% testable, portable audit logging across all environments while guaranteeing transactional consistency.

---

### Decision 3: Dual UUID and Code Identifier Resolution
- **Context**: Cashiers and admins may look up services using UUIDs (from relational links) or uppercase business codes like `CVT-01` or `OIL-01`.
- **Implementation Strategy**:
  - Service resolution helper `findServiceByIdOrCode(String identifier)`:
    - If identifier matches UUID pattern (`^[0-9a-fA-F-]{36}$`), query by UUID primary key.
    - Otherwise, query by normalized uppercase service code.
  - Returns `LaborServiceEntity` or throws `ResourceNotFoundException`.

---

### Decision 4: POS Cashier Catalog Exclusion Guarantee
- **Context**: Acceptance Scenario 2 requires that deactivating a service (`PATCH /api/v1/services/labor/{id}/status` with `active=false`) immediately excludes it from the POS cashier catalog.
- **Implementation Strategy**:
  - `GET /api/v1/services/labor` accepts query parameter `Boolean active` (default: null/all for admin, `true` for POS).
  - When `active=true`, repository query filters `WHERE s.active = true ORDER BY s.code ASC`.
  - Integration tests explicitly verify that immediately after a status toggle to `false`, the service is absent from `active=true` query results.
