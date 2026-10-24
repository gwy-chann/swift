# Technical Implementation Plan: Dual-Platform Identity Bridge, Session Interoperability & Elevation

**Feature**: `specs/089-identity-bridge-session-interop`  
**Jira Issue**: [SIAA-89](https://the-three-devsketeers.atlassian.net/browse/SIAA-89)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Implementation  

---

## 1. Architectural Overview & Component Structure

```
swift-backend/src/main/java/com/swift/
├── config/
│   ├── JpaConfig.java
│   ├── OpenApiConfig.java
│   └── SecurityConfig.java               <-- Spring Security 6 FilterChain & MethodSecurity
└── modules/
    └── auth/
        ├── controller/
        │   ├── AuthController.java       <-- /api/v1/auth/login, /api/v1/auth/logout
        │   └── StaffAuthController.java  <-- /api/v1/staff/kiosk-auth, /api/v1/staff/admin-elevation
        ├── dto/
        │   ├── AuthResponse.java
        │   ├── ElevationRequest.java
        │   ├── ElevationResponse.java
        │   ├── KioskAuthRequest.java
        │   ├── KioskAuthResponse.java
        │   ├── LoginRequest.java
        │   ├── StaffProfileDto.java
        │   └── UserSessionDto.java
        ├── model/
        │   ├── SecurityAuditLog.java     <-- public.security_audit_logs
        │   ├── StaffPermissions.java     <-- JSONB value object
        │   └── StaffProfile.java         <-- public.profiles
        ├── repository/
        │   ├── SecurityAuditLogRepository.java
        │   └── StaffProfileRepository.java
        ├── security/
        │   ├── CookieAuthenticationFilter.java  <-- Dual-cookie parsing & hydration
        │   ├── SupabaseJwtAuthFilter.java       <-- Bearer token JWKS validation
        │   └── SwiftUserPrincipal.java          <-- Authenticated caller model
        └── service/
            ├── AuthService.java                 <-- Login & logout orchestration
            ├── StaffAuthService.java            <-- Kiosk PIN & admin elevation
            └── SupabaseJwksValidator.java       <-- Nimbus JOSE/JWT cache & verifier
```

---

## 2. Sequence Diagrams

### 2.1 Dual-Cookie Rehydration Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Browser as Frontend (Next.js Client)
    participant Strangler as Strangler Gateway (NGINX)
    participant CookieFilter as CookieAuthenticationFilter
    participant SecContext as SecurityContextHolder
    participant Controller as Staff / Catalog REST Controller

    Browser->>Strangler: GET /api/v1/catalog/products<br/>Cookie: swift-session-role=staff; swift-staff-session=mike-uuid
    Strangler->>CookieFilter: Proxy request to Spring Boot :8080
    CookieFilter->>CookieFilter: Extract 'swift-session-role' and 'swift-staff-session'
    alt Valid Session Cookies Present
        CookieFilter->>SecContext: Set Authentication(SwiftUserPrincipal, ROLE_STAFF)
        CookieFilter->>Controller: Chain.doFilter(request, response)
        Controller-->>Browser: HTTP 200 OK (Product List)
    else No Auth Header & No Valid Cookies
        CookieFilter->>SecContext: No Authentication Set
        CookieFilter->>Controller: Chain.doFilter(request, response)
        alt Protected Route
            Controller-->>Browser: HTTP 401 Unauthorized (ApiResponse.error)
        end
    end
```

---

### 2.2 Kiosk 4-digit PIN Verification Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Cashier as Cashier Terminal
    participant Controller as StaffAuthController
    participant StaffService as StaffAuthService
    participant Repo as StaffProfileRepository
    participant Response as HttpServletResponse

    Cashier->>Controller: POST /api/v1/staff/kiosk-auth<br/>{ profileId: "mike-uuid", pin: "1234" }
    Controller->>StaffService: verifyKioskPin("mike-uuid", "1234")
    StaffService->>Repo: findById(UUID.fromString("mike-uuid"))
    alt Profile Found & PIN matches BCrypt (or demo fallback)
        StaffService-->>Controller: KioskAuthResponse.ok(profileDto)
        Controller->>Response: Add-Cookie: swift-staff-session=mike-uuid; Path=/; HttpOnly
        Controller->>Response: Add-Cookie: swift-session-role=staff; Path=/; HttpOnly
        Controller-->>Cashier: HTTP 200 OK (KioskAuthResponse)
    else Invalid PIN
        StaffService-->>Controller: KioskAuthResponse.failure("Invalid PIN", "INVALID_PIN")
        Controller-->>Cashier: HTTP 400 Bad Request
    end
```

---

### 2.3 Master Admin Elevation Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Manager as Store Manager
    participant Controller as StaffAuthController
    participant StaffService as StaffAuthService
    participant AuditRepo as SecurityAuditLogRepository
    participant Response as HttpServletResponse

    Manager->>Controller: POST /api/v1/staff/admin-elevation<br/>{ pinOrPassword: "admin" }
    Controller->>StaffService: verifyAdminElevation("admin", terminalIp)
    alt Credential Matches Master/Demo Secret
        StaffService->>AuditRepo: save(SecurityAuditLog: "Master Admin elevation granted", severity: "warning")
        StaffService-->>Controller: ElevationResponse.ok(expiresAt)
        Controller->>Response: Add-Cookie: swift_admin_elevated=true; Max-Age=3600; HttpOnly
        Controller-->>Manager: HTTP 200 OK (ElevationResponse)
    else Invalid Credential
        StaffService->>AuditRepo: save(SecurityAuditLog: "Failed Master Admin elevation", severity: "security_alert")
        StaffService-->>Controller: ElevationResponse.failure("Invalid password", "INVALID_PIN")
        Controller-->>Manager: HTTP 401 Unauthorized
    end
```

---

## 3. Security Implementation Details

### 3.1 SecurityConfig
- Disable CSRF (`AbstractHttpConfigurer::disable`) for stateless REST API.
- Permit unrestricted access to:
  - `/actuator/health`, `/actuator/metrics`
  - `/swagger-ui/**`, `/v3/api-docs/**`
  - `/api/v1/auth/**` (login, logout)
  - `/api/v1/staff/kiosk-auth`, `/api/v1/staff/admin-elevation`
- Enforce authentication on all other `/api/v1/**` routes.
- Enforce `ROLE_ADMIN` on `/api/v1/admin/**` routes.
- Return HTTP 401 on unauthenticated access using custom `AuthenticationEntryPoint`.
- Return HTTP 403 on access denied using custom `AccessDeniedHandler`.
- Register `SupabaseJwtAuthFilter` before `UsernamePasswordAuthenticationFilter`.
- Register `CookieAuthenticationFilter` before `UsernamePasswordAuthenticationFilter`.

---

## 4. Test Strategy

1. **Unit Tests**:
   - `SupabaseJwksValidatorTest`: Tests JWT parsing, signature validation, expired token handling, and claim hydration.
   - `StaffAuthServiceTest`: Tests BCrypt PIN verification, demo fallback accounts, invalid PIN formatting, and elevation rules.
2. **Integration Tests (MockMvc / Spring Boot Test)**:
   - `SecurityConfigTests`: Verifies public vs protected routes, HTTP 401 on unauthenticated access, HTTP 403 on unauthorized role.
   - `AuthControllerTests`: Tests `POST /api/v1/auth/login` and `POST /api/v1/auth/logout` with cookie assertion.
   - `StaffAuthControllerTests`: Tests `POST /api/v1/staff/kiosk-auth` and `POST /api/v1/staff/admin-elevation`.
