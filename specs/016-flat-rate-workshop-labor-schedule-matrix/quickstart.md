# Quickstart & Verification Guide: Flat-Rate Workshop Labor Schedule & Service Duration Matrix

**Feature**: Flat-Rate Workshop Labor Schedule & Service Duration Matrix  
**Jira Issue**: [SIAA-40](https://the-three-devsketeers.atlassian.net/browse/SIAA-40)  
**Date**: 2026-10-11  

---

## 1. Automated Verification

Run unit tests verifying the pro-rated labor calculations and pricing rules actions:

```bash
npm test -- lib/admin/__tests__/pricing-actions.test.ts
npm test -- lib/admin/__tests__/pro-rated-estimator.test.ts
npm test -- lib/admin/__tests__/service-actions.test.ts
```

Run TypeScript and lint verification:

```bash
npm run typecheck
npm run lint
```

---

## 2. Interactive Verification Scenarios

### Scenario 1: Flat-Rate Labor Schedule Matrix Display
1. Start the development server (`npm run dev`).
2. Navigate to `http://localhost:3000/admin/rates` in your browser.
3. Verify that the main container has `id="view-pricing"`.
4. Verify the panel titled **"Flat-Rate Labor Schedule Matrix"** renders all 6 standard workshop services:
   - "Oil & Gear Oil Change" (`15m`, `₱100.00`)
   - "CVT Cleaning & Regrease" (`45m`, `₱350.00`)
   - "Tire Mounting & Sealing" (`20m`, `₱150.00`)
   - "FI Throttle Body Reset" (`60m`, `₱650.00`)
   - "Front Shock Re-oil" (`90m`, `₱800.00`)

### Scenario 2: Labor Rate Maintenance & Notification
1. In the Flat-Rate Schedule Matrix table, click the edit icon on **"CVT Cleaning & Regrease"**.
2. Change the flat rate from `₱350.00` to `₱400.00`.
3. Submit the change.
4. Verify:
   - A toast notification appears: `"Updated rate for CVT Cleaning & Regrease to ₱400.00"`.
   - The table row displays `₱400.00` immediately.

### Scenario 3: Realtime POS Synchronization
1. Open two browser windows side by side:
   - Window A: `http://localhost:3000/admin/rates`
   - Window B: `http://localhost:3000/staff/pos`
2. In Window A, edit a service rate (e.g. change "Tire Mounting & Sealing" to `₱180.00`).
3. In Window B (without refreshing), observe the "SERVICES" tab: the service card updates to `₱180.00` in <500ms.
4. Click the service to add it to the cart, verifying the line item bills at `₱180.00`.

### Scenario 4: Standard Hourly Labor Rate Benchmark & Dynamic Estimator
1. In `http://localhost:3000/admin/rates`, locate the **"Standard Hourly Labor Rate Benchmark"** panel.
2. Verify the base rate shows `₱450.00/hour`.
3. Select preset `90m` (or enter 90 minutes).
4. Verify the dynamic calculation displays: `₱675.00` (`1.5 hrs * ₱450.00`).
5. Update the base hourly rate to `₱500.00/hour` and save.
6. Verify the calculation automatically updates to `₱750.00` (`1.5 hrs * ₱500.00`).
