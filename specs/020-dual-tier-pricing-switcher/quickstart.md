# Quickstart Guide: Dual-Tier Pricing Switcher Verification

**Feature**: Dual-Tier Pricing Switcher (Retail vs. Wholesale) with Dynamic Cart Recalculation  
**Branch**: `feat/SIAA-19-dual-tier-pricing-switcher`  
**Ticket**: [SIAA-19](https://the-three-devsketeers.atlassian.net/browse/SIAA-19)  

---

## 1. Automated Verification

Run the test suite in the isolated worktree:
```bash
node --env-file=.env.local --experimental-strip-types --test "lib/pos/__tests__/dual-tier-pricing-switcher.test.ts"
```

---

## 2. Manual Verification Scenarios (Staff & Admin POS)

### Scenario A: Dynamic Part Recalculation & Wholesale Badge
1. Open the Staff Fast-Lane POS (`http://localhost:3000/staff/pos`) or Admin POS (`http://localhost:3000/admin/pos`).
2. Add `MOT-3100-10W40` (Motul 3100 Gold 1L) to the cart.
   - Initial retail unit price is `₱390.00`.
   - Initial line item total is `₱780.00` for quantity 2.
3. Add a workshop labor service: select "Add Labor / Bay Service" tab, click `SRV-OIL-01` ("Standard Oil Change").
   - Service unit price is `₱100.00`.
4. Observe initial subtotal: `₱780.00 + ₱100.00 = ₱880.00`.
5. Click the **"Wholesale"** toggle tab in the cart header.
6. **Expected Results**:
   - `MOT-3100-10W40` unit price immediately adjusts from `₱390.00` to `₱330.00`.
   - Motul line total becomes `₱660.00`.
   - `SRV-OIL-01` labor service rate remains strictly invariant at `₱100.00`.
   - New subtotal is immediately `₱660.00 + ₱100.00 = ₱760.00` (<50ms).
   - An explicit high-contrast badge banner (`WHOLESALE TIER ACTIVE`) appears prominently above the checkout button.
   - Catalog item cards display wholesale prices (e.g., Motul shows `₱330.00` instead of `₱390.00`).

---

### Scenario B: Preserving Quantities & Item Notes
1. With Wholesale mode still active, increase the Motul quantity to 4.
2. Click the **"Retail"** toggle tab.
3. **Expected Results**:
   - Cart retains 4 units of Motul and 1 unit of Oil Change labor.
   - Motul adjusts back to `₱390.00` each (total `₱1,560.00`).
   - Labor service remains `₱100.00`.
   - Subtotal updates to `₱1,660.00`.
   - The Wholesale active banner disappears smoothly.
