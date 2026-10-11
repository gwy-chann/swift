# Quickstart Guide: POS Server Actions, Receipt Persistence & Thermal Modal UI Wiring

**Feature**: `020-pos-server-actions-receipt-modal-wiring`  
**Jira Ticket**: [SIAA-52](https://the-three-devsketeers.atlassian.net/browse/SIAA-52)  
**Date**: 2026-10-11  

---

## 1. Quick Verification Steps

### Step 1: Run Unit & Integration Tests
```bash
npm test -- lib/store/__tests__/cart-store-checkout.test.ts
npm test -- components/pos/__tests__/thermal-receipt-modal.test.ts
npm test -- lib/pos/__tests__/checkout-revalidation.test.ts
```

### Step 2: Test Staff POS Terminal Checkout Flow
1. Start development server (`npm run dev`).
2. Navigate to `http://localhost:3000/staff/pos`.
3. Add a physical part (e.g., `Motul 3100 Gold 4T 10W40`) and a workshop labor service (e.g., `Standard Oil & Gear Oil Change`) to the cart.
4. Apply Senior/PWD discount (20%).
5. Click **Checkout (F12)**.
6. Verify:
   - Progress state indicates checkout processing.
   - On completion, cart items are cleared.
   - `<ThermalReceiptModal>` automatically appears displaying the receipt.
   - Itemized lines show part name with rack/shelf locator, and labor service with bay name.
   - Discount amount (`-₱...`), total due, cash tendered, and change due match cart calculations.
   - Toggle between **58mm** and **80mm** width buttons; observe responsive roll width resizing.
   - Click **Print Receipt** (triggers `window.print()`).

### Step 3: Test Historical Receipt Lookup (`TX-1041`)
1. In the receipt modal lookup or test helper, request receipt `TX-1041`.
2. Verify that transaction `TX-1041` loads with its 3 line items:
   - Motul 3100 Gold 4T (Aisle 1 / Shelf 1)
   - Standard Oil & Gear Oil Change (Bay 1 / Quick Bay)
   - Tubeless Tire Mounting (Bay 1 / Quick Bay)
   - Subtotal: ₱550.00, Total Due: ₱550.00, Cash Tendered: ₱600.00, Change: ₱50.00.

### Step 4: Test Realtime Admin Dashboard Broadcast
1. Open `http://localhost:3000/admin` in one browser tab.
2. Note the "Gross Revenue" KPI card value.
3. In a second browser tab (or POS terminal), execute a checkout with total due ₱550.00.
4. Observe that the Admin Dashboard increments the Gross Revenue card in real time without refreshing the page.
