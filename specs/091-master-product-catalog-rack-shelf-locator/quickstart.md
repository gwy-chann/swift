# Quickstart & Verification Guide: Master Product Catalog & Physical Rack/Shelf Locator

**Feature**: `specs/091-master-product-catalog-rack-shelf-locator`  
**Jira Issue**: [SIAA-91](https://the-three-devsketeers.atlassian.net/browse/SIAA-91)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Verification  

---

## 1. Running the Automated Test Suite

### Via Docker Container (Java 21 LTS & Maven 3.9):
```bash
docker run --rm -v "%CD%/swift-backend:/workspace" -w /workspace maven:3.9.9-eclipse-temurin-21-alpine mvn test -Dtest=ProductCatalogControllerTests,PricingCalculatorServiceTest
```

### Local Maven (if installed):
```bash
cd swift-backend
./mvnw test -Dtest=ProductCatalogControllerTests,PricingCalculatorServiceTest
```

---

## 2. Interactive End-to-End Verification Scenarios

Start the Spring Boot backend on port 8080:
```bash
cd swift-backend
./mvnw spring-boot:run
```

---

### Scenario 1: Register New Product with Automated Markup & Physical Locator

```bash
curl -X POST http://localhost:8080/api/v1/admin/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "ENG-OIL-10W40",
    "name": "Yamalube 4T 10W-40 Synthetic",
    "category": "Oils",
    "brand": "Yamalube",
    "cost": 250.00,
    "oem": true,
    "rackId": "A-01",
    "shelfId": "03"
  }'
```

**Expected Response**: `HTTP 201 Created`
```json
{
  "id": "...",
  "sku": "ENG-OIL-10W40",
  "name": "Yamalube 4T 10W-40 Synthetic",
  "category": "Oils",
  "brand": "Yamalube",
  "cost": 250.00,
  "wholesale": 295.00,
  "retail": 337.50,
  "rackId": "A-01",
  "shelfId": "03",
  "location": "Rack A-01 / Shelf 03",
  "oem": true
}
```

---

### Scenario 2: Enforce Unique SKU Constraint (HTTP 409 Conflict)

Submit duplicate SKU registration:
```bash
curl -X POST http://localhost:8080/api/v1/admin/products \
  -H "Content-Type: application/json" \
  -d '{
    "sku": "eng-oil-10w40",
    "name": "Duplicate Oil",
    "category": "Oils",
    "brand": "Yamalube",
    "cost": 250.00
  }'
```

**Expected Response**: `HTTP 409 Conflict`
```json
{
  "success": false,
  "code": "SKU_ALREADY_EXISTS",
  "error": "Product with SKU \"ENG-OIL-10W40\" already exists in the catalog."
}
```

---

### Scenario 3: Query Master Product Catalog

```bash
curl -s "http://localhost:8080/api/v1/admin/products?query=ENG-OIL" | jq .
```

**Expected Response**: `HTTP 200 OK`
```json
{
  "success": true,
  "products": [
    {
      "sku": "ENG-OIL-10W40",
      "name": "Yamalube 4T 10W-40 Synthetic",
      "retail": 337.50,
      "wholesale": 295.00,
      "rackId": "A-01",
      "shelfId": "03",
      "location": "Rack A-01 / Shelf 03"
    }
  ],
  "totalCount": 1
}
```
