# Quickstart & Verification Guide: Global Markup Rules Configuration

**Feature**: `019-global-markup-rules-configuration`  
**Jira Issue**: [SIAA-39](https://the-three-devsketeers.atlassian.net/browse/SIAA-39)  

---

## 1. Automated Test Execution

Run the dedicated test suite validating all 4 acceptance scenarios:

```bash
node --test --import tsx lib/admin/__tests__/global-markup-configuration.test.ts
```

Run complete typechecking and linting:

```bash
npm run typecheck
npm run lint
```

---

## 2. Manual Verification Scenarios

### Scenario 1: Control Panel Initialization
1. Navigate to `http://localhost:3000/admin/rates` (within `#view-pricing`).
2. Locate the **Global Parts Markup Rules** card.
3. Verify baseline percentage inputs:
   - Standard Retail Markup: `35%`
   - Wholesale/Reseller Markup: `18%`
   - Performance Aftermarket Markup: `40%`
4. Verify the margin simulation for a `₱1,000.00` benchmark part displays:
   - Retail: `₱1,350.00` (`+₱350.00`)
   - Wholesale: `₱1,180.00` (`+₱180.00`)
   - Aftermarket: `₱1,400.00` (`+₱400.00`)

### Scenario 2: Modification & Validation
1. Change Standard Retail Markup to `38%`.
2. Change Wholesale Markup to `20%`.
3. Click button **"Save Markup Rules"**.
4. Verify confirmation toast/alert: `"Global pricing rules saved!"`.
5. Verify validation rejects invalid inputs (e.g. entering `-5%` or `250%` displays inline validation errors and prevents submission).

### Scenario 3: Propagation to Product Registration
1. With Retail at `38%` and Wholesale at `20%`, navigate to `/admin/inventory`.
2. Click **"+ Add Part"** to open `ProductRegistrationModal`.
3. Enter Unit Cost `500.00`.
4. Verify dynamic calculations:
   - Wholesale Price auto-computes to `₱600.00` (`+20%`).
   - Retail Price auto-computes to `₱690.00` (`+38%`).

### Scenario 4: Audit Trail Logging
1. After saving markup modifications, verify `SWIFT_DB.auditLogs` has an entry with:
   - Action: `Modified Global Retail Markup from 35% to 38%, Wholesale from 18% to 20%`.
   - Admin user name and timestamp.
