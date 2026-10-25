# Quickstart & Verification Guide: Admin Motor Repair Tracking Dashboard

**Feature**: `specs/107-admin-motor-repair-tracking/spec.md`  
**Date**: 2026-10-26  
**Jira Ticket**: [SIAA-107](https://the-three-devsketeers.atlassian.net/browse/SIAA-107)  

---

## 1. Prerequisites & Setup

Run from the root of the worktree `.worktrees/SIAA-107`:

```bash
# Verify test suite
npm test lib/repairs/__tests__/repairs-actions.test.ts

# Run dev server
npm run dev
```

---

## 2. Walkthrough Scenarios

### Scenario 1: Navigate to Admin Workshop Repairs
1. Log in as an administrator (or ensure `swift-session-role=admin` cookie is active).
2. Navigate to `http://localhost:3000/admin/repairs` or click **Workshop Repairs** in the Admin sidebar under **Store Intelligence**.
3. **Verify**:
   - Page header displays "Admin Motor Repair & Workshop Tracking".
   - 4 KPI summary cards show: Active Motors Under Repair, In Repair, Waiting for Parts, Bay Utilization (%).
   - Active motorcycle cards appear with Make, Model, License Plate, Chassis #, Customer Name, Phone, Bay, Mechanic, Complaint, and Elapsed Time.

### Scenario 2: Inspect Repair Details in Slide-Over Drawer
1. On `/admin/repairs`, click any repair card (e.g., `WO-2026-0001` - Yamaha NMAX 155).
2. **Verify**:
   - Slide-over inspection drawer animates into view from the right.
   - Drawer header displays vehicle identity and customer phone.
   - Real-time punch-in duration and technician active badge are visible.
   - Diagnostic task checklist displays completed vs pending steps.
   - Installed parts list shows Motul Scooter Expert oil and gear oil with shelf locations (`Rack B, Shelf 1`).
   - Mechanic floor notes and diagnostic observations are displayed.
   - Clicking the backdrop or "Close" icon dismisses the drawer.

### Scenario 3: Filter and Search Active Repairs
1. In the search input, type `NMAX` or `XYZ` or `Juan`.
2. **Verify**: Card list immediately filters to matching records without page reload.
3. Click the **Waiting for Parts** status badge pill.
4. **Verify**: Only work orders with status `PENDING_PARTS` are shown (e.g., Kawasaki Ninja 400).
5. Switch to **Table View** via the view toggle button.
6. **Verify**: Repairs render as a dense tabular view with sortable columns.

### Scenario 4: Admin Live Mechanic Reassignment
1. Open the inspection drawer for an unassigned or stalled job (e.g. `WO-2026-0003` - Suzuki Raider 150 Fi).
2. In the "Reassign Mechanic" section, select an on-shift mechanic (e.g. "Dante Reyes") from the dispatch dropdown.
3. Click "Confirm Reassignment".
4. **Verify**:
   - The card and drawer immediately reflect the new mechanic assignment.
   - Toast notification confirms "Mechanic reassigned successfully".
   - An audit log entry is recorded in the system audit trail.

### Scenario 5: Non-Admin Role-Based Access Control (RBAC) Guard
1. Log out or set role cookie to `swift-session-role=staff`.
2. Attempt to navigate directly to `http://localhost:3000/admin/repairs`.
3. **Verify**:
   - Access is blocked.
   - User is redirected to `/staff/work-orders` (for mechanics) or `/staff/pos` (for cashiers) with query param `notice=unauthorized_admin_access`.
