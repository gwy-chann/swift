# Quickstart & Verification Guide: Kiosk Session Granular Permissions

**Feature**: Kiosk Session Granular Permissions  
**Jira Issue**: [SIAA-86](https://the-three-devsketeers.atlassian.net/browse/SIAA-86)

---

## 1. Automated Test Execution

Run the targeted unit and integration test suite:
```bash
npm test lib/staff/__tests__/staff-kiosk-permissions.test.ts
```

Run TypeScript compilation check:
```bash
npm run typecheck
```

---

## 2. Manual UI Walkthrough

### Scenario 1: Stock Adjustment with `can_adjust_stock: true`
1. Navigate to `/staff/clock` on the terminal.
2. Switch profile to **Rico Santos** (Inventory Clerk, default `can_adjust_stock: true`) using PIN `3333`.
3. Open `/staff/search`.
4. Locate any product and click **Adjust Stock**.
5. Verify `StockAdjustmentModal` opens directly without requiring manager elevation.

### Scenario 2: Discount Override with `can_override_discount: false`
1. Navigate to `/staff/clock`.
2. Switch profile to **Mike Morales** (Cashier, default `can_override_discount: false`) using PIN `1234`.
3. Open Fast-Lane POS (`/staff/pos`) and add an item to the cart.
4. Click any discount tier (e.g. VIP 10%).
5. Verify `ManagerOverrideModal` is displayed prompting for manager elevation.
6. Enter demo PIN `8888` (or `1234` / `admin123`) and submit.
7. Verify the 10% discount is applied to the ticket.

### Scenario 3: Realtime Invalidation
1. While logged in as Mike Morales, run `fetchStaffShiftAction(mikeId)`.
2. Observe updated permissions returned.
