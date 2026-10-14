# Quickstart & Verification Guide: 1-Click Fast-Lane POS Cart Insertion & Live Upsell Dispatch

**Feature**: `026-fast-lane-cart-insertion`  
**Ticket**: [SIAA-25](https://the-three-devsketeers.atlassian.net/browse/SIAA-25)  

---

## Prerequisites & Setup

1. **Working Directory**: Ensure you are in the project root (`swift/`).
2. **Dependencies**: Installed and verified (`npm install`).
3. **Development Server**: Start Next.js development server if not already running:
   ```bash
   npm run dev
   ```

---

## Automated Verification Suite

Run the dedicated test suite validating all 4 acceptance scenarios:
```bash
npm test -- lib/motomatcher/__tests__/cart-dispatch.test.ts
```

Run full type checking:
```bash
npm run typecheck
```

---

## Manual End-to-End Verification Scenarios

### Scenario 1: 1-Click Add to Cart Action from MotoMatcher Matrix
1. Open the Staff Portal MotoMatcher at `http://localhost:3000/staff/compat` (or Admin portal at `http://localhost:3000/admin/motomatcher`).
2. Select a motorcycle platform (e.g., **Yamaha NMAX 155**).
3. Find an in-stock OEM or Aftermarket part card (e.g., `YAM-B6H-E4451-00` Air Filter Element).
4. Click **"+ Add to Active POS Cart"**.
5. **Expected Outcome**:
   - The button flips to a green `Added to Cart` state with a checkmark for 1.8 seconds.
   - A floating toast notification appears: `"Added Yamaha Genuine Air Filter Element to POS Cart!"`.
   - The part is queued in `cartStore` with quantity 1.

### Scenario 2: Cart Badge Counter Synchronization (< 50ms)
1. Observe the left sidebar navigation link for **"Fast-Lane POS"** (`/staff/pos`).
2. Before adding parts, note the absence of a badge or initial badge count.
3. Click "+ Add to Active POS Cart" on a part in the MotoMatcher matrix.
4. **Expected Outcome**:
   - The sidebar badge updates instantaneously to `"1"` (or increments from `N` to `N + 1`) in real-time (< 50ms).
   - If configured in the topbar, the shopping cart indicator badge also reflects the new total count immediately.

### Scenario 3: Duplicate Additions Increment Quantity
1. On the same part card, click "+ Add to Active POS Cart" a second time.
2. **Expected Outcome**:
   - The button flips to "Added to Cart" feedback again.
   - The sidebar badge increments to reflect the new total items count.
   - Navigate to `/staff/pos` (Fast-Lane POS cashier view):
     - The item appears once in the active cart with `Qty: 2`.
     - The line item total and subtotal reflect `2 × Unit Price`.
     - No duplicate rows exist for the same SKU.

### Scenario 4: Out-of-Stock Prevention Guard
1. Locate a part with `0 in stock` or filter down to an out-of-stock item.
2. **Expected Outcome**:
   - The "+ Add to Active POS Cart" button is disabled and visually dimmed (`opacity-50`, cursor `not-allowed`).
   - The button text displays `"Out of Stock"`.
   - Clicking does not fire cart state additions.

### Scenario 5: Stock Cap Limit Guard
1. Add a low-stock part until its quantity in the cart equals its physical stock level.
2. Attempt to click "+ Add to Active POS Cart" again.
3. **Expected Outcome**:
   - The system displays a warning toast: `"Cannot add more: Available stock limit reached for [Part Name]"`.
   - Cart quantity is preserved at the maximum stock cap without overflowing.
