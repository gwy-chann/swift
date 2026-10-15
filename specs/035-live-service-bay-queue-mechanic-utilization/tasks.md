# Implementation Tasks: Live Service Bay Queue & Mechanic Monitor

**Feature**: `035-live-service-bay-queue-mechanic-utilization`  
**Jira Issue**: [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35)  
**Status**: In Progress  

---

## Task List & Execution Status

- [x] **Task 1: Complete 8 Canonical SpecKit Artifacts**
  - **Scope**: Author and validate `spec.md`, `research.md`, `data-model.md`, `contracts/service-bay-queue.ts`, `checklists/requirements.md`, `plan.md`, `quickstart.md`, and `tasks.md`.
  - **Deliverable**: `specs/035-live-service-bay-queue-mechanic-utilization/`

- [ ] **Task 2: Service Bay Status Card Refinement & Badge Hierarchy**
  - **Scope**: Update `components/admin/service-bay-status.tsx` with dynamic capacity badge calculation (`X Bays Active`), status badge hierarchy (`In Progress`, `Queued`, `Ready for Inspection / Pickup`), and mechanic turnaround formatting (`Mechanic: Dante Reyes (~10 mins left)`). Ensure strict SWIFT semantic design tokens.
  - **Deliverable**: `components/admin/service-bay-status.tsx`

- [ ] **Task 3: Dashboard Client `#view-dashboard` Container & Status Detail Synchronization**
  - **Scope**: Update `app/admin/admin-dashboard-client.tsx` to include `id="view-dashboard"` on the container element, and ensure work order realtime event mapping reflects accurate status labels and turnaround states.
  - **Deliverable**: `app/admin/admin-dashboard-client.tsx`

- [ ] **Task 4: Unit Test Suite for Service Bay Status Card**
  - **Scope**: Implement comprehensive Jest/React Testing Library tests in `components/admin/__tests__/service-bay-status.test.tsx` verifying Scenarios 1-4.
  - **Deliverable**: `components/admin/__tests__/service-bay-status.test.tsx`

- [ ] **Task 5: Quality Gates & Verification**
  - **Scope**: Run `npx tsc --noEmit`, `npm run lint`, and `npm test` inside the worktree. Ensure 100% test pass rate and clean compilation.
