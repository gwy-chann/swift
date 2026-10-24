# Implementation Tasks: Staff Account Provisioning, Granular RBAC & Security Audit Trail

**Feature**: `specs/094-staff-account-provisioning-rbac-audit-trail`  
**Jira Issue**: [SIAA-94](https://the-three-devsketeers.atlassian.net/browse/SIAA-94)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Implementation  

---

## Task Breakdown & Dependencies

### Phase 1: Domain Entities & DTOs
- [x] **Task 1.1**: Verify and update `StaffPermissions.java` to guarantee support for all granular flags (`can_adjust_stock`, `can_override_discount`, `can_manage_pricing`, `can_view_reports`) and role defaults.
- [x] **Task 1.2**: Create DTO records under `com.swift.modules.admin.dto`:
  - `StaffUserResponse`
  - `ProvisionStaffUserRequest`
  - `UpdateStaffUserRequest`
  - `UpdateUserPermissionsRequest`
  - `UpdateUserStatusRequest`
  - `SecurityAuditLogResponse`
  - `LogSecurityEventRequest`
- [x] **Task 1.3**: Create domain exceptions: `SelfLockoutException` (400 Bad Request) and `DuplicateEmailException` (409 Conflict).

### Phase 2: Core Admin & Security Services
- [x] **Task 2.1**: Implement `SecurityAuditService` interface and `SecurityAuditServiceImpl` wrapping `public.log_security_event` via `SimpleJdbcCall` (with repository fallback for test environments), search/severity filtering, and CSV/JSON export.
- [x] **Task 2.2**: Implement `UserAdminService` interface and `UserAdminServiceImpl` handling staff listing, account provisioning with `BCryptPasswordEncoder`, self-lockout and self-demotion guards, granular permission merging, and automatic `USER_PROVISIONED` audit logging.

### Phase 3: REST Controllers
- [x] **Task 3.1**: Implement `UserAdminController` (`/api/v1/admin/users`) with endpoints for user listing, provisioning, profile update, permissions patch, and status toggle.
- [x] **Task 3.2**: Implement `SecurityAuditController` (`/api/v1/admin/audit/security`) with endpoints for event query, stored procedure event logging, and CSV export.

### Phase 4: Gateway Reverse Proxy & Security Configuration
- [x] **Task 4.1**: Configure `SecurityConfig.java` to ensure `/api/v1/admin/**` is protected with `hasRole("ADMIN")` while permitting authenticated test principals.
- [x] **Task 4.2**: Update NGINX Strangler reverse proxy configuration (`gateway/nginx-strangler-gateway.conf`) to route `/api/v1/admin/users` and `/api/v1/admin/audit` to Spring Boot.

### Phase 5: Verification & Integration Testing
- [x] **Task 5.1**: Build `UserAdminControllerTests.java` covering Scenarios 1, 2, and 4 (provisioning with custom permissions, self-lockout prevention returning 400, self-demotion prevention, and duplicate email conflict).
- [x] **Task 5.2**: Build `SecurityAuditControllerTests.java` covering Scenarios 3, 5, and 6 (stored procedure event logging, severity filtering, and RFC 4180 CSV export).
