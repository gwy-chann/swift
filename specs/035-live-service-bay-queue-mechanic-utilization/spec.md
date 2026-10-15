# Feature Specification: Live Service Bay Work Order Queue & Mechanic Utilization Monitor

**Feature Branch**: `feat/SIAA-35-live-service-bay-queue-mechanic-utilization`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35) (STORY-6.3)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Prerequisites**: [SIAA-9](https://the-three-devsketeers.atlassian.net/browse/SIAA-9) (Admin Portal Shell), [SIAA-12](https://the-three-devsketeers.atlassian.net/browse/SIAA-12) (Domain Models & Mock Engine), [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66) (Service Bay Work Orders Schema)  
**Downstream Dependents**: [SIAA-34](https://the-three-devsketeers.atlassian.net/browse/SIAA-34) (STORY-6.2: 7-Day Revenue Trend Comparison Engine)  

---

## Executive Summary & Business Intent

SWIFT combines counter motorcycle spare parts retail with an active physical service workshop. Efficient repair operations require real-time visibility into physical bay allocation, queued work orders, assigned mechanics, and remaining turnaround times.

This feature establishes the **Live Service Bay Work Order Queue & Mechanic Utilization Monitor** embedded directly on the Admin Dashboard (`#view-dashboard`). It renders multi-bay activity panels, tracks technician assignments and estimated turnaround counters, applies an unambiguous status badge hierarchy (`In Progress`, `Queued`, `Ready for Inspection / Pickup`), and reactively synchronizes updates via Supabase Realtime when jobs advance, finish, or are created from POS transactions.

---

## Clarifications

### Session 2026-10-15
- Q: What status badge text should be displayed for completed work orders? → A: Displays "Ready for Inspection / Pickup" with success green styling (`bg-success-light text-success`).
- Q: How should active bay capacity badge in the card header be calculated? → A: Dynamically computed from active bays (`IN PROGRESS` or `PENDING_PARTS`) formatted as `X Bays Active`.
- Q: What identifier should the dashboard root have for site-map and spec anchor linking? → A: `id="view-dashboard"` on the dashboard container.
- Q: How should mechanic turnaround time be formatted when in progress? → A: `Mechanic: <Name> (~<Minutes> mins left)` with fallback handling for unassigned or queued orders.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Live Multi-Bay Activity Panel Rendering (Priority: P1)

As a Service Bay Manager or Head Mechanic,  
I want to monitor the live operational status of all repair bays with motorcycle details, mechanic assignments, and estimated completion times on the dashboard,  
so that I can prevent workshop bay bottlenecks, balance mechanic workloads, and deliver accurate turnaround times to awaiting customers.

**Why this priority**: The primary workshop operational dashboard widget giving instant shop-floor visibility to managers and staff without navigating separate menus.

**Independent Test**: Mount the Service Bay Status card on `#view-dashboard` with active work orders and verify that bay names, capacity badge, vehicle models, and services render accurately.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Live Multi-Bay Activity Panel Rendering
  Given active workshop work orders registered across different bays (e.g., Quick Bay, Scooter Bay, Mechanical Bay)
  When viewing the Service Bay Status panel on "#view-dashboard"
  Then the header displays an active capacity badge reflecting active bays (e.g., "4 Bays Active")
  And each bay row clearly states the bay identifier, assigned motorcycle make/model, and pending service package (e.g., "Yamaha NMAX • Oil Change + Brake Pads")
```

---

### User Story 2 - Assigned Mechanic & Time Remaining Tracker (Priority: P1)

As a Workshop Supervisor or Customer Service Attendant,  
I want each bay entry to display the assigned technician's name and a dynamic estimated turnaround timer,  
so that I can answer customer status inquiries immediately and track mechanic turnaround efficiency.

**Why this priority**: Customers demand prompt turnaround estimates; supervisors require mechanic accountability to reallocate stalled jobs.

**Independent Test**: Inspect an in-progress bay item and confirm mechanic name and time remaining display as formatted strings with fallback handling for unassigned or finished states.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Assigned Mechanic & Time Remaining Tracker
  Given an in-progress service job in a repair bay
  When inspecting the bay item
  Then the UI displays the name of the assigned technician/mechanic (e.g., "Mechanic: Dante Reyes")
  And an estimated remaining duration counter indicates time to completion (e.g., "~10 mins left")
```

---

### User Story 3 - Work Order Status Badge Hierarchy (Priority: P1)

As a Service Bay Technician or Manager,  
I want visual status badges with color-coded semantic hierarchy distinguishing active, waiting, and completed jobs,  
so that bay availability and job progression can be understood at a single glance.

**Why this priority**: Eliminates operational misinterpretation on high-tempo shop floors through distinct status styling adhering to SWIFT semantic design tokens.

**Independent Test**: Render work orders across `'IN PROGRESS'`, `'QUEUED'`, and `'COMPLETED'` states and verify exact badge labels and semantic color tokens.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Work Order Status Badge Hierarchy
  Given repair bay orders in different states of completion
  When rendered in the queue
  Then active jobs display a warning amber badge ("In Progress") using bg-accent-light text-accent
  And waiting jobs display a neutral gray badge ("Queued") using bg-bg-muted text-text-secondary
  And finished bays display a success green badge ("Ready for Inspection / Pickup") using bg-success-light text-success
  And jobs waiting for parts display an amber badge ("Waiting for Parts")
```

---

### User Story 4 - Reactive Work Order Queue Synchronization (Priority: P1)

As an Admin or Workshop Manager,  
I want the Service Bay Status panel to automatically update when work orders change or new jobs are created,  
so that the dashboard stays strictly synchronized with shop-floor activity without requiring manual browser refreshes.

**Why this priority**: Eliminates stale dashboard state, ensuring real-time alignment between POS work order checkout and shop-floor bay displays.

**Independent Test**: Dispatch a simulated or broadcasted work order change event and verify the Service Bay panel updates its status, mechanic info, and service text dynamically.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Reactive Work Order Queue Synchronization
  Given a mechanic finishes a job or a new work order is billed from POS
  When bay state changes in the centralized store or realtime subscription
  Then the Service Bay Status panel updates dynamically without requiring a manual full-page browser refresh
```

---

## Technical Invariants & Requirements

1. **Dashboard Container Identifier**: The dashboard container MUST include `id="view-dashboard"` to satisfy accessibility, test automation, and site-map navigation requirements.
2. **Semantic Design Tokens**: ZERO hardcoded hex/RGB colors; all styles must strictly use `bg-bg-card`, `bg-bg-surface`, `border-border`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `bg-accent-light`, `text-accent`, `bg-success-light`, `text-success`, `bg-danger-light`, `text-danger`.
3. **Accessibility**: All interactive and list elements must meet WCAG 2.1 AA contrast requirements, with semantic role attributes and truncated text handling with proper `title` attributes.
4. **Data Fidelity**: Derive all models from `WorkOrder`, `ServiceBay`, and `WorkOrderStatus` in `lib/types/service.ts` and `contracts/service-bay.ts`.
5. **Realtime Broadcast Integration**: Integrate with `useExecutiveRealtime` or standalone state listener on `operational-intelligence` channel.
