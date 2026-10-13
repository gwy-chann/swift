# Quickstart Guide: MotoMatcher Server Actions, Invalidation & Cart Wiring

**Feature**: `025-motomatcher-server-actions-cart-wiring`  
**Ticket**: [SIAA-58](https://the-three-devsketeers.atlassian.net/browse/SIAA-58)  

---

## 1. Running Automated Tests

Run the targeted MotoMatcher and Cart Store unit tests:
```bash
node --env-file=.env.local --experimental-strip-types --test --test-concurrency=1 "lib/motomatcher/__tests__/*.test.ts"
node --env-file=.env.local --experimental-strip-types --test --test-concurrency=1 "lib/store/__tests__/cart-store-motomatcher.test.ts"
```

---

## 2. Manual Verification Scenarios

### Scenario A: Next.js Server Actions & Model Caching
1. Navigate to `/admin/motomatcher`.
2. Inspect network tab: motorcycle models load server-rendered or via cached action with tag `motomatcher-models`.
3. Selecting a motorcycle platform loads the partitioned OEM vs Aftermarket matrix.

### Scenario B: 1-Click Fast-Lane Cart Dispatch
1. On `/admin/motomatcher` or `/staff/compat`, locate an in-stock aftermarket part (e.g. `RCB-NMAX-BP02`).
2. Click **+ Add to Active POS Cart**.
3. **Verify**:
   - Toast notification appears: `"Added RCB S-Series Ceramic Brake Pads to POS Cart (Shelf: Rack A-01 / Shelf 3)"`.
   - The cart count badge in the top navigation bar immediately increments from `2` to `3`.
   - The user remains in the MotoMatcher view without disruptive navigation.

### Scenario C: Out-of-Stock Guard
1. Locate a part with stock 0.
2. **Verify**:
   - Button renders disabled with text `"Out of Stock"`.
   - Clicking does not fire cart dispatch or toast.
