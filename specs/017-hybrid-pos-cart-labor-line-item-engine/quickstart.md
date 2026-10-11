# Quickstart & Verification Guide: Hybrid POS Cart & Joint Line-Item Engine

**Feature**: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine  
**Jira Issue**: [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18)  
**Date**: 2026-10-11  

---

## 1. Automated Test Verification

Run all test suites inside the worktree directory:

```bash
# Run cart store and POS test suites
npm test -- lib/store/__tests__/hybrid-cart-store.test.ts

# Run all project tests
npm test
```

---

## 2. Interactive Verification Scenarios

### Scenario 1: Adding Physical Motorcycle Part to Cart
1. Navigate to `/staff/pos` or `/admin/pos`.
2. Locate part `MOT-3100-10W40` in the Fast-Lane catalog grid or search input.
3. Click the card: verify it enters the cart with SKU `MOT-3100-10W40`, name `Motul 3100 Gold 4T 10W40 (1L)`, unit price `₱390.00`, and quantity `1`.
4. Click the card a second time: verify quantity updates to `2` without duplicate rows.

### Scenario 2: Adding Workshop Labor Service to Cart
1. Click the "Add Labor / Bay Service" (`SERVICES`) category tab.
2. Click `SRV-CVT-01` ("CVT Cleaning & Regrease").
3. Verify the item enters the cart with:
   - Distinct "Workshop Service" badge
   - Flat rate `₱350.00`
   - Assigned bay "Bay 2 / Scooter Bay"
   - Duration "45 mins"
4. Verify subtotal reflects the joint total of physical parts + labor service.

### Scenario 3: Steppers, Deletion & Instant Subtotal Response
1. In the cart pane, click `+` on any line item: verify quantity increases and subtotal recalculates instantly (<50ms).
2. Click `-` on an item until quantity reaches `0`, or click `✕` (Trash): verify line item is removed completely and subtotal decreases accordingly.

### Scenario 4: Out-of-Stock Protection & Manager Override
1. Locate an item with 0 stock (e.g. out of stock or decremented to 0).
2. Attempt to add it to the cart: verify the Manager Override Modal appears.
3. Enter invalid credentials or cancel: verify addition is blocked.
4. Authorize with manager PIN `1234` or credentials: verify item is added with an explicit `Overridden` / `Backorder` indicator.
5. Attempt to add any labor service: verify services never trigger out-of-stock modals.

---

## 3. Multi-Portal Verification
1. Verify `/staff/pos` functions identically with the shared `useCartStore`.
2. Verify `/admin/pos` renders the full hybrid POS cashier interface.
