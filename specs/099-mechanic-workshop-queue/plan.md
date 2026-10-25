# Implementation Plan: Dedicated Mechanic Workshop Queue & Work Order Progression Page

**Feature**: `099-mechanic-workshop-queue`  
**Jira Ticket**: [SIAA-99](https://the-three-devsketeers.atlassian.net/browse/SIAA-99)  
**Branch**: `feat/SIAA-99-mechanic-workshop-queue`  

---

## 1. Architectural Strategy & Component Tree

The feature introduces a touch-optimized workshop execution portal inside Next.js App Router under `/staff/work-orders`:

```text
app/staff/work-orders/page.tsx (Server Component)
  └── WorkshopQueueClient (Client Component)
        ├── WorkshopQueueHeader (KPI Summary: Active Jobs, Bay Count, Turnaround)
        ├── WorkshopQueueTabs ("My Active Jobs" vs "Workshop Bay Queue")
        ├── WorkshopFilterBar (Status pills: ALL, QUEUED, IN PROGRESS, PENDING_PARTS, COMPLETED)
        ├── WorkOrderGrid
        │     └── WorkOrderCard (Status badges, vehicle info, quick actions)
        ├── WorkOrderDetailDrawer (Vehicle breakdown, customer notes, checklist, parts stock)
        └── WorkshopEmptyState (Clean fallback when filtered queue is empty)
```

---

## 2. Server & Client Boundary Mapping

| File Path | Type | Responsibility |
| :--- | :--- | :--- |
| `app/staff/work-orders/page.tsx` | Server Component | Session evaluation, metadata, SSR initial data fetching |
| `app/api/v1/analytics/work-orders/[id]/status/route.ts` | Route Handler | REST API endpoint for `PATCH` status updates |
| `components/staff/workshop/workshop-queue-client.tsx` | `"use client"` | State container, tab switching, search, real-time subscription |
| `components/staff/workshop/work-order-card.tsx` | `"use client"` | Responsive job card with optimistic status transitions |
| `components/staff/workshop/work-order-detail-drawer.tsx` | `"use client"` | Slide-over drawer with labor tasks and parts shelf locator |
| `components/staff/workshop/workshop-queue-header.tsx` | `"use client"` | Floor KPI bar with active count and utilization badge |
| `lib/staff/navigation.ts` | Pure Config | Role route redirection (`mechanic` -> `/staff/work-orders`) and menu items |
| `lib/workshop/workshop-actions.ts` | Server Actions | Server actions for status updates and job claiming |
| `lib/workshop/workshop-mock-data.ts` | Data Provider | Demonstration work orders, labor tasks, and required parts |

---

## 3. Design Token & Tailwind v4 Compliance

- Strictly consume tokens from `app/globals.css` and `lib/tokens.ts`:
  - `bg-bg-base`, `bg-bg-card`, `bg-bg-surface`, `bg-bg-hover`
  - `text-text-primary`, `text-text-secondary`, `text-text-muted`
  - `border-border`, `border-border-subtle`
  - `bg-accent-light text-accent`, `bg-success-light text-success`, `bg-danger-light text-danger`
- Tailwind v4 rules:
  - Use `aspect-16/9`, `aspect-square`, `aspect-4/5` (no arbitrary bracket fractions)
  - Use `bg-linear-to-*` instead of `bg-gradient-to-*`
  - Zero hardcoded colors.

---

## 4. Test Plan & Automated Verification

1. **Unit Tests**:
   - `lib/staff/__tests__/workshop-navigation.test.ts`: Test that `getRolePrimaryRoute('mechanic')` returns `/staff/work-orders` and `filterNavItemsByRole` reveals Work Order Queue for `mechanic` and `admin`.
   - `lib/workshop/__tests__/status-transition.test.ts`: Test state machine transitions, validating valid and invalid state transitions.
   - `lib/workshop/__tests__/parts-availability.test.ts`: Test calculation of parts availability flags and low-stock indicators.
2. **Component & Integration Tests**:
   - Verify card action clicks trigger correct status mutations.
   - Verify tab switching filters cards between current mechanic and full workshop bay queue.
3. **Static Analysis & Typecheck**:
   - `npx tsc --noEmit` returns 0 errors.
   - `npm test` passes all tests.

---

## 5. Phased Atomic Implementation Order

- **Unit 1**: Specification & Design Artifacts (`docs(specs): [SIAA-99] ...`)
- **Unit 2**: Navigation & Role Routing (`feat(staff): [SIAA-99] ...`)
- **Unit 3**: Workshop Domain Models, Contracts & Server Actions (`feat(workshop): [SIAA-99] ...`)
- **Unit 4**: Workshop UI Components & Route Integration (`feat(workshop): [SIAA-99] ...`)
- **Unit 5**: Unit Tests & Regression Verification (`test(workshop): [SIAA-99] ...`)
- **Unit 6**: Tasks Completion & Sync (`docs(specs): [SIAA-99] ...`)
