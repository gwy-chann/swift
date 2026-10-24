# Technical Research & Architectural Decisions: Dual-Platform Identity Bridge

**Feature**: `specs/089-identity-bridge-session-interop`  
**Jira Issue**: [SIAA-89](https://the-three-devsketeers.atlassian.net/browse/SIAA-89)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Approved Architecture  

---

## 1. Technical Context & Constraints

The SWIFT system is migrating from a Next.js App Router full-stack architecture to a Spring Boot 3.3 modular monolith backend using the Strangler Fig pattern. During the phased rollout:
- The frontend remains Next.js (React 19, Tailwind CSS v4, Lucide icons).
- The edge gateway (NGINX) routes requests selectively to either Next.js (port 3000) or Spring Boot (port 8080).
- Users (shop cashiers, floor mechanics, store administrators) interact with both systems interchangeably within the same browser session or physical terminal.

Therefore, identity, credentials, sessions, and elevation must interoperate seamlessly between Next.js and Spring Boot without requiring re-authentication when crossing architectural boundaries.

---

## 2. Architectural Decisions & Trade-Offs

### Decision 1: Stateless Hybrid Authentication Filter Chain
- **Context**: Incoming requests may come with:
  1. An `Authorization: Bearer <SUPABASE_JWT>` header (API clients, automated tools, or SSR fetchers).
  2. Browser cookies: `swift-session-role`, `swift-staff-session`, and `swift_admin_elevated`.
- **Decision**: Configure a two-stage filter chain in Spring Security 6:
  - `SupabaseJwtAuthFilter`: If `Authorization: Bearer ...` header is present, validate the JWT against Supabase JWKS and populate `SecurityContextHolder`.
  - `CookieAuthenticationFilter`: If no Bearer token is present, inspect HTTP cookies `swift-session-role` and `swift-staff-session`. If valid cookies exist, hydrate the principal into `SecurityContextHolder` with the corresponding role (`ROLE_ADMIN` or `ROLE_STAFF`).
- **Rationale**: Guarantees zero friction for existing Next.js frontend pages calling Spring Boot REST APIs directly from the browser without needing to fetch and inject a Bearer token into every client fetch call.

### Decision 2: Nimbus JOSE/JWT for Public JWKS Verification
- **Context**: Supabase Auth signs JWT tokens using asymmetric keys whose public keys are exposed via `${SUPABASE_URL}/auth/v1/.well-known/jwks.json`.
- **Decision**: Use `com.nimbusds:nimbus-jose-jwt` with `DefaultJWTProcessor` and `RemoteJWKSet` combined with a local key cache.
- **Cache Policy**: Cache keys in memory with a 1-hour expiration and 5-minute refresh margin.
- **Fallback**: In development/testing environments or when Supabase is offline, allow pre-configured test keys or demo bypass when `spring.profiles.active=test`.

### Decision 3: BCrypt PIN Verification for Kiosk Terminal Authentication
- **Context**: In physical shop operations, cashiers authenticate via 4-digit numeric PINs at the shared terminal. Table `staff_profiles` / `public.profiles` stores PINs hashed with BCrypt.
- **Decision**: Use Spring Security's `BCryptPasswordEncoder` to match submitted PINs against stored hashes.
- **Parity with Next.js**:
  - Accept `{ "profileId": "...", "pin": "..." }`.
  - Validate PIN pattern `^\d{4}$`.
  - Return the full staff profile with `permissions` JSONB matching `verifyStaffPinAction`.
  - Set cookie `swift-staff-session` and `swift-session-role: staff`.

### Decision 4: Master Admin Elevation Verification & Cookie Parity
- **Context**: When a staff member performs sensitive actions (e.g. manager discount override, system rate edit), a manager enters their password or PIN.
- **Decision**: Endpoint `POST /api/v1/staff/admin-elevation` verifies credentials against `ADMIN_ELEVATION_PASSWORD`, `ADMIN_ELEVATION_PIN`, or canonical demo credentials (`admin123`, `admin`, `8888`, `1234`).
- **Cookie Contract**: Sets HTTP-only cookie `swift_admin_elevated=true` with `max-age=3600` (1-hour elevation window).
- **Audit Logging**: Write an audit log entry for both successful and failed elevation attempts, matching `verifyAdminElevationAction`.

### Decision 5: Spring Security 6 Declarative Method Security
- **Context**: Protected endpoints must prevent unauthorized access at both the URL pattern and method level.
- **Decision**:
  - Enable `@EnableMethodSecurity(prePostEnabled = true)`.
  - Unauthenticated access to protected routes returns HTTP 401 Unauthorized with standard `ApiResponse` envelope.
  - Insufficient role access returns HTTP 403 Forbidden with standard `ApiResponse` envelope.

---

## 3. Dependencies & Maven Artifacts

To support this architecture, `swift-backend/pom.xml` will be extended with:
```xml
<!-- Spring Security 6 -->
<dependency>
    <groupId>org.springframework.boot</groupId>
    <artifactId>spring-boot-starter-security</artifactId>
</dependency>

<!-- Nimbus JOSE/JWT for Supabase Public JWKS Validation -->
<dependency>
    <groupId>com.nimbusds</groupId>
    <artifactId>nimbus-jose-jwt</artifactId>
    <version>9.37.3</version>
</dependency>

<!-- Spring Security Testing -->
<dependency>
    <groupId>org.springframework.security</groupId>
    <artifactId>spring-security-test</artifactId>
    <scope>test</scope>
</dependency>
```

---

## 4. Contract Parity Checksum

| Next.js Server Action | Spring Boot REST Endpoint | Request Payload | Response Body / Cookies |
| :--- | :--- | :--- | :--- |
| `authenticateUserAction` | `POST /api/v1/auth/login` | `{ email, password, selectedRole, rememberTerminal }` | `AuthResponse` + `swift-session-role`, `swift-user-name` |
| `logoutAction` | `POST /api/v1/auth/logout` | None | `{ success: true, redirectTo: "/" }` + clear cookies |
| `verifyStaffPinAction` | `POST /api/v1/staff/kiosk-auth` | `{ profileId, pin }` | `KioskAuthResponse` + `swift-staff-session` |
| `verifyAdminElevationAction` | `POST /api/v1/staff/admin-elevation` | `{ pinOrPassword }` | `ElevationResponse` + `swift_admin_elevated` |
