# Quickstart & Verification Guide: Live Service Bay Queue & Mechanic Monitor

**Feature**: `035-live-service-bay-queue-mechanic-utilization`  
**Jira Issue**: [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35)  

---

## 1. Quick Verification Command

Run the automated test suite verifying all 4 acceptance scenarios:

```bash
npm test -- components/admin/__tests__/service-bay-status.test.tsx
```

Run TypeScript compilation check:

```bash
npx tsc --noEmit
```

---

## 2. Interactive Walkthrough Scenarios

### Scenario 1: Multi-Bay Activity Panel on `#view-dashboard`
1. Navigate to the Admin Portal at `/admin`.
2. Inspect the dashboard container element; confirm it has `id="view-dashboard"`.
3. Locate the **Service Bay Status** panel.
4. Verify the header shows the dynamic active capacity badge (e.g. `2 Bays Active` or `4 Bays Active`).
5. Verify each bay row displays:
   - Bay Identifier (e.g., `Bay 1 (Quick Bay)`)
   - Motorcycle Model & Service (e.g., `Yamaha NMAX 155 • Oil Change + Brake Pads`)

### Scenario 2: Mechanic Assignment & Time Remaining
1. In the Service Bay Status panel, inspect an in-progress row:
   - Confirm technician name is displayed: `Mechanic: Dante Reyes`
   - Confirm remaining time is displayed: `(~10 mins left)`

### Scenario 3: Status Badge Hierarchy
1. Inspect the badges across bays:
   - In-progress bay: Warning amber badge with label `In Progress` (`bg-accent-light text-accent`)
   - Queued bay: Neutral gray badge with label `Queued` (`bg-bg-muted text-text-secondary`)
   - Finished bay: Success green badge with label `Ready for Inspection / Pickup` (`bg-success-light text-success`)

### Scenario 4: Reactive Synchronization
1. When a work order event is broadcast via `useExecutiveRealtime` or the central store updates, the row updates dynamically without requiring a full browser refresh.
