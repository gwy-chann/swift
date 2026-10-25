# Quickstart & Verification Guide: Automatic POS Labor Checkout to Service Bay Work Order Queue Bridge

**Feature**: `100-pos-labor-checkout-work-order-bridge`  
**Jira Ticket**: [SIAA-100](https://the-three-devsketeers.atlassian.net/browse/SIAA-100)  
**Branch**: `feat/SIAA-100-pos-labor-checkout-work-order-bridge`  

---

## 🚀 Overview

This quickstart guides developers, QA engineers, and operations leads through verifying the automated bridge between POS checkout completion and workshop floor work order queuing.

---

## 🧪 Verification Scenarios

### Scenario 1: Labor Service POS Checkout Auto-Provisions Work Order

1. Open `http://localhost:3000/staff/pos` logged in as a cashier (or admin).
2. In the catalog, add a labor service item to the cart:
   - For example: **Full Synthetic Oil Change** (`SRV-OIL-01`, ₱250.00).
   - Optionally add a physical part (e.g., Motul 7100 4T 10W-40, ₱650.00).
3. Click **Complete Sale (F12)** to open the Cash Tender Modal.
4. Tender exact payment or cash with change (e.g. ₱1,000.00) and confirm payment.
5. **Expected Result**:
   - POS checkout completes and prints/previews thermal receipt.
   - The returned checkout response records `workOrdersCreated >= 1`.
   - A new work order is provisioned with format `WO-2026-XXXX`, status `QUEUED`, and unassigned mechanic.

---

### Scenario 2: Real-Time Broadcast to Mechanic Queue (`/staff/work-orders`)

1. Open a second browser tab or split window to `http://localhost:3000/staff/work-orders` (logged in as Dante Reyes or viewing "Workshop Bay Queue").
2. In the first window, finalize a checkout containing a labor service.
3. **Expected Result**:
   - The new work order card renders under "Workshop Bay Queue" on the second window in under 500ms without requiring a page refresh.
   - The card shows the customer name, motorcycle model, plate number, ordered service, and an amber/blue status badge.

---

### Scenario 3: Unassigned Work Order Claim Flow

1. On the newly appeared work order card in `/staff/work-orders`:
   - Verify the mechanic attribution displays: **Unassigned** (amber bold).
   - Verify the action button displays: **Claim Job**.
2. Click **Claim Job**:
   - The work order updates: `mechanicId` sets to Dante Reyes' profile ID.
   - The card updates immediately to show **Dante Reyes (You)**.
   - The primary action button changes to **Start Job**.

---

### Scenario 4: Pure Parts Transactions Skip Work Order Creation

1. Back at `/staff/pos`, add only physical parts to the cart:
   - For example: Spark Plug (`NGK-CR7HSA`, qty: 2).
2. Tender cash and complete sale.
3. Check the workshop queue at `/staff/work-orders`:
   - **Expected Result**:
     - Inventory stock decrements normally in product catalog.
     - No new work order card appears in `/staff/work-orders`.
     - Zero empty work orders clutter the workshop queue.

---

## ⚡ Automated Verification Commands

Run the test suite inside the worktree:

```bash
# Typecheck verification
npx tsc --noEmit

# Unit and integration tests
npm test -- lib/pos/__tests__/pos-labor-bridge.test.ts
```
