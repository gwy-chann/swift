# Quickstart & Verification Guide: Transactional Stock Adjustment Engine & Pricing Markup Rules

**Feature**: `specs/092-transactional-stock-adjustment-pricing-rules`  
**Jira Issue**: [SIAA-92](https://the-three-devsketeers.atlassian.net/browse/SIAA-92)  

---

## 1. Prerequisites & Setup

Ensure the worktree environment is active:
```bash
git branch --show-current
# Expected: feat/SIAA-92-transactional-stock-adjustment-pricing-rules
```

---

## 2. API Verification Workflows

### Scenario 1: Execute Atomic Stock Adjustment
```bash
curl -X POST http://localhost:8080/api/v1/inventory/stock-adjust \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <STAFF_OR_ADMIN_JWT>" \
  -d '{
    "sku": "BRK-PAD-001",
    "quantityDelta": -5,
    "adjustmentType": "Damaged",
    "reason": "Cracked backplate discovered during bin audit",
    "userName": "Inventory Auditor"
  }'
```
**Expected Response**: `HTTP 200 OK`
```json
{
  "success": true,
  "sku": "BRK-PAD-001",
  "previousStock": 50,
  "newStock": 45,
  "quantityDelta": -5,
  "adjustmentType": "Damaged",
  "userName": "Inventory Auditor"
}
```

---

### Scenario 2: Streamed Audit Ledger CSV Export
```bash
curl -i http://localhost:8080/api/v1/inventory/stock-adjust/export-csv \
  -H "Authorization: Bearer <ADMIN_JWT>"
```
**Expected Response**: `HTTP 200 OK`
- Header: `Content-Type: text/csv; charset=UTF-8`
- Header: `Content-Disposition: attachment; filename="stock-adjustment-audit-....csv"`
- Body contains CSV lines without buffering entire dataset in server memory.

---

### Scenario 3: Update Global Pricing Rules
```bash
curl -X PUT http://localhost:8080/api/v1/pricing/rules \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <ADMIN_JWT>" \
  -d '{
    "retailMarkup": 38.0,
    "wholesaleMarkup": 18.0,
    "aftermarketMarkup": 42.0,
    "hourlyLaborRate": 500.0,
    "reason": "Q4 Shop Rate Revision"
  }'
```
**Expected Response**: `HTTP 200 OK` with updated rules and audit record inserted.
