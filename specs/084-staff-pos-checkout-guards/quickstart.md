# Quickstart: Staff POS Checkout Authorization & Action Guards

**Feature**: `084-staff-pos-checkout-guards`  
**Jira Issue**: [SIAA-84](https://the-three-devsketeers.atlassian.net/browse/SIAA-84)  
**Date**: 2026-10-20  

---

## 1. Quick Verification Scenarios

### Scenario A: Unauthorized Mechanic Checkout Attempt
1. Navigate to `/staff/clock` on the kiosk.
2. Use the **Staff Profile Switcher** to switch to **Dante Reyes** (`Mechanic`, PIN: `3333`). Clock in if not already on shift.
3. Navigate to `/staff/pos`.
4. Add any motorcycle part to the cart (e.g. `Brake Pads`).
5. Click **"Proceed to Payment"** or press `F12` / `F9`.
6. **Expected Result**: 
   - `PaymentModal` does NOT open.
   - `UnauthorizedRoleModal` appears with a red warning badge stating: *"Access Restricted: Only active Cashiers or Store Managers can process sales and accept payments."*
   - An audit event is recorded in the security audit logs.

### Scenario B: Authorized Cashier Checkout
1. Switch to **Mike Morales** (`Cashier`, PIN: `1234`).
2. Navigate to `/staff/pos` with items in the cart.
3. Click **"Proceed to Payment"** or press `F12`.
4. **Expected Result**:
   - `PaymentModal` opens immediately and accepts cash tender.

### Scenario C: Floor Emergency Manager Override
1. While logged in as **Dante Reyes** (`Mechanic`), trigger checkout to display `UnauthorizedRoleModal`.
2. Click **"Request Manager Override"**.
3. In `ManagerOverrideModal`, enter admin PIN (`8888` or `1234` or demo password `admin123`).
4. Submit the PIN.
5. **Expected Result**:
   - Override is approved.
   - `ManagerOverrideModal` and `UnauthorizedRoleModal` close.
   - `PaymentModal` immediately opens allowing Dante to complete the customer's sale under manager approval.

---

## 2. Automated Test Execution

Inside the worktree, run:
```bash
npm test -- lib/pos/__tests__/staff-pos-checkout-guard.test.ts
```
