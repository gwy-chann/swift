# Architecture Research & Technical Constraints: Live Service Bay Queue & Mechanic Monitor

**Feature**: `035-live-service-bay-queue-mechanic-utilization`  
**Jira Issue**: [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35)  

---

## 1. Technical Stack & Architectural Constraints

- **Framework**: Next.js 15+ App Router (React 19, TypeScript 5).
- **Styling**: Tailwind CSS v4 with SWIFT design tokens (`app/globals.css`, `lib/tokens.ts`). Zero hardcoded hex/RGB values.
- **State Management & Synchronization**: React component state + Supabase Realtime broadcast via `useExecutiveRealtime` (`operational-intelligence` channel).
- **Single Source of Truth**:
  - `lib/types/service.ts` for database and domain representations (`ServiceBay`, `WorkOrder`, `WorkOrderStatus`, `ServiceBayDisplayItem`).
  - `lib/services/service-bay-mapper.ts` for database row transformations.
  - `components/admin/service-bay-status.tsx` for visual presentation and status badge hierarchy.

---

## 2. Status Badge Hierarchy Specification

In accordance with Acceptance Criteria Scenario 3:

| Status Code | Display Label | Semantic Token Classes | Rationale |
|---|---|---|---|
| `IN PROGRESS` | `In Progress` | `bg-accent-light text-accent border border-accent/30` | Amber warning status indicating bay actively occupied and underway |
| `QUEUED` | `Queued` | `bg-bg-muted text-text-secondary border border-border-subtle` | Neutral gray status indicating awaiting bay assignment or clearance |
| `COMPLETED` | `Ready for Inspection / Pickup` | `bg-success-light text-success border border-success/30` | Green success status alerting advisor that job is completed and customer vehicle ready |
| `PENDING_PARTS` | `Waiting for Parts` | `bg-accent-light text-accent border border-accent/30` | Amber alert indicating job paused awaiting counter parts disbursement |
| `CANCELLED` | `Cancelled` | `bg-danger-light text-danger border border-danger/30` | Red danger status for aborted service tickets |

---

## 3. Mechanic Details & Estimated Turnaround Formatting

In accordance with Acceptance Criteria Scenario 2:

- **Active / In-Progress**:
  - Format: `Mechanic: <Name> (~<Minutes> mins left)`
  - Example: `Mechanic: Dante Reyes (~10 mins left)`
- **Completed / Ready**:
  - Format: `Mechanic: <Name> (Ready for pickup)`
- **Queued / Idle**:
  - Format: `Waiting for Bay clearance`
- **Pending Parts**:
  - Format: `Mechanic: <Name> (Waiting for counter parts)`

---

## 4. Active Capacity Badge Computation

In accordance with Acceptance Criteria Scenario 1:
- The header displays an active capacity badge indicating how many bays are occupied/in-progress.
- Formula: `activeBaysCount = bays.filter(b => b.status === 'IN PROGRESS' || b.status === 'PENDING_PARTS').length`
- Display format: `${activeBaysCount} ${activeBaysCount === 1 ? 'Bay' : 'Bays'} Active` (e.g. `4 Bays Active` or `2 Bays Active`).

---

## 5. Viewport & Route Integration

- The admin dashboard root wrapper (`app/admin/admin-dashboard-client.tsx`) must expose `id="view-dashboard"` to satisfy `#view-dashboard` anchor specifications and automated E2E tests.
