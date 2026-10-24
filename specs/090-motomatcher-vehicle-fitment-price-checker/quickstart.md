# Quickstart & Verification Guide: MotoMatcher Vehicle Fitment & Product Price Checker

**Feature**: `specs/090-motomatcher-vehicle-fitment-price-checker`  
**Jira Issue**: [SIAA-90](https://the-three-devsketeers.atlassian.net/browse/SIAA-90)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Verification  

---

## 1. Running the Automated Test Suite

From the `swift-backend` directory, run all unit, integration, and contract parity tests:

```bash
cd swift-backend
./mvnw clean test
```

To run only the MotoMatcher and Price Check tests:

```bash
cd swift-backend
./mvnw test -Dtest=MotoMatcherControllerTests,ProductPriceCheckControllerTests
```

---

## 2. Interactive End-to-End Verification Scenarios

Start the Spring Boot backend on port 8080:

```bash
cd swift-backend
./mvnw spring-boot:run
```

### Scenario 1: Retrieve Cached Motorcycle Models

```bash
# First request (populates Caffeine cache)
curl -s -w "\nTime: %{time_total}s\n" http://localhost:8080/api/v1/motomatcher/models

# Second request (served from Caffeine cache in <10ms)
curl -s -w "\nTime: %{time_total}s\n" http://localhost:8080/api/v1/motomatcher/models
```

Expected response: HTTP 200 with JSON array of motorcycle models ordered by `make` and `model`.

---

### Scenario 2: Retrieve Partitioned Fitment Matrix via Stored Procedure

```bash
curl -s "http://localhost:8080/api/v1/motomatcher/matrix?modelId=b0000000-0000-0000-0000-000000000001&category=Brakes" | jq .
```

Expected response:
```json
{
  "oem_parts": [
    {
      "id": "...",
      "sku": "YAM-NMAX-BL01",
      "name": "Brake Lever Left (OEM)",
      "brand": "Yamaha Genuine Parts",
      "category": "Brakes",
      "retail_price": 450.00,
      "stock_level": 8,
      "fitment_type": "oem"
    }
  ],
  "aftermarket_parts": [
    {
      "id": "...",
      "sku": "RCB-NMAX-BL02",
      "name": "RCB S2 Series Adjustable Lever",
      "brand": "Racing Boy",
      "category": "Brakes",
      "retail_price": 580.00,
      "stock_level": 14,
      "fitment_type": "aftermarket",
      "upsell_delta_amount": 130.00,
      "upsell_badge": "+₱130.00 (+28.9%)",
      "oem_reference_sku": "YAM-NMAX-BL01"
    }
  ]
}
```

---

### Scenario 3: Realtime SKU & Barcode Price Check with Margin Simulator

```bash
curl -s "http://localhost:8080/api/v1/inventory/pricecheck?query=YAM-NMAX-BL01" | jq .
```

Expected response:
```json
{
  "success": true,
  "product": {
    "sku": "YAM-NMAX-BL01",
    "name": "Brake Lever Left (OEM)",
    "cost": 280.0,
    "retailPrice": 450.0,
    "wholesalePrice": 380.0,
    "scPwdPrice": 360.0,
    "grossMarkupPercent": 60.7,
    "wholesaleMarkupPercent": 35.7,
    "location": "Rack A-01 / Shelf 2"
  }
}
```

---

### Scenario 4: Error Handling & Validation

```bash
# Blank query -> HTTP 400
curl -s "http://localhost:8080/api/v1/inventory/pricecheck?query=%20%20%20" | jq .

# Unknown barcode -> HTTP 404
curl -s "http://localhost:8080/api/v1/inventory/pricecheck?query=UNKNOWN-CODE-999" | jq .
```
