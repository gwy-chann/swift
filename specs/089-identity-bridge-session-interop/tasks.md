# Implementation Tasks: Dual-Platform Identity Bridge, Session Interoperability & Elevation

**Feature**: `specs/089-identity-bridge-session-interop`  
**Jira Issue**: [SIAA-89](https://the-three-devsketeers.atlassian.net/browse/SIAA-89)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: In Progress  

---

## Phase 1: Security & Dependencies Setup

- [ ] **TASK-1.1**: Update `swift-backend/pom.xml` with `spring-boot-starter-security`, `nimbus-jose-jwt` (v9.37.3), and `spring-security-test`.
- [ ] **TASK-1.2**: Update `swift-backend/src/main/resources/application.yml` and `application-test.yml` with Supabase JWKS configuration and auth properties.

---

## Phase 2: Domain Entities & Repositories

- [ ] **TASK-2.1**: Implement `StaffPermissions` JSONB value object in `com.swift.modules.auth.model.StaffPermissions`.
- [ ] **TASK-2.2**: Implement `StaffProfile` entity in `com.swift.modules.auth.model.StaffProfile` mapped to `public.profiles`.
- [ ] **TASK-2.3**: Implement `SecurityAuditLog` entity in `com.swift.modules.auth.model.SecurityAuditLog` mapped to `public.security_audit_logs`.
- [ ] **TASK-2.4**: Create `StaffProfileRepository` and `SecurityAuditLogRepository` in `com.swift.modules.auth.repository`.

---

## Phase 3: Core Security Filters & Principals

- [ ] **TASK-3.1**: Implement `SwiftUserPrincipal` in `com.swift.modules.auth.security.SwiftUserPrincipal`.
- [ ] **TASK-3.2**: Implement `SupabaseJwksValidator` in `com.swift.modules.auth.service.SupabaseJwksValidator` validating Supabase JWTs with in-memory JWKS caching.
- [ ] **TASK-3.3**: Implement `SupabaseJwtAuthFilter` in `com.swift.modules.auth.security.SupabaseJwtAuthFilter`.
- [ ] **TASK-3.4**: Implement `CookieAuthenticationFilter` in `com.swift.modules.auth.security.CookieAuthenticationFilter` for dual-cookie hydration (`swift-session-role`, `swift-staff-session`, `swift_admin_elevated`).
- [ ] **TASK-3.5**: Configure `SecurityConfig` in `com.swift.config.SecurityConfig` with CORS, CSRF disabled, public permitAll routes, protected authenticated routes, and custom 401/403 handlers.

---

## Phase 4: Auth & Staff Services

- [ ] **TASK-4.1**: Implement DTOs: `LoginRequest`, `AuthResponse`, `UserSessionDto`, `KioskAuthRequest`, `KioskAuthResponse`, `StaffProfileDto`, `ElevationRequest`, `ElevationResponse`.
- [ ] **TASK-4.2**: Implement `AuthService` in `com.swift.modules.auth.service.AuthService` handling login, demo accounts fallback, and logout.
- [ ] **TASK-4.3**: Implement `StaffAuthService` in `com.swift.modules.auth.service.StaffAuthService` handling kiosk PIN verification, demo staff fallback, admin elevation verification, and forensic audit logging.

---

## Phase 5: REST Controllers & Cookie Parity

- [ ] **TASK-5.1**: Implement `AuthController` in `com.swift.modules.auth.controller.AuthController` exposing `POST /api/v1/auth/login` and `POST /api/v1/auth/logout`.
- [ ] **TASK-5.2**: Implement `StaffAuthController` in `com.swift.modules.auth.controller.StaffAuthController` exposing `POST /api/v1/staff/kiosk-auth` and `POST /api/v1/staff/admin-elevation`.

---

## Phase 6: Automated Integration Tests & Parity Verification

- [ ] **TASK-6.1**: Implement `SecurityConfigTests` in `src/test/java/com/swift/modules/auth/SecurityConfigTests.java` verifying 401 on protected endpoints and public route bypass.
- [ ] **TASK-6.2**: Implement `AuthControllerTests` in `src/test/java/com/swift/modules/auth/AuthControllerTests.java` verifying login, demo account resolution, and cookie headers.
- [ ] **TASK-6.3**: Implement `StaffAuthControllerTests` in `src/test/java/com/swift/modules/auth/StaffAuthControllerTests.java` verifying 4-digit PIN verification, invalid PIN rejection, and admin elevation.
- [ ] **TASK-6.4**: Execute complete test suite via Docker Maven test runner and verify 100% test pass rate.

---

## Phase 7: Polish & Documentation Sync

- [ ] **TASK-7.1**: Trigger `graphify-auto-sync` (`graphify . --update`) to maintain an accurate AST map.
- [ ] **TASK-7.2**: Verify all tasks marked complete and prepare PR.
