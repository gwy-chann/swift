# Research & Architecture Decisions: Staff Account Provisioning, Granular RBAC & Security Audit Trail

**Feature**: `specs/094-staff-account-provisioning-rbac-audit-trail`  
**Jira Issue**: [SIAA-94](https://the-three-devsketeers.atlassian.net/browse/SIAA-94)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Approved Architecture  

---

## 1. Technical Context & Stack Constraints

| Component | Choice | Rationale |
| :--- | :--- | :--- |
| **Runtime & Framework** | Java 21 + Spring Boot 3.3.4 | Project standard modular monolith runtime with Virtual Threads enabled. |
| **Domain Modules** | `com.swift.modules.admin` (Controllers & DTOs), `com.swift.modules.auth` (Domain entities & Security) | Clean separation of administrative boundary while reusing shared auth entities (`StaffProfile`, `SecurityAuditLog`). |
| **Persistence Layer** | Spring Data JPA + Spring JDBC (`SimpleJdbcCall`) | Type-safe JPA repositories for `profiles` and `security_audit_logs`, paired with `SimpleJdbcCall` for the atomic stored procedure `public.log_security_event`. |
| **Self-Lockout Protection** | Service Guard in `UserServiceImpl` / `AdminUserManager` | Evaluates caller principal (`SwiftUserPrincipal`) against target user ID, rejecting self-deactivation and self-demotion. |
| **Password Encoding** | Spring Security `BCryptPasswordEncoder` | Standard secure password hashing for provisioned staff accounts. |
| **Reverse Proxy Handover** | NGINX Strangler Gateway | Incremental migration routing `/api/v1/admin/users` and `/api/v1/admin/audit` to Spring Boot with `@fallback_to_nextjs`. |

---

## 2. Architecture Decisions & Tradeoff Analysis

### Decision 1: Module Placement & Controller Organization
- **Context**: SIAA-94 migrates 8 Next.js server actions across staff user management and security audit logging.
- **Alternatives Considered**:
  1. *Add endpoints into existing `com.swift.modules.auth.controller.AuthController`*: Auth controller is currently dedicated to public login and token refresh. Mixing administrative CRUD into it violates separation of concerns.
  2. *Create dedicated `com.swift.modules.admin`*: Organizes `UserAdminController` (for `/api/v1/admin/users`) and `SecurityAuditController` (for `/api/v1/admin/audit/security`).
- **Selected**: **Alternative 2**. Keeps admin controllers isolated and protected under Spring Security's `.requestMatchers("/api/v1/admin/**").hasRole("ADMIN")`.

---

### Decision 2: Stored Procedure Integration via `SimpleJdbcCall`
- **Context**: Acceptance Scenario 3 and technical checklist mandate that forensic security events be written via `public.log_security_event` stored procedure.
- **Alternatives Considered**:
  1. *Direct JPA repository save*: Bypasses the stored procedure, losing the database-level security definer checks and trigger invariants.
  2. *Spring JDBC `SimpleJdbcCall` with Repository Fallback*: Configures `SimpleJdbcCall` targeting `log_security_event` in `public` schema. When running in mock/H2 test profiles where Postgres PL/pgSQL functions aren't instantiated, gracefully falls back to `SecurityAuditLogRepository.save()`.
- **Selected**: **Alternative 2**. Guarantees exact stored procedure compliance in Postgres while maintaining 100% test portability in CI/CD test suites.

---

### Decision 3: Administrative Self-Lockout & Demotion Guard
- **Context**: Acceptance Scenario 2 requires that an authenticated admin attempting to deactivate their own account receives `HTTP 400 Bad Request` with `"Self-deactivation is prohibited"`.
- **Implementation Strategy**:
  - In `UserAdminService` / `AdminUserManager`:
    - Retrieve caller ID from `SecurityContextHolder.getContext().getAuthentication().getPrincipal()`.
    - If `callerId.equals(targetUserId)`:
      - If requested status is not `Active`: throw `SelfLockoutException("Self-deactivation is prohibited")`.
      - If requested role is not `admin`: throw `SelfLockoutException("Admin self-demotion is prohibited to prevent system lockout.")`.
  - Maps to `HTTP 400 Bad Request` with code `SELF_LOCKOUT_PREVENTED`.

---

### Decision 4: Contract Parity with Next.js Server Actions
- **Context**: Next.js client forms (`lib/admin/user-actions.ts` and `lib/admin/audit-actions.ts`) expect specific DTO shapes and error handling responses.
- **Implementation Strategy**:
  - `StaffUserResponse` matches `StaffUserSummary` exactly (`id`, `email`, `fullName`, `role`, `roleDisplay`, `status`, `permissions`, `createdAt`, `updatedAt`).
  - `SecurityAuditLogResponse` matches `SecurityAuditLog` exactly (`id`, `timestamp`, `userId`, `userEmail`, `action`, `severity`, `terminalIp`, `metadata`, `createdAt`).
  - CSV export formats match RFC 4180 with standard headers: `ID,Timestamp,User Email,Action,Severity,Terminal IP,Metadata`.
