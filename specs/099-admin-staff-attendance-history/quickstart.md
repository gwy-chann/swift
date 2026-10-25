# Quickstart & Verification Guide: Admin Staff Shift Attendance & History

**Feature**: `099-admin-staff-attendance-history`  
**Date**: 2026-10-25  
**Spec Reference**: [`spec.md`](./spec.md) | **Data Model**: [`data-model.md`](./data-model.md)

## Overview

This guide outlines runnable end-to-end scenarios to verify that the dedicated Admin Staff Attendance & Time-In/Time-Out page operates accurately, displays live and historical shifts, responds to filters, and calculates durations correctly.

---

## Prerequisites

1. Development server running:
   ```bash
   npm run dev
   ```
2. Browser accessible at `http://localhost:3000`
3. Authenticated session as Admin (`/admin`) or staff credentials for testing punch clock (`/staff/clock`)

---

## Scenario 1: Navigation & Admin Sidebar Verification

**Objective**: Verify that "Staff Attendance" appears in the Admin Portal navigation and routes cleanly.

1. Navigate to `http://localhost:3000/admin`.
2. Inspect the left sidebar under the **Administration** category.
3. Verify that **Staff Attendance** appears with a Clock icon.
4. Click on **Staff Attendance**.
5. **Expected Outcome**:
   - The browser navigates to `/admin/attendance`.
   - The sidebar highlights "Staff Attendance" as the active route.
   - Page header displays "Staff Attendance & Time Clock History".

---

## Scenario 2: Itemized Attendance History Table & Duration Display

**Objective**: Verify that historical staff shifts render with full details and correct duration formatting.

1. Open `/admin/attendance`.
2. Verify that the table renders with columns:
   - **Staff Member** (Name & Role badge)
   - **Date** (`YYYY-MM-DD`, with `(Today)` tag for today's shifts)
   - **Time In** (Formatted AM/PM, e.g., `08:00:00 AM`)
   - **Time Out** (Formatted AM/PM or `-- Active Shift --`)
   - **Duration** (Formatted `XXh YYm`, e.g., `08h 15m`)
   - **Terminal** (e.g., `Terminal #1` or `Shop Floor Kiosk`)
   - **Status** (`On Shift`, `Break`, or `Completed` badge)
3. **Expected Outcome**:
   - Shifts are sorted in reverse chronological order (newest on top).
   - Completed shifts show exact start/end timestamps and elapsed duration.
   - Design tokens match semantic colors (zero hardcoded raw colors).

---

## Scenario 3: Real-Time Active Shift Tracking

**Objective**: Verify that in-progress shifts on floor terminals reflect immediately in the admin ledger.

1. Open `http://localhost:3000/staff/clock` in a separate tab or incognito window.
2. Clock in a staff member (e.g., "Mike Morales" or "Elena Santos").
3. Switch back to `http://localhost:3000/admin/attendance` and click **Refresh** (or observe automatic sync).
4. **Expected Outcome**:
   - The employee appears at the top of the ledger.
   - The status badge shows a green **On Shift** badge.
   - Time-Out displays `-- Active Shift --`.
   - The summary card "Active Staff On Duty" increments by 1.

---

## Scenario 4: Multi-Dimensional Filtering & Search

**Objective**: Test search by name, status filter, and date preset selection.

1. **Search Query**: Type `Mike` into the search box.
   - *Expected*: Only records for staff containing "Mike" remain visible.
2. **Status Filter**: Select `On Shift`.
   - *Expected*: Only active, unclosed shifts are displayed.
3. **Date Preset**: Select `Today`.
   - *Expected*: Only shifts clocked in on the current date appear.
4. **Reset**: Click **Reset Filters**.
   - *Expected*: All filters clear and the full shift log is restored.

---

## Scenario 5: Automated Test Execution

**Objective**: Execute unit and component tests verifying attendance actions and formatting utilities.

Run the Jest test suite:
```bash
npm test -- lib/admin/__tests__/attendance-actions.test.ts
npm test -- components/admin/__tests__/attendance-view.test.ts
```

**Expected Outcome**:
- 100% of test assertions pass.
- Duration calculations, midnight rollover logic, and filter functions verified.
