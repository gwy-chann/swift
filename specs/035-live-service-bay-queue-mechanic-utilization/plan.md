# Technical Implementation Plan: Live Service Bay Queue & Mechanic Monitor

**Feature**: `035-live-service-bay-queue-mechanic-utilization`  
**Jira Issue**: [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6)  

---

## 1. Architecture Overview & Boundary Mapping

```
app/admin/admin-dashboard-client.tsx (#view-dashboard)
   │
   ├── AdminKpiGrid
   ├── RevenueComparisonChart
   └── ServiceBayStatusCard (components/admin/service-bay-status.tsx)
          ▲
          │ Realtime subscription / Props
          ▼
       useExecutiveRealtime ("operational-intelligence")
```

### Affected Files & Boundaries

1. `specs/035-live-service-bay-queue-mechanic-utilization/` (8 canonical SDD artifacts)
2. `components/admin/service-bay-status.tsx`:
   - Display `X Bays Active` dynamic capacity badge in header.
   - Refactor `getStatusBadgeClass` and status badge text to display `Ready for Inspection / Pickup` on `COMPLETED`, `In Progress` on `IN PROGRESS`, and `Queued` on `QUEUED`.
   - Update row rendering with accessible typography and SWIFT design tokens.
3. `app/admin/admin-dashboard-client.tsx`:
   - Ensure container has `id="view-dashboard"`.
   - Integrate updated status detail mapping for work orders.
4. `components/admin/__tests__/service-bay-status.test.tsx`:
   - Unit test suite verifying multi-bay rendering, status badge hierarchy, mechanic turnaround formatting, and active capacity badge.

---

## 2. Implementation Steps

### Phase 1: Specifications & Contracts
- Spec, Research, Data Model, Contracts, Checklist generated and validated.

### Phase 2: Component Refinement (`ServiceBayStatusCard`)
- Update `components/admin/service-bay-status.tsx`:
  - Dynamic capacity badge: compute `bays.filter(b => b.status === 'IN PROGRESS' || b.status === 'PENDING_PARTS').length` and display `${activeCount} Bays Active`.
  - Status badge text formatter:
    - `'IN PROGRESS'` -> `In Progress`
    - `'QUEUED'` -> `Queued`
    - `'COMPLETED'` -> `Ready for Inspection / Pickup`
    - `'PENDING_PARTS'` -> `Waiting for Parts`
    - `'CANCELLED'` -> `Cancelled`
  - Ensure strict SWIFT token classes:
    - Active: `bg-accent-light text-accent border border-accent/30`
    - Queued: `bg-bg-muted text-text-secondary border border-border-subtle`
    - Ready: `bg-success-light text-success border border-success/30`
    - Cancelled: `bg-danger-light text-danger border border-danger/30`

### Phase 3: Dashboard Client Wiring (`AdminDashboardClient`)
- In `app/admin/admin-dashboard-client.tsx`:
  - Add `id="view-dashboard"` to the root layout container.
  - Ensure work order realtime handler synchronizes `COMPLETED` state to update mechanic turnaround info as `Mechanic: Dante Reyes (Ready for pickup)`.

### Phase 4: Automated Testing
- Create `components/admin/__tests__/service-bay-status.test.tsx` verifying all 4 acceptance scenarios.
- Run `npm test` and `npx tsc --noEmit`.

---

## 3. Verification & Quality Gates

- `npx tsc --noEmit`: 0 TypeScript errors.
- `npm run lint`: 0 ESLint errors.
- `npm test`: 100% test pass rate for all affected suites.
- Design Tokens: 100% compliant with zero hardcoded hex/RGB colors.
