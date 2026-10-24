# Feature Specification: Workshop Bay Labor Rates & Flat-Rate Service Schedule

**Feature Branch**: `feat/SIAA-93-workshop-bay-labor-rates-service-schedule`  
**Created**: 2026-10-25  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-93](https://the-three-devsketeers.atlassian.net/browse/SIAA-93)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 3 (Services & Pricing)  
**Actions Replaced (6)**: `getAdminLaborServicesAction`, `createLaborServiceAction`, `updateLaborServiceAction`, `toggleServiceStatusAction`, `deleteLaborServiceAction`, `getServiceRateAuditLogsAction`  
**Target View / Scope**: Services & Pricing Module (`swift-backend/src/main/java/com/swift/modules/services/*`, `gateway/nginx-strangler-gateway.conf`)

---

## 1. Executive Summary & Objective

In Phase 3 of the Next.js to Spring Boot migration, SWIFT migrates the **Workshop Bay Labor Rates & Flat-Rate Service Schedule** from Next.js server actions to a high-performance Spring Boot 3.3 modular monolith backend.

Repair bays and workshop service counters rely on standardized labor codes (e.g. `CVT Cleaning & Tuning`, `FI Throttle Body Cleaning`, `Oil & Filter Change`), assigned bays, estimated task durations, and flat labor rates. In a busy motorcycle dealership and service center, inconsistent pricing or unverified rate increases directly impact customer trust and profit margins.

This specification implements:
1. **Labor Services CRUD REST Endpoints (`/api/v1/services/labor`)**:
   - `GET /api/v1/services/labor`: Lists labor services with optional `active` status filter (all vs. active only), bay filter, and keyword search.
   - `POST /api/v1/services/labor`: Registers a new flat-rate labor service with code uniqueness, bay allocation, duration, and positive rate.
   - `GET /api/v1/services/labor/{id}`: Retrieves individual service details by UUID or service code.
   - `PUT /api/v1/services/labor/{id}`: Updates service details (name, bay, rate, duration, description). When rate is modified, automatically creates an immutable audit trail entry.
   - `PATCH /api/v1/services/labor/{id}/status`: Toggles active status (`active=true|false`), immediately propagating to or excluding from POS cashier lookup.
   - `DELETE /api/v1/services/labor/{id}`: Deletes or deactivates labor service safely.
2. **Tamper-Proof Service Rate Audit Log API (`GET /api/v1/services/labor/audit-logs`)**:
   - `GET /api/v1/services/labor/audit-logs`: Retrieves immutable audit records from `public.service_rate_audit_logs`, supporting filtering by `serviceId` or `serviceCode`.
3. **Automated Rate Change Audit Listener / Lifecycle Hook**:
   - Intercepts rate mutations during create/update operations, capturing `oldRate`, `newRate`, `serviceCode`, `reason`, `userName`, and `timestamp`.
4. **POS Fast-Lane Cashier Integration**:
   - Guarantees inactive labor services are strictly excluded from active POS billing catalogs while maintaining historical transaction referential integrity.
5. **Strangler Reverse Proxy Handover**:
   - Configures NGINX reverse proxy routing for `/api/v1/services/labor` pointing to Spring Boot with automated sub-second fallback to Next.js (`@fallback_to_nextjs`).

---

## 1.1 Clarifications & Architecture Decisions

- **Q1: How are service identifiers handled across lookup endpoints?**
  - **A**: Endpoints accept both standard UUID format (`^[0-9a-fA-F-]{36}$`) and unique business service codes (e.g., `CVT-01`, `OIL-01`) for flexible integration across admin management and counter search.
- **Q2: When is a rate audit log entry generated?**
  - **A**: An immutable entry in `service_rate_audit_logs` is created whenever an update modifies the `rate` property and the new rate differs from the old rate (`newRate != oldRate`). Changes to non-pricing fields (e.g. description, bay name) do not produce rate audit entries.
- **Q3: What validation rules apply to rates and service codes?**
  - **A**:
    - Rate must be strictly greater than 0 (`rate > 0.00`). Zero or negative rates are rejected with `HTTP 400 Bad Request` (`VALIDATION_ERROR`).
    - Service code is required, alphanumeric with dashes/underscores, uppercase normalized, and unique. Duplicate codes are rejected with `HTTP 409 Conflict` (`DUPLICATE_CODE`).
    - Service name, bay allocation, and duration are mandatory non-empty strings.
- **Q4: How does status deactivation affect POS cashier operations?**
  - **A**: When `active=false`, the service is immediately excluded from POS cashier catalog queries (`active=true` queries), preventing cashiers from adding deactivated services to active work orders or sales carts.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-93)

* **As a** Service Desk Manager,  
* **I want** to configure flat-rate repair bay labor services, task durations, and hourly rates,  
* **so that** workshop services are billed consistently and all rate changes are recorded in tamper-proof audit logs.

---

### Scenario 1: Creating and updating flat-rate labor service (Priority: P1)

* **Given** an admin registers service `"CVT Cleaning & Tuning"` with code `"CVT-01"`, bay `"Bay 1 - Quick Service"`, rate `"350.00"`, and duration `"45 mins"`
* **When** `"POST /api/v1/services/labor"` is invoked
* **Then** the service is saved in `"public.labor_services"` with active status `true` and HTTP 201 Created is returned
* **When** the rate is updated to `"400.00"` via `"PUT /api/v1/services/labor/{id}"` with reason `"Annual parts inflation adjustment"` and user `"Service Desk Manager"`
* **Then** table `"service_rate_audit_logs"` records an audit entry with `old_rate = 350.00`, `new_rate = 400.00`, `service_code = "CVT-01"`, and the current timestamp.

---

### Scenario 2: Deactivating a workshop labor service (Priority: P1)

* **Given** an active labor service with code `"TIRE-01"` and ID `"UUID"`
* **When** `"PATCH /api/v1/services/labor/{id}/status"` is called with `{"active": false}`
* **Then** the service is flagged inactive (`active = false`) in `"public.labor_services"`
* **And** querying `"GET /api/v1/services/labor?active=true"` immediately excludes `"TIRE-01"` from the catalog.

---

### Scenario 3: Retrieving labor services list and filtering by status (Priority: P2)

* **Given** multiple labor services exist with both active and inactive states
* **When** `"GET /api/v1/services/labor"` is called with `active=true`
* **Then** only active services are returned ordered by code
* **When** `"GET /api/v1/services/labor"` is called without `active` filter (or `active=all`)
* **Then** all services (both active and inactive) are returned for administrative management.

---

### Scenario 4: Querying service rate audit logs (Priority: P2)

* **Given** multiple rate changes have been applied to labor services
* **When** `"GET /api/v1/services/labor/audit-logs"` is invoked with optional parameter `serviceId` or `serviceCode`
* **Then** Spring Boot returns HTTP 200 with the audit log entries in reverse chronological order (`created_at DESC`), containing `oldRate`, `newRate`, `reason`, and `userName`.

---

### Scenario 5: Duplicate code rejection and input validation (Priority: P2)

* **Given** a labor service with code `"OIL-01"` already exists
* **When** a user attempts to create another service with code `"OIL-01"` (or case-insensitive `"oil-01"`)
* **Then** the system rejects the request with HTTP 409 Conflict and error code `"DUPLICATE_CODE"`
* **When** a service is created with `rate = -50.00` or `rate = 0`
* **Then** the system rejects the request with HTTP 400 Bad Request and field error on `rate`.

---

## 3. Success Criteria (Measurable & Technology Agnostic)

1. **Rate Audit Integrity**: 100% of price modifications result in an immutable audit entry recording previous rate, updated rate, reason, and actor.
2. **Zero POS Inactive Leaks**: Inactive labor services are 100% excluded from active checkout catalog queries.
3. **Sub-second Response Time**: Service retrieval and CRUD requests complete within under 200ms at typical workshop traffic.
4. **Code Uniqueness**: Zero duplicate service codes can be registered in the system.
5. **Seamless Strangler Handover**: Existing Next.js rate configuration interfaces operate transparently against the Spring Boot API through NGINX routing.
