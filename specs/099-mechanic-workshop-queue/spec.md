# Feature Specification: Dedicated Mechanic Workshop Queue & Work Order Progression Page

**Feature Branch**: `feat/SIAA-99-mechanic-workshop-queue`  
**Created**: 2026-10-26  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-99](https://the-three-devsketeers.atlassian.net/browse/SIAA-99) (STORY-5.10)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  
**Prerequisites**: [SIAA-10](https://the-three-devsketeers.atlassian.net/browse/SIAA-10) (STORY-1.3), [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66) (STORY-6.6), [SIAA-85](https://the-three-devsketeers.atlassian.net/browse/SIAA-85) (STORY-1.8)  
**Related Features**: [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35) (Live Bay Utilization), [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18) (POS Cart Labor Line-Item Engine), [SIAA-93](https://the-three-devsketeers.atlassian.net/browse/SIAA-93) (Workshop Bay Labor Rates)  

---

## Executive Summary & Business Intent

SWIFT combines high-speed retail motorcycle parts sales with an active physical repair workshop. While shop technicians and mechanics currently punch in and use model fitment search on the Staff Terminal, there is no dedicated, touch-optimized workshop execution screen for mechanics to monitor their assigned jobs, view customer service requests, check parts availability, and advance work order stages in real time.

This feature delivers a dedicated work order queue page in the Staff Terminal (`/staff/work-orders`) tailored for workshop technicians and shop floor administrators:
1. **Mechanic Role-Based Routing**: Auto-routes authenticated `mechanic` staff to `/staff/work-orders` upon terminal login and adds a persistent "Work Order Queue" sidebar navigation item for `mechanic` and `admin` roles.
2. **Segmented Queue Views**: Provides high-contrast, touch-friendly tab views: "My Active Jobs" (filtered to the logged-in mechanic) and "Workshop Bay Queue" (all bays and waiting orders).
3. **Atomic Status Progression**: Enables single-tap progression (`Start Job`, `Mark Pending Parts`, `Complete Service`) with immediate optimistic UI feedback and backend synchronization.
4. **Interactive Service Details & Parts Drawer**: Allows inspection of vehicle details, customer complaints, labor service line items, and required replacement parts with real-time stock availability badges.
5. **Real-Time Workshop Sync**: Listens to Supabase Realtime broadcast events (`operational-intelligence` channel and table updates) to automatically synchronize queue state when cashiers bill repair packages or bays clear.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mechanic Navigation & Role Routing (Priority: P1)

* **As a** Shop Mechanic or Service Technician,  
* **I want** the Staff Terminal to recognize my role and navigate me directly to my work order queue,  
* **so that** I do not land on POS cash register screens or general model fitment search.

**Why this priority**: Fast-floor operations require mechanics to immediately see pending jobs upon logging in with their terminal pin or switching accounts.

**Independent Test**: Log in as mechanic (e.g., Dante Reyes) and verify URL is `/staff/work-orders`, and the sidebar highlights "Work Order Queue".

**Acceptance Scenarios**:
```gherkin
Scenario: Mechanic Landing Route Redirection
  Given an authenticated staff session with the "mechanic" role
  When the user accesses the Staff Terminal root "/staff" or defaults
  Then the terminal redirects the user to "/staff/work-orders"
  And the sidebar highlights the "Work Order Queue" navigation item.

Scenario: Sidebar Role Visibility
  Given an authenticated user on the Staff Terminal
  When inspecting the navigation menu in StaffSidebar
  Then users with "mechanic" or "admin" roles can see the "Work Order Queue" menu item with a wrench/clipboard icon
  And users with "cashier", "inventory_clerk", or default "staff" roles do not see this menu item unless elevated.
```

---

### User Story 2 - Segmented Work Order Queue Views (Priority: P1)

* **As a** Workshop Technician or Shop Supervisor,  
* **I want** segmented views for "My Active Jobs" and "Workshop Bay Queue",  
* **so that** I can focus exclusively on my current assignments while maintaining visibility over shop-wide bay utilization.

**Why this priority**: Prevents clutter on touch displays, allowing technicians to focus on their assigned vehicle while supervisors monitor waiting jobs.

**Independent Test**: Load `/staff/work-orders` with multiple test work orders and switch between "My Active Jobs" and "Workshop Bay Queue" tabs.

**Acceptance Scenarios**:
```gherkin
Scenario: Viewing "My Active Jobs" Segment
  Given 4 active work orders in the workshop where 2 are assigned to "Dante Reyes" (current mechanic)
  When Dante Reyes views "/staff/work-orders" under the "My Active Jobs" tab
  Then exactly 2 cards are shown matching Dante Reyes' assigned work orders
  And each card displays the bay name, vehicle model, plate number, ordered labor service, estimated duration, and current status badge.

Scenario: Viewing "Workshop Bay Queue" Segment
  Given active and queued work orders assigned across Bays 1 through 4
  When any mechanic or admin switches to the "Workshop Bay Queue" tab
  Then all workshop bays and queued work orders are displayed in display-order sequence
  And filter pills allow instant filtering by status ("ALL", "QUEUED", "IN PROGRESS", "PENDING_PARTS", "COMPLETED").
```

---

### User Story 3 - Rapid Work Order Status Progression (Priority: P1)

* **As a** Shop Mechanic on the shop floor,  
* **I want** one-tap action buttons to advance a work order through its lifecycle (`Start Job`, `Mark Pending Parts`, `Complete Service`),  
* **so that** bay turnaround times and job stages are captured accurately without excessive paperwork.

**Why this priority**: Streamlined status transitions prevent stale bay statuses and power executive utilization metrics.

**Independent Test**: Click "Start Job" on a `QUEUED` work order; verify status transitions to `IN PROGRESS` with `started_at` timestamp recorded.

**Acceptance Scenarios**:
```gherkin
Scenario: Starting a Queued Job
  Given a work order with status "QUEUED"
  When the mechanic clicks the "Start Job" action button
  Then the work order status transitions to "IN PROGRESS"
  And the backend action updates `status = 'IN PROGRESS'` and sets `started_at` to current timestamp
  And the UI updates optimistically with an amber "In Progress" badge and countdown timer.

Scenario: Requesting Replacement Parts
  Given a work order in "IN PROGRESS" status
  When the mechanic encounters a missing part and clicks "Wait for Parts"
  Then the work order status transitions to "PENDING_PARTS"
  And the status badge updates to "Waiting for Parts" with amber warning styling.

Scenario: Completing a Service
  Given a work order in "IN PROGRESS" or "PENDING_PARTS" status
  When the mechanic finishes repairs and clicks "Complete Service"
  Then the work order status transitions to "COMPLETED"
  And the backend action records `completed_at`
  And the card updates to a green "Ready for Inspection / Pickup" badge.
```

---

### User Story 4 - Detailed Job Inspection & Replacement Parts Drawer (Priority: P2)

* **As a** Mechanic,  
* **I want** to tap a work order card to inspect the vehicle breakdown, customer complaint notes, labor checklist, and required parts with live stock badges,  
* **so that** I have full context before beginning teardown and know if required parts are in stock on store shelves.

**Why this priority**: Prevents technicians from tearing down engines or brakes before confirming the retail counter has the replacement gaskets or pads in stock.

**Independent Test**: Open the detail drawer for `WO-2026-0001` and verify customer notes, checklist items, and parts stock availability badges.

**Acceptance Scenarios**:
```gherkin
Scenario: Inspecting Work Order Details Drawer
  Given a work order card displayed in the queue
  When the user clicks the card or the "Inspect Order" button
  Then an accessible slide-over drawer / modal opens displaying:
    | Section           | Contents                                                                      |
    | Vehicle Profile   | Model, plate number, customer name, contact info                              |
    | Service Scope     | Primary service name, flat labor rate, estimated duration                     |
    | Customer Notes    | Explicit complaint notes (e.g., "Squeaking brake calipers, check fluid level")|
    | Labor Checklist   | Interactive checklist of standard diagnostic steps for the selected service   |
    | Required Parts    | List of required SKUs with live stock quantity and shelf locator badges       |
```

---

### User Story 5 - Real-Time Shop Floor Broadcast Synchronization (Priority: P2)

* **As a** Technician or Cashier,  
* **I want** queue cards to update automatically when POS transactions bill new labor or admin changes bay assignments,  
* **so that** the entire shop floor operates on synchronized real-time data without page reloads.

**Why this priority**: Eliminates manual browser refreshes on workshop touchscreens mounted near repair bays.

**Independent Test**: Trigger a status change or insert a new work order; verify the queue list updates reactively.

**Acceptance Scenarios**:
```gherkin
Scenario: Reactive Update on Supabase Realtime Event
  Given the mechanic has `/staff/work-orders` open on a workshop tablet
  When another client or POS station triggers a work order change broadcasted on "operational-intelligence"
  Then the queue card for that order re-renders with the latest status and bay allocation within 500ms.
```

---

## Edge Cases

- **Offline / Network Interruption**: If the network drops while advancing a work order, the UI must queue the optimistic transition or display a non-blocking toast warning allowing the technician to retry.
- **Unassigned Mechanic**: If a work order has no mechanic assigned (`mechanic_id = null`), it appears prominently in the "Workshop Bay Queue" with a "Claim Job" button allowing any available technician to self-assign.
- **Disallowed State Transitions**: The system must reject invalid status jumps (e.g., jumping from `COMPLETED` back to `QUEUED`).
- **Missing Stock for Required Parts**: If replacement parts show 0 stock, a prominent "LOW STOCK / OUT OF STOCK" pill is displayed with the shelf locator tag to notify the parts runner.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST configure `/staff/work-orders` as the primary landing route for the `mechanic` role in `lib/staff/navigation.ts`.
- **FR-002**: System MUST add the "Work Order Queue" navigation item (`/staff/work-orders`) to `STAFF_NAV_ITEMS` restricted to `["mechanic", "admin"]` with icon `ClipboardList` or `Wrench`.
- **FR-003**: System MUST provide a responsive, touch-friendly page at `app/staff/work-orders/page.tsx` utilizing SWIFT design tokens (`bg-bg-base`, `bg-bg-card`, `border-border`, etc.).
- **FR-004**: System MUST support tab switching between "My Active Jobs" (filtered to current user profile) and "Workshop Bay Queue" (full workshop overview).
- **FR-005**: System MUST provide quick status filter pills: `ALL`, `QUEUED`, `IN PROGRESS`, `PENDING_PARTS`, `COMPLETED`.
- **FR-006**: System MUST execute atomic status transitions via server action `updateWorkOrderStatusAction` and API route `PATCH /api/v1/analytics/work-orders/{id}/status`.
- **FR-007**: System MUST provide an interactive detail drawer or modal rendering vehicle breakdown, customer notes, labor tasks, and replacement parts with stock status badges.
- **FR-008**: System MUST integrate Supabase Realtime subscription on `operational-intelligence` channel and `public.work_orders` table to dynamically refresh queue state.
- **FR-009**: System MUST allow available mechanics to self-assign ("Claim Job") on unassigned queued work orders.

### Key Entities

- **WorkOrder**: Physical repair order linking vehicle, customer, assigned bay, assigned mechanic, service code, duration, notes, and lifecycle status (`QUEUED`, `IN PROGRESS`, `PENDING_PARTS`, `COMPLETED`, `CANCELLED`).
- **ServiceBay**: Physical workshop bay (`Bay 1 - Quick Bay`, `Bay 2 - Scooter Bay`, `Bay 3 - Mechanical Bay`, `Bay 4 - Tuning & Diagnostics`) with status (`AVAILABLE`, `OCCUPIED`, `MAINTENANCE`, `QUEUED`).
- **WorkOrderPartItem**: Recommended or required replacement parts associated with a repair service, including SKU, part name, shelf location, and live inventory count.
- **WorkOrderLaborTask**: Step-by-step diagnostic or labor checklist items for technician quality control.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Mechanics land on `/staff/work-orders` within 1 second of logging into the Staff Terminal.
- **SC-002**: Work order status transitions reflect in the UI in under 100ms optimistically and persist in Supabase within 300ms under standard local network conditions.
- **SC-003**: Touch targets on all action buttons and tabs are at least 44x44px conforming to WCAG 2.1 AA accessibility guidelines.
- **SC-004**: 100% of color styles consume SWIFT semantic design tokens with zero arbitrary Tailwind colors or hardcoded hex codes.
- **SC-005**: Realtime broadcast updates sync active work order cards across multi-terminal sessions within 500ms.

---

## Assumptions

- Supabase tables `public.service_bays` and `public.work_orders` are already provisioned with seed data (from SIAA-66).
- The logged-in mechanic's profile is accessible via `usePunchStore` (`currentStaff`, `currentStaffRole`) or `getServerSession`.
- Dante Reyes (`d0000000-0000-0000-0000-000000000003`) is the primary demonstration mechanic account.
- In-memory mock fallback data is provided when running without active Supabase connectivity.
