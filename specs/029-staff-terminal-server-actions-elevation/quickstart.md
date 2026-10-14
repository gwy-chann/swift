# Quickstart: Staff Terminal Server Actions, Secure Elevation Auth & UI Wiring

**Feature**: `029-staff-terminal-server-actions-elevation`  
**Jira Ticket**: [SIAA-64](https://the-three-devsketeers.atlassian.net/browse/SIAA-64)  
**Date**: 2026-10-14  

---

## 1. Prerequisites & Environment

Ensure all dependencies and development server run cleanly:
```bash
npm run typecheck
npm test
```

---

## 2. Verification Scenarios

### Scenario 1: Staff Digital Punch Clock
1. Navigate to `/staff/clock`.
2. Click **Clock In (Start Shift)**:
   - Button switches to active shift state.
   - Shift duration timer begins counting up.
   - Attendance history table updates immediately with the active shift.
3. Click **Take Meal / Rest Break**:
   - Status switches to "Break" and timer pauses.
4. Click **Clock Out (End Shift)**:
   - Shift duration is calculated and persisted.
   - Attendance history table updates to "Completed".

### Scenario 2: Instant SKU / Barcode Price Checker
1. Navigate to `/staff/pricecheck`.
2. Locate `#priceScanInput`.
3. Type `YAM-NMAX-BL01`:
   - Within 200ms, item details appear.
   - Check pricing grid: Retail (₱380.00), Wholesale (₱320.00), SC/PWD 20% Off (₱304.00).
   - Check warehouse shelf location coordinates (`RACK-A1-04` or floor stock).

### Scenario 3: Master Admin Elevation Modal
1. From `/staff/pos` or the staff layout header/footer, click the Admin Switch trigger.
2. The Admin Portal Access modal opens.
3. Enter PIN `8888` (or default elevation PIN) and submit:
   - `verifyAdminElevationAction` executes.
   - Sets secure HTTP-only cookie `swift_admin_elevated`.
   - Logs elevation to audit logs.
   - Seamlessly redirects to `/admin` without getting bounced back to `/staff`.

### Scenario 4: Fast-Lane POS Hotkey
1. Navigate to `/staff/pos`.
2. Press `F12`:
   - Cash tender checkout modal immediately opens.
