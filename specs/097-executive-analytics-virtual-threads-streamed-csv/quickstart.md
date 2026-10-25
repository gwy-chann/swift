# Quickstart Guide: High-Performance Executive Analytics Virtual Threads & Streamed Accounting CSV

**Feature**: `specs/097-executive-analytics-virtual-threads-streamed-csv`  
**Jira Issue**: [SIAA-97](https://the-three-devsketeers.atlassian.net/browse/SIAA-97)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Status**: Ready for Verification  

---

## 1. Running Backend & Integration Tests

From the isolated worktree directory (`swift-backend/`):

```bash
cd swift-backend
./mvnw clean test -Dtest=AnalyticsControllerTests,VirtualThreadsStructuredScopeTests,CsvStreamingMemoryBenchmarkTests
```

To run the full suite:
```bash
./mvnw clean test
```

---

## 2. Manual Verification & API Testing Scenarios

Ensure the Spring Boot application is running locally:
```bash
./mvnw spring-boot:run
```

### Scenario 1: Aggregated Executive Dashboard Query
Dispatches parallel virtual thread subtasks via Java 21 `StructuredTaskScope.ShutdownOnFailure`:

```bash
curl -i -X GET http://localhost:8080/api/v1/analytics/kpis
```

Expected Response (`HTTP 200 OK`):
```json
{
  "kpis": {
    "grossRevenueToday": 3200.00,
    "grossRevenueYesterday": 2800.00,
    "revenueGrowthPct": 14.29,
    "activeWorkOrdersCount": 3,
    "pendingPartsCount": 1,
    "netProfitMarginPct": 38.5,
    "grossProfitAmount": 1232.00,
    "criticalLowStockCount": 4
  },
  "revenueTrend": {
    "days": [... 7 items ...],
    "peakDayAmount": 4200.00,
    "totalWeeklyRevenue": 24500.00
  },
  "categoryPnl": {
    "categories": [...],
    "summary": { "totalGrossRevenue": 24500.00, "overallMarginPct": 38.5 }
  },
  "serviceBays": [
    {
      "id": "bay-1",
      "bayName": "Bay #1 - Express",
      "status": "OCCUPIED",
      "vehicleService": "Yamaha NMAX 155 • Oil Change & CVT Cleaning",
      "mechanicInfo": "Mechanic assigned (Active)"
    }
  ]
}
```

---

### Scenario 2: Non-Blocking Streamed Accounting CSV Export

```bash
curl -i -X GET "http://localhost:8080/api/v1/analytics/accounting-csv?period=annual" -o annual_report.csv
```

Expected Response:
- Headers:
  - `Content-Type: text/csv; charset=UTF-8`
  - `Content-Disposition: attachment; filename="swift_revenue_report_2026-10-25.csv"`
- Payload content (RFC 4180):
  ```csv
  Category,Units Sold,Gross Revenue,COGS,Net Profit,Margin %
  Engine Oil & Lubricants,120,4800.00,2880.00,1920.00,40.0%
  Tires & Tubes,45,6750.00,4387.50,2362.50,35.0%
  ...
  Total,165,11550.00,7267.50,4282.50,37.1%
  ```

---

### Scenario 3: Update Work Order Status

```bash
curl -i -X PATCH http://localhost:8080/api/v1/analytics/work-orders/wo-101/status \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED", "notes": "CVT tuning finished, tested and inspected"}'
```

Expected Response (`HTTP 200 OK`):
```json
{
  "success": true,
  "orderId": "wo-101",
  "status": "COMPLETED",
  "updatedAt": "2026-10-25T12:00:00Z"
}
```
