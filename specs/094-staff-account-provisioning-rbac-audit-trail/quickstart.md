# Quickstart & Verification Guide: Staff Account Provisioning, Granular RBAC & Security Audit Trail

**Feature**: `specs/094-staff-account-provisioning-rbac-audit-trail`  
**Jira Issue**: [SIAA-94](https://the-three-devsketeers.atlassian.net/browse/SIAA-94)  

---

## 1. Prerequisites & Setup

Ensure the worktree environment is active:
```bash
git branch --show-current
# Expected: feat/SIAA-94-staff-account-provisioning-rbac-audit-trail
```

---

## 2. API Verification Workflows

### Scenario 1: Provision Staff User with Granular Permissions
```bash
curl -X POST http://localhost:8080/api/v1/admin/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -d '{
    "email": "cashier.jane@swift.ph",
    "fullName": "Jane Doe",
    "role": "cashier",
    "password": "TemporarySecurePass#123",
    "permissions": {
      "can_override_discount": true,
      "can_adjust_stock": false
    }
  }'
```
**Expected Response**: `HTTP 201 Created`
```json
{
  "id": "11111111-2222-3333-4444-555555555555",
  "email": "cashier.jane@swift.ph",
  "fullName": "Jane Doe",
  "role": "cashier",
  "roleDisplay": "Cashier",
  "status": "Active",
  "permissions": {
    "can_adjust_stock": false,
    "can_override_discount": true,
    "can_manage_pricing": false,
    "can_view_reports": false
  },
  "createdAt": "2026-10-25T02:00:00Z",
  "updatedAt": "2026-10-25T02:00:00Z"
}
```
- In `public.security_audit_logs`, an event `"Created employee account for cashier.jane@swift.ph (Cashier)"` is logged.

---

### Scenario 2: Prevent Administrative Self-Lockout
```bash
# Admin user with ID admin-01 attempts to deactivate their own account
curl -X PATCH http://localhost:8080/api/v1/admin/users/admin-01/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_01_JWT>" \
  -d '{"status": "Inactive"}'
```
**Expected Response**: `HTTP 400 Bad Request`
```json
{
  "code": "SELF_LOCKOUT_PREVENTED",
  "error": "Self-deactivation is prohibited"
}
```

---

### Scenario 3: Forensic Security Event Logging via Stored Procedure
```bash
curl -X POST http://localhost:8080/api/v1/admin/audit/security \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -d '{
    "action": "Manual inventory shrinkage clearance for SKU-9002",
    "severity": "warning",
    "terminalIp": "192.168.1.100 (Admin PC)",
    "metadata": {
      "sku": "SKU-9002",
      "authorizedBy": "Store Owner"
    }
  }'
```
**Expected Response**: `HTTP 201 Created`
- An immutable event is written to `public.security_audit_logs` using `public.log_security_event`.

---

### Scenario 4: Query Security Audit Logs with Severity Filter
```bash
curl -X GET "http://localhost:8080/api/v1/admin/audit/security?severity=security_alert&limit=10" \
  -H "Authorization: Bearer <ADMIN_JWT>"
```
**Expected Response**: `HTTP 200 OK` with filtered security events.

---

### Scenario 5: Export Security Audit Logs as CSV
```bash
curl -X GET "http://localhost:8080/api/v1/admin/audit/security/export?format=csv" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -o security-audit-export.csv
```
**Expected Response**: `HTTP 200 OK` (`Content-Type: text/csv`) with RFC 4180 headers:
```csv
ID,Timestamp,User Email,Action,Severity,Terminal IP,Metadata
```
