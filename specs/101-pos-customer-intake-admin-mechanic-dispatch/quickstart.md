# Quickstart Verification Guide: POS Customer & Complaint Intake Prompt with Admin On-Shift Mechanic Dispatch

**Feature**: `specs/101-pos-customer-intake-admin-mechanic-dispatch/spec.md`  
**Date**: 2026-10-26  
**Jira Ticket**: [SIAA-101](https://the-three-devsketeers.atlassian.net/browse/SIAA-101)  

---

## 1. Prerequisites & Environment Setup

1. Ensure the development server is running:
   ```bash
   npm run dev
   ```
2. Navigate to `http://localhost:3000`.

---

## 2. Verification Scenarios

### Scenario 1: POS Customer Intake Modal Interception (Labor Line Item)
1. Navigate to `/staff/pos` (or `/admin/pos`).
2. Add a labor service item to the cart (e.g. `Full Synthetic Oil Change` or `SRV-OIL-01`).
3. Click **"COMPLETE SALE (F12)"** (or press `F12`).
4. **Expected Result**:
   - The **"Customer & Vehicle Intake"** dialog appears *before* the Cash Tender Modal.
   - The dialog contains required input fields:
     - Customer Full Name
     - Contact Phone Number (with format hint `09XX-XXX-XXXX`)
     - Vehicle Model & Year
     - Plate Number
     - Customer Complaints / Reason for Service
5. Try submitting with empty fields or an invalid phone number (e.g., `12345`):
   - Inline validation errors display, preventing progression.
6. Fill in valid data:
   - Name: `Rodrigo Duterte`
   - Phone: `0917-888-9999`
   - Vehicle: `Yamaha Tracer 900 GT`
   - Plate: `123-NCR`
   - Complaints: `Vibration on front handlebar at 80 km/h`
7. Click **"Proceed to Payment"**:
   - The **Cash Tender Modal** opens with the intake details stored in checkout state.
8. Tender cash and complete payment.

---

### Scenario 2: Pure Physical Parts Fast-Lane Bypass
1. Reset or clear the cart.
2. Add only physical parts to the cart (e.g. Spark Plug, Brake Pads).
3. Click **"COMPLETE SALE (F12)"**.
4. **Expected Result**:
   - The Customer Intake Dialog is **completely bypassed**.
   - The Cash Tender Modal opens immediately for rapid retail customer throughput.

---

### Scenario 3: Real Database Persistence in Workshop Queue & Drawer
1. Open a new browser tab to `http://localhost:3000/staff/work-orders`.
2. Locate the newly auto-provisioned work order in the **"Workshop Bay Queue"** (status: `QUEUED`).
3. Click the card to open the **Work Order Detail Drawer**.
4. **Expected Result**:
   - Customer: `Rodrigo Duterte` (NOT "Walk-in Customer")
   - Contact Number: `0917-888-9999` (NOT "0917-000-0000")
   - Vehicle: `Yamaha Tracer 900 GT • 123-NCR`
   - Customer Complaints: `Vibration on front handlebar at 80 km/h`
   - Assigned Mechanic: `Unassigned`

---

### Scenario 4: Admin On-Shift Mechanic Work Order Dispatch
1. Open an admin view or workshop overview with Admin privileges (`/admin` or admin workshop view).
2. Click on the unassigned work order to open its details.
3. Locate the **"Assigned Mechanic"** field.
4. **Expected Result**:
   - An interactive **"Assign Mechanic"** selector is visible.
   - The dropdown dynamically lists currently on-shift mechanics (e.g. `Dante Reyes`, `Alex Lim`).
5. Select a mechanic from the dropdown (e.g. `Dante Reyes`).
6. **Expected Result**:
   - `assignMechanicAction` executes and updates the order in <500ms.
   - Realtime broadcast transmits `WORK_ORDER_ASSIGNED` over `operational-intelligence`.
   - The assigned mechanic updates immediately to `Dante Reyes`.

---

### Scenario 5: Role-Based Protection for Non-Admin Staff
1. In `/staff/work-orders` (as a standard cashier or floor mechanic):
2. Open the same Work Order Detail Drawer.
3. **Expected Result**:
   - The Admin "Assign Mechanic" dropdown is **hidden** or read-only.
   - For technicians, the standard self-dispatch **"Claim Job"** button remains available for unassigned orders.
