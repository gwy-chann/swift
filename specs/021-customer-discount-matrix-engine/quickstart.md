# Quickstart & Verification Guide: Customer Discount Matrix Engine

**Feature**: Customer Discount Matrix Engine (Senior, PWD & VIP) & Subtotal Computation  
**Branch**: `feat/SIAA-20-customer-discount-matrix-engine`  
**Date**: 2026-10-12  

---

## 1. Quick Verification via Automated Tests

Run the test suite inside the worktree:
```bash
npm test
```

Specifically run the discount matrix test suite:
```bash
node --env-file=.env.local --experimental-strip-types --test "lib/pos/__tests__/discount-matrix.test.ts"
```

---

## 2. Interactive Verification Scenarios

### Scenario 1: Applying Senior Citizen / PWD 20% Discount
1. Navigate to `/staff/pos` or `/admin/pos`.
2. Add `Motul 3100 Gold` (qty 2, ₱390 x 2 = ₱780) and `Oil Change Labor` (qty 1, ₱100) -> Subtotal = ₱880.00.
3. In the cart summary discount chips, click **`20% SC/PWD`**.
4. **Expected Result**:
   - The chip activates with `var(--accent)` border and `var(--accent-light)` background.
   - Discount displays as `-₱176.00` in red/danger monospace text.
   - Total Due calculates to `₱704.00` in prominent green monospace text.

### Scenario 2: Switching to VIP 10% (Mutual Exclusivity)
1. With `20% SC/PWD` active, click **`10% VIP`**.
2. **Expected Result**:
   - The `20% SC/PWD` chip deactivates.
   - `10% VIP` chip becomes active.
   - Discount updates to `-₱88.00`.
   - Total Due updates to `₱792.00`.
   - No discount compounding occurs.

### Scenario 3: Resetting Discount
1. Click the active `10% VIP` chip again, or click `0% Standard`.
2. **Expected Result**:
   - Discount resets to `-₱0.00`.
   - Total Due returns to `₱880.00`.
