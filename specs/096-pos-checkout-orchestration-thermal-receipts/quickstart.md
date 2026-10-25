# Quickstart & Verification Guide: High-Concurrency POS Checkout Orchestration & Thermal Receipts

**Feature**: `specs/096-pos-checkout-orchestration-thermal-receipts`  
**Jira Issue**: [SIAA-96](https://the-three-devsketeers.atlassian.net/browse/SIAA-96)  

---

## 1. Prerequisites & Compilation

Set `JAVA_HOME` to Java 21 and run the backend test suite:

```powershell
$env:JAVA_HOME = "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2024.3.3\jbr"
& "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2024.3.3\plugins\maven\lib\maven3\bin\mvn.cmd" test -Dtest=PosCheckoutControllerTests,PosConcurrencyTests
```

Verify Next.js frontend TypeScript compilation:

```powershell
npx tsc --noEmit
```

---

## 2. Walkthrough Scenarios

### Scenario 1: Execute Checkout with Cash Tender & Product Stock Deductions
```bash
curl -X POST http://localhost:8080/api/v1/pos/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "receiptNumber": "REC-20261025-0001",
    "cashierName": "Elena Rostova",
    "pricingMode": "retail",
    "subtotal": 450.00,
    "discountType": null,
    "discountRate": 0.0000,
    "discountAmount": 0.00,
    "totalDue": 450.00,
    "cashTendered": 500.00,
    "paymentMethod": "Cash",
    "items": [
      {
        "itemType": "part",
        "itemSkuOrCode": "PART-OIL-10W40",
        "itemName": "Fully Synthetic 4T Engine Oil 10W-40",
        "unitPrice": 450.00,
        "quantity": 1,
        "subtotal": 450.00,
        "shelfLocation": "A-01-02"
      }
    ]
  }'
```
**Expected Response**:
```json
{
  "success": true,
  "transactionId": "...",
  "receiptNumber": "REC-20261025-0001",
  "itemsCount": 1,
  "partsDecremented": 1,
  "subtotal": 450.00,
  "discountAmount": 0.00,
  "totalDue": 450.00,
  "cashTendered": 500.00,
  "changeDue": 50.00,
  "createdAt": "..."
}
```

---

### Scenario 2: Underpayment Validation
```bash
curl -X POST http://localhost:8080/api/v1/pos/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "cashierName": "Elena Rostova",
    "subtotal": 450.00,
    "totalDue": 450.00,
    "cashTendered": 400.00,
    "paymentMethod": "Cash",
    "items": [
      {
        "itemType": "part",
        "itemSkuOrCode": "PART-OIL-10W40",
        "itemName": "Engine Oil",
        "unitPrice": 450.00,
        "quantity": 1,
        "subtotal": 450.00
      }
    ]
  }'
```
**Expected Response**: `HTTP 400 Bad Request`
```json
{
  "error": "Insufficient cash tendered. Total due: 450.00, Cash tendered: 400.00"
}
```

---

### Scenario 3: Retrieve Thermal Receipt Formatting
```bash
curl -X GET http://localhost:8080/api/v1/pos/receipts/REC-20261025-0001/thermal
```
**Expected Response**:
```json
{
  "receiptNumber": "REC-20261025-0001",
  "cashierName": "Elena Rostova",
  "subtotal": 450.00,
  "totalDue": 450.00,
  "changeDue": 50.00,
  "storeName": "SWIFT MOTO SERVICE",
  "address": "104 Rizal Ave, Motor City",
  "warrantyNotice": "Parts warranty valid for 7 days with receipt.",
  "escPosBase64": "...",
  "escPosPrintable": "..."
}
```
