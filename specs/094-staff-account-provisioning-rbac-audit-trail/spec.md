# Feature Specification: Staff Account Provisioning, Granular RBAC & Security Audit Trail

**Feature Branch**: `feat/SIAA-94-staff-account-provisioning-rbac-audit-trail`  
**Created**: 2026-10-25  
**Status**: Ready for Implementation  
**Jira Issue**: [SIAA-94](https://the-three-devsketeers.atlassian.net/browse/SIAA-94)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87) (`EPIC-8: Next.js to Spring Boot Ecosystem Migration`)  
**Phase**: Phase 3 (Administration & Security)  
**Actions Replaced (8)**: `listStaffUsersAction`, `provisionStaffUserAction`, `updateUserPermissionsAction`, `updateStaffUserAction`, `toggleUserStatusAction`, `getSecurityAuditLogsAction`, `logSecurityEventAction`, `exportSecurityAuditLogsAction`  
**Stored Procedures Replaced (1)**: `public.log_security_event`  
**Target View / Scope**: Admin & Security Module (`swift-backend/src/main/java/com/swift/modules/admin/*`, `com/swift/modules/auth/*`, `gateway/nginx-strangler-gateway.conf`)

---

## 1. Executive Summary & Objective

In Phase 3 of the Next.js to Spring Boot migration, SWIFT migrates the **Staff Account Provisioning, Granular RBAC & Security Audit Trail** subsystem from Next.js server actions to a high-concurrency Spring Boot 3.3 modular monolith backend.

Store Owners and General Managers must be able to securely provision staff accounts with role-based access control (Admin, Cashier, Mechanic, Staff, Inventory Clerk), configure fine-grained JSONB operational permission overrides (e.g. `can_override_discount`, `can_adjust_stock`, `can_manage_pricing`, `can_view_reports`), enforce safeguards against administrative self-lockout and accidental self-demotion, and inspect tamper-proof forensic security audit logs.

This specification implements:
1. **Staff User Management REST Endpoints (`/api/v1/admin/users`)**:
   - `GET /api/v1/admin/users`: Lists all staff profiles ordered chronologically with active role and granular permission flags.
   - `POST /api/v1/admin/users`: Provisions a new staff member with encrypted credentials, default role permissions merged with custom flags, and records an immutable `USER_PROVISIONED` security event.
   - `GET /api/v1/admin/users/{id}`: Retrieves profile and permission details for a specific user ID.
   - `PUT /api/v1/admin/users/{id}`: Updates staff profile attributes (full name, role, permissions) while enforcing administrative self-demotion protection.
   - `PATCH /api/v1/admin/users/{id}/permissions`: Updates granular JSONB permission flags directly.
   - `PATCH /api/v1/admin/users/{id}/status`: Modifies account operational status (`Active`, `Inactive`, `Suspended`) while strictly enforcing administrative self-lockout prevention.
2. **Forensic Security Audit Log REST Endpoints (`/api/v1/admin/audit/security`)**:
   - `GET /api/v1/admin/audit/security`: Retrieves immutable forensic audit events with filtering by severity (`info`, `warning`, `security_alert`), keyword search across action/email/IP, date ranges, and pagination.
   - `POST /api/v1/admin/audit/security`: Appends security events via the PostgreSQL `public.log_security_event` stored procedure through Spring's `SimpleJdbcCall`.
   - `GET /api/v1/admin/audit/security/export`: Streams or downloads RFC 4180-compliant CSV and JSON audit trails for compliance inspections.
3. **Admin Self-Lockout & Self-Demotion Guards**:
   - An authenticated administrator cannot deactivate, suspend, or demote their own account, preventing orphaned administrator domains.
4. **Strangler Reverse Proxy Handover**:
   - Configures NGINX reverse proxy routes for `/api/v1/admin/users` and `/api/v1/admin/audit` pointing to Spring Boot with automated sub-second fallback to Next.js (`@fallback_to_nextjs`).

---

## 1.1 Clarifications & Architecture Decisions

### Session 2026-10-25
- **Q1: How is the stored procedure `public.log_security_event` invoked from Spring Boot?**
  - **A**: Using Spring JDBC's `SimpleJdbcCall` configured with schema `public` and procedure name `log_security_event`. If the procedure is unavailable in standalone test profiles (e.g. H2 in-memory), a repository fallback atomically writes directly into `public.security_audit_logs`.
- **Q2: What is the exact self-lockout behavior when an admin attempts self-deactivation?**
  - **A**: When the authenticated principal ID matches the target user ID and the action attempts status change to `Inactive`/`Suspended` or role change from `admin`, the backend rejects the request with `HTTP 400 Bad Request` and error code `SELF_LOCKOUT_PREVENTED` (`Self-deactivation is prohibited`).
- **Q3: How are passwords and credentials stored for newly provisioned staff?**
  - **A**: Credentials are encrypted using `BCryptPasswordEncoder`. In production, accounts synchronize with Supabase Auth identities via user metadata; in Spring Boot, the profile holds the role and JSONB permissions.
- **Q4: What permission flags exist in `StaffPermissions`?**
  - **A**: The canonical permission flags are `can_adjust_stock`, `can_override_discount`, `can_manage_pricing`, and `can_view_reports`. When omitted in provisioning requests, defaults are determined by the assigned role.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-94)

* **As a** Store Owner,  
* **I want** to provision staff accounts, manage granular permission overrides, and inspect immutable security audit logs,  
* **so that** unauthorized actions are prevented and administrative activities are forensically auditable.

---

### Scenario 1: Admin provisions staff user with granular permission flags (Priority: P1)

* **Given** an authenticated administrator provisions a Cashier profile with `"can_override_discount": true` and `"can_adjust_stock": false`
* **When** `"POST /api/v1/admin/users"` executes with email `"cashier.test@swift.ph"`, name `"Jane Cashier"`, role `"cashier"`
* **Then** the account is created with encrypted credentials, role `"cashier"`, and the JSONB `"permissions"` column populated
* **And** a security event `"USER_PROVISIONED"` (severity `"info"`) is recorded in `"security_audit_logs"`
* **And** Spring Boot returns `HTTP 201 Created` with the provisioned `StaffUserResponse`.

---

### Scenario 2: Prevent administrative self-lockout (Priority: P1)

* **Given** an authenticated admin user with ID `"admin-01"`
* **When** they attempt to deactivate their own account via `"PATCH /api/v1/admin/users/admin-01/status"` with `{"status": "Inactive"}`
* **Then** Spring Boot returns `HTTP 400 Bad Request` with error message `"Self-deactivation is prohibited"` and error code `"SELF_LOCKOUT_PREVENTED"`.

---

### Scenario 3: Forensic security event logging via stored procedure (Priority: P1)

* **Given** any sensitive administrative action executes (e.g. permission update, discount override, terminal login)
* **When** `"POST /api/v1/admin/audit/security"` is called with action description, severity, and optional terminal IP
* **Then** Spring Boot invokes stored procedure `"public.log_security_event"` via `SimpleJdbcCall`
* **And** an immutable audit record is written into `"public.security_audit_logs"`
* **And** Spring Boot returns `HTTP 201 Created` with the recorded event ID and timestamp.

---

### Scenario 4: Admin updates staff user details & permission flags (Priority: P2)

* **Given** an existing staff member with ID `"user-02"`
* **When** `"PUT /api/v1/admin/users/user-02"` is invoked with updated full name and `"can_adjust_stock": true`
* **Then** the profile is updated in `"public.profiles"`
* **And** an audit entry is logged with action `"Updated employee account for user-02"`
* **And** Spring Boot returns `HTTP 200 OK` with the updated user details.

---

### Scenario 5: Security audit log retrieval & filtering (Priority: P2)

* **Given** security audit records exist with severities `"info"`, `"warning"`, and `"security_alert"`
* **When** `"GET /api/v1/admin/audit/security?severity=security_alert"` is called
* **Then** only events matching severity `"security_alert"` are returned in descending chronological order (`created_at DESC`)
* **When** `"GET /api/v1/admin/audit/security?search=TX-1041"` is called
* **Then** events with `"TX-1041"` in action, email, or IP are returned with pagination metadata.

---

### Scenario 6: Security audit log export (Priority: P2)

* **Given** multiple audit log records exist in `"public.security_audit_logs"`
* **When** `"GET /api/v1/admin/audit/security/export?format=csv"` is called
* **Then** Spring Boot streams an RFC 4180-compliant CSV containing headers `ID, Timestamp, User Email, Action, Severity, Terminal IP, Metadata`.

---

## 3. Functional Requirements & Error Codes

1. **Email Uniqueness & Normalization**:
   - Staff emails must be normalized to lowercase and trimmed.
   - Attempting to provision an account with an existing email returns `HTTP 409 Conflict` (`DUPLICATE_EMAIL`).
2. **Role Enumeration**:
   - Allowed roles: `admin`, `cashier`, `mechanic`, `inventory_clerk`, `staff`.
   - Invalid role returns `HTTP 400 Bad Request` (`INVALID_ROLE`).
3. **Granular Permissions Inheritance**:
   - If not provided in the payload, permissions default to role baselines:
     - `admin`: all true.
     - `inventory_clerk`: `can_adjust_stock: true`, rest false.
     - `cashier` / `mechanic` / `staff`: all false.
4. **Self-Demotion Guard**:
   - An administrator cannot update their own role to non-admin (`HTTP 400 Bad Request`, `SELF_LOCKOUT_PREVENTED`).
5. **Audit Severity Validation**:
   - Allowed severities: `info`, `warning`, `security_alert`. Invalid severity returns `HTTP 400 Bad Request`.
6. **Immutable Ledger Protection**:
   - Security audit logs cannot be updated or deleted via API (`REVOKE UPDATE, DELETE`).

---

## 4. Strangler Reverse Proxy Handover

NGINX Gateway (`gateway/nginx-strangler-gateway.conf`) intercepts administrative traffic:
- `location /api/v1/admin/users`: Routes to Spring Boot `http://springboot_backend` with `@fallback_to_nextjs`.
- `location /api/v1/admin/audit`: Routes to Spring Boot `http://springboot_backend` with `@fallback_to_nextjs`.

---

## 5. Definition of Done

- [x] All 8 canonical SpecKit artifacts generated and cross-analyzed.
- [x] Spring Boot modular controllers `UserAdminController` and `SecurityAuditController` implemented under `com.swift.modules.admin`.
- [x] SimpleJdbcCall stored procedure wrapper for `public.log_security_event` implemented.
- [x] Integration test suite verifying Scenarios 1 to 6 with 100% assertions passing.
- [x] Strangler Gateway updated and verified.
- [x] Atomic git commits with Jira key `[SIAA-94]` and pull request synthesized.
