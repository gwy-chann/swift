# Quickstart & Verification Guide: Mechanic Workshop Queue

**Feature**: `099-mechanic-workshop-queue`  
**Jira Ticket**: [SIAA-99](https://the-three-devsketeers.atlassian.net/browse/SIAA-99)  
**Branch**: `feat/SIAA-99-mechanic-workshop-queue`  

---

## 🚀 Overview

This quickstart guides developers, QA engineers, and workshop leads through end-to-end verification of the Dedicated Mechanic Workshop Queue and Work Order Progression page (`/staff/work-orders`).

---

## 🧪 Scenario Verification Workflows

### Scenario 1: Mechanic Role Redirection & Sidebar Navigation

1. Open the browser to `http://localhost:3000`.
2. Select or enter demo credentials for mechanic:
   - Account: **Dante Reyes** (`mechanic1@swift.local`)
   - Role: **Mechanic**
3. Click "Log In" or switch profile in terminal punch modal.
4. **Expected Result**:
   - The browser automatically redirects to `http://localhost:3000/staff/work-orders` (instead of `/staff/compat`).
   - The Staff Sidebar shows the new **Work Order Queue** navigation item with active indicator.
   - Cashier and inventory clerk logins do not see this item unless elevated.

---

### Scenario 2: Segmented Queue Views ("My Active Jobs" vs "Workshop Bay Queue")

1. Navigate to `/staff/work-orders`.
2. Notice the two prominent view tabs at the top:
   - **My Active Jobs**: Displays orders assigned specifically to Dante Reyes.
   - **Workshop Bay Queue**: Displays all active repair bays (Bay 1 through Bay 4) and all queued work orders.
3. Toggle between tabs:
   - "My Active Jobs" filters to current mechanic jobs (e.g. `WO-2026-0001` and `WO-2026-0004`).
   - "Workshop Bay Queue" shows the entire floor status and allows filtering by status pills (`ALL`, `QUEUED`, `IN PROGRESS`, `PENDING_PARTS`, `COMPLETED`).

---

### Scenario 3: Real-Time Work Order Status Progression

1. Locate a work order card with status `QUEUED` (e.g., `WO-2026-0003 - Suzuki Raider 150 Fi`).
2. Click **Start Job**:
   - The card status changes optimistically to an amber **In Progress** badge.
   - The start time and elapsed timer begin counting.
3. Click **Wait for Parts**:
   - Status updates to **Waiting for Parts** with warning styling.
4. Click **Complete Service**:
   - Status transitions to **Ready for Inspection / Pickup** with green styling.
   - Bay availability updates in real time.

---

### Scenario 4: Service Details & Replacement Parts Drawer

1. On any work order card, click **Inspect Details** (or click the card body).
2. A slide-over drawer opens showing:
   - **Vehicle Breakdown**: Make, model, plate number, customer name, contact.
   - **Customer Complaint Notes**: Notes left during counter intake.
   - **Diagnostic / Labor Checklist**: Interactive checklist items (e.g. drain oil, check caliper seals, test ride).
   - **Required Replacement Parts**:
     - Lists required parts (e.g. `OIL-MOTUL-01`, `BRK-PAD-YAM-01`).
     - Shows live shelf locator tags (e.g., `Rack A, Shelf 2`) and stock quantity status (`In Stock` / `Low Stock`).

---

### Scenario 5: API & Strangler Gateway Parity Check

Test status progression via HTTP `PATCH` endpoint:

```bash
# Test PATCH status update to IN PROGRESS
curl -X PATCH http://localhost:3000/api/v1/analytics/work-orders/00000000-0000-0000-0000-000000000001/status \
  -H "Content-Type: application/json" \
  -d '{"status": "IN PROGRESS"}'

# Test PATCH status update to COMPLETED
curl -X PATCH http://localhost:3000/api/v1/analytics/work-orders/00000000-0000-0000-0000-000000000001/status \
  -H "Content-Type: application/json" \
  -d '{"status": "COMPLETED"}'
```

---

## ⚡ Automated Test Verification

Run the test suite inside the worktree:

```bash
# Typecheck validation
npx tsc --noEmit

# Unit and integration tests
npm test
```
