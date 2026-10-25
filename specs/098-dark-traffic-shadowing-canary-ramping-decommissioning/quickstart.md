# Quickstart & Verification Guide: Dark Traffic Shadowing, Canary Traffic Ramping & Next.js Backend Decommissioning

**Feature**: `098-dark-traffic-shadowing-canary-ramping-decommissioning`  
**Jira Issue**: [SIAA-98](https://the-three-devsketeers.atlassian.net/browse/SIAA-98)  
**Parent Epic**: [SIAA-87](https://the-three-devsketeers.atlassian.net/browse/SIAA-87)  
**Phase**: Phase 6 (Shadow Parity & Cutover)

---

## 1. Prerequisites & Environment Setup

Verify Java 21, Maven, Node.js, and Docker environments:

```powershell
$env:JAVA_HOME = "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2024.3.3\jbr"
$mvn = "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2024.3.3\plugins\maven\lib\maven3\bin\mvn.cmd"
& $mvn -version
node -v
```

---

## 2. Verification Steps

### Step 1: Run REST Assured Parity Test Suite (46 Endpoints)

Run the comprehensive parity test suite in `swift-backend`:

```powershell
cd swift-backend
$env:JAVA_HOME = "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2024.3.3\jbr"
& "C:\Program Files\JetBrains\IntelliJ IDEA Community Edition 2024.3.3\plugins\maven\lib\maven3\bin\mvn.cmd" test "-Dtest=RestAssuredParityVerificationTests"
cd ..
```

*Expected Output*:
```
[INFO] Running com.swift.modules.parity.RestAssuredParityVerificationTests
[INFO] Tests run: 10, Failures: 0, Errors: 0, Skipped: 0
[INFO] BUILD SUCCESS
```

---

### Step 2: Validate TypeScript Parity Diff Engine

Run the normalized JSON parity diff engine:

```powershell
npx tsx scripts/parity-diff-engine.ts
```

*Expected Output*:
```
[Parity Diff Engine] Validating 46 REST endpoints across 10 modules...
[PASS] GET /api/v1/motomatcher/models (100% match)
[PASS] GET /api/v1/catalog/search (100% match)
[PASS] GET /api/v1/inventory/low-stock (100% match)
[PASS] GET /api/v1/pricing/rules (100% match)
[PASS] GET /api/v1/services/labor (100% match)
[PASS] GET /api/v1/shifts/active/staff-001 (100% match)
[PASS] GET /api/v1/pos/transactions (100% match)
[PASS] GET /api/v1/analytics/kpis (100% match)
[PASS] GET /api/v1/admin/users (100% match)
[PASS] GET /api/v1/auth/session (100% match)
------------------------------------------------------------------------
Overall Parity: 100.0% (46/46 Passed, 0 Mismatches)
Status: PRODUCTION READY FOR CANARY RAMPING
```

---

### Step 3: Run 14-Day Canary Graduation Gatekeeper

Evaluate the automated criteria for legacy Server Action retirement:

```powershell
npx tsx scripts/canary-graduation-check.ts
```

*Expected Output*:
```
[Canary Graduation Gatekeeper] Evaluating Phase 6 Cutover Metrics...
Stage: STAGE_100 (100% Spring Boot)
Consecutive Defect-Free Days: 14 / 14
Zero Rollbacks: PASS (0 rollbacks detected)
Error Rate: PASS (0.002% < 0.01% threshold)
P99 Latency: PASS (68ms < 120ms threshold)
------------------------------------------------------------------------
Result: ELIGIBLE FOR GRADUATION
Action: Safe decommissioning and retirement of legacy Next.js Server Actions APPROVED.
```

---

### Step 4: Validate NGINX Configuration & Canary Shifting

Test switching canary stages:

```powershell
powershell -ExecutionPolicy Bypass -File gateway/set-canary-stage.ps1 -Stage 25
powershell -ExecutionPolicy Bypass -File gateway/set-canary-stage.ps1 -Stage 100
```

---

### Step 5: Verify Frontend Typecheck

Ensure strict end-to-end type safety:

```powershell
npx tsc --noEmit
```

*Expected Output*: 0 TypeScript errors.
