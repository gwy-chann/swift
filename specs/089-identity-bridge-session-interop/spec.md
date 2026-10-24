# Feature Specification: Dual-Platform Identity Bridge, Session Interoperability & Elevation

**Feature Branch**: `feat/SIAA-89-identity-bridge-session-interop`  
**Created**: 2026-10-24  
**Status**: Ready for Planning / Implementation  
**Jira Issue**: [SIAA-89](https://the-three-devsketeers.atlassian.net/browse/SIAA-89)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 1 (Auth & Security Bridge)  
**Actions Replaced (4)**: `authenticateUserAction`, `logoutAction`, `verifyStaffPinAction`, `verifyAdminElevationAction`  
**Target View / Scope**: Backend Security & Identity Module (`swift-backend/src/main/java/com/swift/modules/auth/*`, `com.swift.config.SecurityConfig`, `contracts/*`)

---

## 1. Executive Summary & Objective

In Phase 0 ([SIAA-88](https://the-three-devsketeers.atlassian.net/browse/SIAA-88)), SWIFT established the Spring Boot 3.3 modular monolith foundation and the NGINX strangler reverse-proxy gateway with automated fallback routing.

Phase 1 ([SIAA-89](https://the-three-devsketeers.atlassian.net/browse/SIAA-89)) delivers the **Dual-Platform Identity Bridge, Session Interoperability & Elevation**. When front-line cashiers, mechanics, and store administrators interact with the hybrid SWIFT platform, they authenticate either through Supabase Auth JWTs or through shared kiosk terminals via 4-digit PINs. During the incremental migration, requests to both Next.js and Spring Boot must honor existing sessions without repeated prompts, session clobbering, or security bypass.

This specification implements:
1. **Spring Security 6 SecurityFilterChain & JWT Auth Filter**:
   - `SupabaseJwtAuthFilter` with Nimbus JOSE/JWT validating Supabase JWT tokens via the Supabase Public JWKS endpoint (`/auth/v1/.well-known/jwks.json`).
   - Signature, expiration, and issuer verification.
   - Hydration of user identity claims (`sub`/`user_id`, `email`, `role`, `user_metadata`) into Spring `SecurityContextHolder`.
2. **Dual-Cookie Session Interoperability Filter**:
   - `CookieAuthenticationFilter` intercepting incoming HTTP requests containing `swift-session-role`, `swift-staff-session`, and `swift_admin_elevated`.
   - Hydrating staff identity, assigned terminal ID, store branch, and role without requiring Bearer headers on browser-cookie interactions.
3. **Core Authentication REST Endpoints**:
   - `POST /api/v1/auth/login`: Authenticates user credentials with Supabase Auth or demo fallback (`admin@swift.local`, `cashier@swift.local`), setting `swift-session-role` and `swift-user-name` cookies with identical JSON response structure to `authenticateUserAction`.
   - `POST /api/v1/auth/logout`: Invalidates session, terminates tokens, clears session cookies, returning `{ success: true, redirectTo: "/" }` matching `logoutAction`.
4. **Kiosk Authentication & Elevation REST Endpoints**:
   - `POST /api/v1/staff/kiosk-auth`: Validates 4-digit PIN against `staff_profiles` / `public.profiles` BCrypt hash (and demo fallback), returning staff profile, granular permissions JSONB, and setting session cookie `swift-staff-session` matching `verifyStaffPinAction`.
   - `POST /api/v1/staff/admin-elevation`: Verifies manager PIN or master password (`ADMIN_ELEVATION_PASSWORD`, `admin123`, `admin`, `8888`, `1234`), sets HTTP-only elevation cookie `swift_admin_elevated` (1-hour TTL), and writes forensic audit log records matching `verifyAdminElevationAction`.
5. **Declarative Method Security & Guard Rails**:
   - `@EnableMethodSecurity(prePostEnabled = true)` enforcing `@PreAuthorize("hasRole('ADMIN')")` on protected administration operations.
   - Unauthenticated requests to protected endpoints return HTTP 401 Unauthorized immediately.
   - Forbidden requests return HTTP 403 Forbidden.

---

## 1.1 Clarifications & Decisions

### Session 2026-10-24
- **Q1: How should Spring Boot validate Supabase JWTs without a local public key?**  
  - **A**: Configure Nimbus JOSE/JWT with `DefaultJWTProcessor` hooked to Supabase's JWKS endpoint (`${supabase.url}/auth/v1/.well-known/jwks.json`) with an in-memory key cache (1-hour TTL) to prevent network overhead on every request.
- **Q2: How does Spring Boot handle offline or demo modes when Supabase is unreachable?**  
  - **A**: If Supabase JWKS or Auth is unavailable or when matching demo credentials (`admin@swift.local`, `cashier@swift.local`, staff demo IDs), fall back seamlessly to demo account resolution mirroring `lib/auth/actions.ts`.
- **Q3: What cookie names and scopes must Spring Boot match?**  
  - **A**: 
    - `swift-session-role`: `admin` | `staff` (HttpOnly, path `/`, Lax).
    - `swift-user-name`: string (non-HttpOnly for client banner, path `/`, Lax).
    - `swift-staff-session`: profile ID / serialized staff session (HttpOnly, path `/`, Lax).
    - `swift_admin_elevated`: `"true"` (HttpOnly, path `/`, Lax, 3600s TTL).
- **Q4: How are roles mapped between Supabase/Next.js and Spring Security?**  
  - **A**: Roles are normalized with the `ROLE_` prefix in Spring Security (`ROLE_ADMIN`, `ROLE_STAFF`) while maintaining wire format lowercase (`admin`, `staff`) in contracts and JSON payloads.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-89)

* **As a** Shop Cashier or Store Administrator,  
* **I want** my existing login session, kiosk PIN, and elevation privileges to be seamlessly recognized by Spring Boot,  
* **so that** I can authenticate at the shared terminal and execute elevated actions without session mismatch errors or repeated logins.

---

### Scenario 1: Supabase JWT validation via Public JWKS (Priority: P1)

* **Given** an incoming HTTP request with header `Authorization: Bearer <SUPABASE_JWT>`
* **When** `SupabaseJwtAuthFilter` evaluates the token against Supabase Public JWKS
* **Then** the JWT signature, issuer, and expiration are verified
* **And** claims (`sub`, `email`, `role`) are hydrated into Spring `SecurityContextHolder` as authenticated principal with appropriate authorities (`ROLE_ADMIN` or `ROLE_STAFF`).

---

### Scenario 2: Dual-Cookie session rehydration (Priority: P1)

* **Given** an HTTP request containing cookies `swift-session-role` and `swift-staff-session` without an Authorization header
* **When** `CookieAuthenticationFilter` intercepts the request
* **Then** the staff profile identity, store branch ID, and role are restored into `SecurityContextHolder`
* **And** requests succeed without re-prompting login.

---

### Scenario 3: Kiosk 4-digit PIN verification parity (Priority: P1)

* **Given** a cashier submits `{ "profileId": "<staff-uuid>", "pin": "1234" }` to `POST /api/v1/staff/kiosk-auth`
* **When** the PIN is verified against the BCrypt hash in `staff_profiles` / demo profiles
* **Then** Spring Boot returns HTTP 200 with the full staff profile, role, and granular permission flags
* **And** sets cookie `swift-staff-session` matching Next.js `verifyStaffPinAction` parity.

---

### Scenario 4: Master Admin elevation verification (Priority: P1)

* **Given** an elevated operation requires manager override
* **When** a manager submits `{ "pinOrPassword": "admin123" }` to `POST /api/v1/staff/admin-elevation`
* **Then** Spring Boot verifies the credentials against the admin secret/demo PINs
* **And** sets HTTP-only cookie `swift_admin_elevated=true` with 3600s TTL
* **And** returns `{ "success": true, "elevated": true, "expiresAt": <timestamp> }`.

---

### Scenario 5: Unauthorized route rejection (Priority: P1)

* **Given** an unauthenticated request to a protected endpoint `/api/v1/admin/products`
* **When** the request is evaluated by the Spring Security filter chain
* **Then** the request is rejected immediately with HTTP 401 Unauthorized and standard `ApiResponse` envelope.

---

### Scenario 6: Forbidden role rejection (Priority: P2)

* **Given** a user authenticated as `ROLE_STAFF` attempts to access `/api/v1/admin/users`
* **When** method or path security evaluates the user authorities
* **Then** the request is rejected with HTTP 403 Forbidden.

---

### Edge Cases

- **Expired JWT Token**: Nimbus JOSE/JWT rejects expired tokens with HTTP 401 Unauthorized and message "Token expired".
- **Malformed PIN**: Any PIN not matching `^\d{4}$` fails fast with HTTP 400 Bad Request and error "PIN must be exactly 4 numeric digits."
- **Empty Credentials**: Submitting empty email or password to `/api/v1/auth/login` returns HTTP 400 with `INVALID_CREDENTIALS`.
- **JWKS Network Outage**: If Supabase JWKS endpoint is temporarily unreachable, cached keys are used. If cache misses during outage, request fails safely with HTTP 401.

---

## 3. Functional Requirements

- **FR-001**: Configure Spring Security 6 `SecurityFilterChain` in `com.swift.config.SecurityConfig` with CORS, CSRF disabled for stateless REST, and custom filters.
- **FR-002**: Implement `SupabaseJwtAuthFilter` validating JWTs via Nimbus JOSE/JWT against Supabase JWKS endpoint.
- **FR-003**: Implement `CookieAuthenticationFilter` parsing `swift-session-role`, `swift-staff-session`, and `swift_admin_elevated`.
- **FR-004**: Implement `AuthController` with endpoints:
  - `POST /api/v1/auth/login`: Accepts `LoginRequest`, validates against Supabase Auth / demo accounts, sets session cookies, and returns `AuthResponse`.
  - `POST /api/v1/auth/logout`: Clears session cookies and returns `{ "success": true, "redirectTo": "/" }`.
- **FR-005**: Implement `StaffAuthController` with endpoints:
  - `POST /api/v1/staff/kiosk-auth`: Accepts `KioskAuthRequest`, verifies 4-digit PIN, sets staff cookie, and returns `KioskAuthResponse`.
  - `POST /api/v1/staff/admin-elevation`: Accepts `ElevationRequest`, verifies admin credential, sets elevation cookie, and returns `ElevationResponse`.
- **FR-006**: Enable `@EnableMethodSecurity(prePostEnabled = true)` for role-based authorization.
- **FR-007**: Provide complete contract validation schemas in `specs/089-identity-bridge-session-interop/contracts/` matching Next.js types.

---

## 4. Success Criteria

1. **Parity**: 100% field and status code parity between Spring Boot REST endpoints and Next.js server actions (`authenticateUserAction`, `logoutAction`, `verifyStaffPinAction`, `verifyAdminElevationAction`).
2. **Session Interoperability**: Valid cookies set by Next.js are recognized by Spring Boot, and cookies set by Spring Boot are recognized by Next.js.
3. **Security**: Zero unauthorized access permitted to protected routes (`/api/v1/admin/**`); all 401/403 responses adhere to the standard `ApiResponse` envelope.
4. **Test Coverage**: 100% pass rate on unit and integration contract tests.
