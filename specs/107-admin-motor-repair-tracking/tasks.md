# Implementation Tasks: Admin Motor Repair Tracking & Workshop Service Bay Monitoring Dashboard

**Feature**: `specs/107-admin-motor-repair-tracking/spec.md`  
**Date**: 2026-10-26  
**Jira Ticket**: [SIAA-107](https://the-three-devsketeers.atlassian.net/browse/SIAA-107)  

---

## Phase 1: Contracts & Types

- [x] **TASK-1.1**: Create `lib/repairs/repairs-contracts.ts` defining `AdminMotorRepairItem`, `RepairsDashboardKpiSummary`, `RepairsFilterState`, `AdminReassignMechanicSchema`, and Zod validators.

---

## Phase 2: Actions & Data Layer

- [x] **TASK-2.1**: Create `lib/repairs/repairs-actions.ts` implementing `fetchAdminRepairsAction()` to load active work orders, derive chassis numbers, vehicle makes, elapsed minutes, and calculate live KPI summary metrics.
- [x] **TASK-2.2**: In `lib/repairs/repairs-actions.ts`, implement `reassignMotorRepairMechanicAction(payload)` with database updates, in-memory sync, and system audit logging (`recordAuditLogAction`).

---

## Phase 3: Automated Unit & Contract Tests

- [x] **TASK-3.1**: Create `lib/repairs/__tests__/repairs-actions.test.ts` testing:
  - KPI metric calculations (Active Motors, In Repair, Waiting for Parts, Bay Utilization).
  - Multi-axis filtering by status, mechanic, and search queries (plate, customer, model).
  - Admin mechanic reassignment with state updates and audit trail verification.
  - Non-admin route RBAC guard evaluation.

---

## Phase 4: Admin Navigation Integration

- [x] **TASK-4.1**: Update `lib/admin/navigation.ts` to add `/admin/repairs` under "Store Intelligence" with `Wrench` icon.

---

## Phase 5: UI Components Layer

- [x] **TASK-5.1**: Create `components/admin/repairs/repairs-kpi-summary.tsx` displaying the 4 KPI metric cards with SWIFT semantic design tokens and micro-animations.
- [x] **TASK-5.2**: Create `components/admin/repairs/repairs-filter-bar.tsx` with instant search, status pill selectors, mechanic dropdown, bay selector, and Grid/Table view switcher.
- [x] **TASK-5.3**: Create `components/admin/repairs/repair-motor-card.tsx` rendering vehicle cards with Make/Model, Plate, Chassis #, Customer Name, Contact Phone, Mechanic, Bay, Complaint, Stage Badge, and Elapsed Time.
- [x] **TASK-5.4**: Create `components/admin/repairs/repairs-table.tsx` rendering a high-density tabular view for rapid administrative scanning.
- [x] **TASK-5.5**: Create `components/admin/repairs/repair-inspection-drawer.tsx` slide-over inspection panel displaying vehicle banner, technician punch-in duration, diagnostic checklist, billed parts with stock availability/shelf locations, mechanic floor notes, and on-shift mechanic reassignment select.
- [x] **TASK-5.6**: Create `components/admin/repairs/admin-repairs-client.tsx` coordinating state, filtering, search query matching, realtime refresh, and drawer selection.

---

## Phase 6: Admin Route Page & RBAC Guard

- [x] **TASK-6.1**: Create `app/admin/repairs/page.tsx` as an asynchronous Server Component enforcing RBAC via `getServerSession()` (redirecting non-admin staff to `/staff/work-orders` or `/staff/pos`) and mounting `AdminRepairsClient`.

---

## Phase 7: Verification & Convergence

- [x] **TASK-7.1**: Run `npm run typecheck` (`tsc --noEmit`) to verify zero TypeScript errors.
- [x] **TASK-7.2**: Run `npm run lint` to verify ESLint compliance.
- [x] **TASK-7.3**: Run `npm test` to verify all test suites pass.
- [x] **TASK-7.4**: Execute Atomic Commits with Jira key `[SIAA-107]` following `.agents/rules/atomic-commit.md`.
- [x] **TASK-7.5**: Trigger `graphify-auto-sync` (`graphify . --update`).
- [x] **TASK-7.6**: Push branch and create Pull Request via `create-pr`.
