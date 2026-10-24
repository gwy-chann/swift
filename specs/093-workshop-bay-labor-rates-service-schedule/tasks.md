# Implementation Tasks: Workshop Bay Labor Rates & Flat-Rate Service Schedule

**Feature**: `specs/093-workshop-bay-labor-rates-service-schedule`  
**Jira Issue**: [SIAA-93](https://the-three-devsketeers.atlassian.net/browse/SIAA-93)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Implementation  

---

## Task Breakdown & Dependencies

### Phase 1: Domain Entities & Repositories
- [ ] **Task 1.1**: Create `LaborServiceEntity` and `ServiceRateAuditLogEntity` in `com.swift.modules.services.model`.
- [ ] **Task 1.2**: Create `LaborServiceRepository` and `ServiceRateAuditLogRepository` in `com.swift.modules.services.repository`.

### Phase 2: DTOs and Core Business Logic Services
- [ ] **Task 2.1**: Define DTO records: `LaborServiceResponse`, `CreateLaborServiceRequest`, `UpdateLaborServiceRequest`, `UpdateLaborServiceStatusRequest`, and `ServiceRateAuditLogResponse` in `com.swift.modules.services.dto`.
- [ ] **Task 2.2**: Implement `LaborServiceManager` interface and `LaborServiceManagerImpl` with dual UUID/code resolution, active status toggling, rate modification audit listener, and input validation.

### Phase 3: REST Controller
- [ ] **Task 3.1**: Implement `LaborServiceController` with CRUD endpoints under `/api/v1/services/labor`, status patch endpoint, and audit logs endpoint.

### Phase 4: Gateway Reverse Proxy & Security Configuration
- [ ] **Task 4.1**: Configure `SecurityConfig.java` to permit/authenticate `/api/v1/services/labor/**` endpoints with appropriate roles.
- [ ] **Task 4.2**: Update NGINX Strangler reverse proxy configuration (`gateway/nginx-strangler-gateway.conf`) to route `/api/v1/services/labor` to Spring Boot.

### Phase 5: Verification & Integration Testing
- [ ] **Task 5.1**: Build `LaborServiceControllerTests.java` covering Scenarios 1 to 5 (service creation, rate update with audit logging, status deactivation and POS exclusion, code uniqueness conflict, negative rate rejection, and audit log queries).
