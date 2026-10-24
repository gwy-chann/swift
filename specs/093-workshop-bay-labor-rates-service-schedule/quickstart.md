# Quickstart & Verification Guide: Workshop Bay Labor Rates & Flat-Rate Service Schedule

**Feature**: `specs/093-workshop-bay-labor-rates-service-schedule`  
**Jira Issue**: [SIAA-93](https://the-three-devsketeers.atlassian.net/browse/SIAA-93)  

---

## 1. Prerequisites & Setup

Ensure the worktree environment is active:
```bash
git branch --show-current
# Expected: feat/SIAA-93-workshop-bay-labor-rates-service-schedule
```

---

## 2. API Verification Workflows

### Scenario 1: Register New Flat-Rate Labor Service
```bash
curl -X POST http://localhost:8080/api/v1/services/labor \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_OR_MANAGER_JWT>" \
  -d '{
    "code": "CVT-01",
    "name": "CVT Cleaning & Tuning",
    "bay": "Bay 1 - Quick Service",
    "rate": 350.00,
    "duration": "45 mins",
    "description": "Comprehensive pulley, belt inspection and slider cleaning",
    "active": true
  }'
```
**Expected Response**: `HTTP 201 Created`
```json
{
  "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "code": "CVT-01",
  "name": "CVT Cleaning & Tuning",
  "bay": "Bay 1 - Quick Service",
  "rate": 350.00,
  "duration": "45 mins",
  "description": "Comprehensive pulley, belt inspection and slider cleaning",
  "active": true
}
```

---

### Scenario 2: Update Flat-Rate Service Rate with Audit Trail
```bash
curl -X PUT http://localhost:8080/api/v1/services/labor/CVT-01 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_OR_MANAGER_JWT>" \
  -d '{
    "rate": 400.00,
    "reason": "Annual parts and labor inflation adjustment",
    "userName": "Service Desk Manager"
  }'
```
**Expected Response**: `HTTP 200 OK`
- Table `service_rate_audit_logs` records `old_rate = 350.00`, `new_rate = 400.00`.

---

### Scenario 3: Deactivate Labor Service & Verify Exclusion from POS
```bash
# 1. Deactivate service
curl -X PATCH http://localhost:8080/api/v1/services/labor/CVT-01/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_OR_MANAGER_JWT>" \
  -d '{"active": false}'

# 2. Query active catalog (used by POS cashier)
curl -X GET "http://localhost:8080/api/v1/services/labor?active=true" \
  -H "Authorization: Bearer <CASHIER_OR_STAFF_JWT>"
```
**Expected Response**: `CVT-01` is absent from results.

---

### Scenario 4: Query Service Rate Audit Logs
```bash
curl -X GET "http://localhost:8080/api/v1/services/labor/audit-logs?serviceCode=CVT-01" \
  -H "Authorization: Bearer <ADMIN_OR_MANAGER_JWT>"
```
**Expected Response**: `HTTP 200 OK` with rate change history.
