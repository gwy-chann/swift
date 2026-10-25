# Feature Specification: Dedicated Admin Motor Repair Tracking & Workshop Service Bay Monitoring Dashboard

**Feature Branch**: `feat/SIAA-107-admin-motor-repair-tracking`  
**Created**: 2026-10-26  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-107](https://the-three-devsketeers.atlassian.net/browse/SIAA-107) (STORY-5.13)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  
**Prerequisites**: [SIAA-101](https://the-three-devsketeers.atlassian.net/browse/SIAA-101) (STORY-5.12: POS Customer & Complaint Intake Prompt with Admin Mechanic Dispatch), [SIAA-100](https://the-three-devsketeers.atlassian.net/browse/SIAA-100) (STORY-5.11: POS Labor Checkout Bridge), [SIAA-99](https://the-three-devsketeers.atlassian.net/browse/SIAA-99) (STORY-5.10: Mechanic Workshop Queue), [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66) (Service Bay Work Orders Schema)  
**Related Features**: [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35) (Live Bay Utilization & Mechanic Monitor), [SIAA-106](https://the-three-devsketeers.atlassian.net/browse/SIAA-106) (Two-Step Login & Staff Roles)

---

## Executive Summary & Business Intent

In high-volume motorcycle parts retail and repair service centers, shop owners and workshop operations managers must oversee end-to-end service floor execution. Customers constantly inquire about turnaround progress ("Is my NMAX ready?", "Why is my Raider delayed?"), and workshop bottlenecks (such as mechanics waiting for out-of-stock parts or idle bays) degrade daily revenue and technician utilization.

While the staff terminal provides `/staff/work-orders` tailored for floor mechanics executing their immediate tasks, administrators and operations managers require an executive command center at `/admin/repairs`. This dashboard provides complete visibility over all customer motorcycles ("motors") undergoing repair across bays, live status tracking, mechanic time-on-job metrics, bottleneck escalation, technician reassignment, and parts audit logs.

This feature delivers:
1. **Dedicated Admin Motor Repair Tracking Dashboard (`/admin/repairs`)**:
   - Comprehensive overview showing all work orders categorized across stages: `Pending` (`QUEUED`), `In Progress` (`IN PROGRESS`), `Waiting for Parts` (`PENDING_PARTS`), `Quality Check` / `Ready for Release` (`COMPLETED`).
   - Detailed vehicle identity display: Make, Model, License Plate Number, and Chassis / Engine Number.
   - Customer identity: Name, Contact Phone Number.
   - Assigned mechanic, assigned service bay identifier, primary complaint, and labor service items.
   - Elapsed repair time and estimated completion duration countdown.
2. **Detailed Repair Progress & Inspection Slide-Over Drawer**:
   - Slide-over inspection drawer triggered upon clicking any motor repair card or table row.
   - Displays real-time mechanic punch-in duration and active technician status.
   - Step-by-step diagnostic and mechanical task checklist with progress completion bars.
   - List of inventory parts and consumables billed/installed on the motorcycle with shelf locations and availability.
   - Mechanic floor notes and diagnostic observations.
3. **Multi-Dimensional Filtering & Instant Search**:
   - Filter by mechanic name, repair status (e.g., `Waiting for Parts`), service bay, or keyword search across license plate, vehicle model, and customer name.
   - Real-time reactive summary metric counter cards: Total Active Motors, In Repair, Waiting for Parts, Completed Today, and Active Bay Utilization.
4. **Admin Live Mechanic Reassignment & Bottleneck Escalation**:
   - Shop managers can reassign a stalled or bottlenecked repair job to any active on-shift mechanic via a live dispatch selector.
   - Real-time state update reflected across the workshop queue with forensic security audit logging (`recordAuditLogAction`).
5. **Non-Admin Role-Based Access Control (RBAC) Guard**:
   - Strict server-side and middleware access control preventing cashiers or mechanics from accessing `/admin/repairs`.
   - Unauthorized attempts automatically redirect non-admin staff to their authorized portal (`/staff/work-orders` or `/staff/pos`) with a clear error warning notice.

---

## User Scenarios & Acceptance Criteria *(mandatory)*

### User Story 1 - Viewing All Active Motorcycles Undergoing Repair (Priority: P1)

* **As an** Operations Admin / Workshop Manager,  
* **I want to** access `/admin/repairs` to see all customer motorcycles currently undergoing repairs across all workshop bays,  
* **so that** I can monitor live repair milestones, supervise mechanic workload, resolve bottlenecks, and provide accurate turnaround updates to customers.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Viewing all active motorcycles currently undergoing repair in workshop bays
  Given I am authenticated as an administrator at the SWIFT Admin Portal
  And Given there are work orders in "QUEUED", "IN PROGRESS", or "PENDING_PARTS" status in the workshop
  When I navigate to "/admin/repairs"
  Then I see a dedicated tracking dashboard displaying each motor with:
    | field                     | description / format                                               |
    | Vehicle identity          | Make, Model, License Plate, and Chassis / Engine number            |
    | Customer details          | Customer Name and Phone Number                                     |
    | Workshop assignment       | Assigned Mechanic name and Service Bay identifier                  |
    | Service description       | Primary Customer Complaint and Labor Service line items            |
    | Current Stage Badge       | "Pending", "In Progress", "Waiting for Parts", "Ready for Release"|
    | Timing & Progress         | Elapsed repair time and estimated completion duration              |
  And I see high-level workshop KPI summary cards displaying:
    | metric                    | calculation                                                        |
    | Active Motors Under Repair| Count of all active work orders (In Progress + Waiting for Parts)  |
    | In Progress               | Count of jobs actively on service bays                             |
    | Waiting for Parts         | Count of jobs paused waiting for inventory replenishment           |
    | Bay Utilization           | Ratio and percentage of occupied bays vs total active bays         |
```

---

### User Story 2 - Inspecting Detailed Repair Progress & Parts Drawer (Priority: P1)

* **As an** Operations Admin or Shop Floor Supervisor,  
* **I want to** click on any active motor card or row to open an inspection drawer,  
* **so that** I can review real-time mechanic punch duration, task checklists, parts billed/installed, and technician floor notes.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Inspecting detailed repair progress, mechanic logs, and parts replaced
  Given I am on the "/admin/repairs" dashboard
  When I click on an active motor repair card or table row
  Then a detailed slide-over inspection drawer opens displaying:
    | section                   | content                                                            |
    | Vehicle & Customer Banner | Make, Model, Plate, Chassis #, Customer Name, Contact Number       |
    | Technician Status         | Real-time mechanic punch-in duration and active technician status  |
    | Task Checklist            | Step-by-step diagnostic and mechanical task checklist with status  |
    | Parts & Consumables       | List of inventory parts billed/installed, SKU, qty, shelf location |
    | Floor Notes               | Mechanic diagnostic observations, notes, and intake complaints     |
  And clicking outside or the "Close" button smoothly dismisses the slide-over drawer.
```

---

### User Story 3 - Filtering and Searching Active Repairs (Priority: P2)

* **As an** Operations Admin,  
* **I want to** filter and search repairs across mechanics, bays, status, plate numbers, and customer names,  
* **so that** I can quickly locate specific customer vehicles and isolate workshop bottlenecks.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Filtering and searching active repairs across mechanics and bays
  Given multiple motors are undergoing repairs across various workshop bays
  When I filter by mechanic name, repair status (e.g., "Waiting for Parts"), or bay identifier
  Or when I search by license plate, vehicle model, or customer name
  Then the repair tracking view updates instantly to display only matching work orders
  And the active filter counts update responsively without page reload.
```

---

### User Story 4 - Admin Live Mechanic Reassignment & Bottleneck Escalation (Priority: P1)

* **As an** Operations Admin,  
* **I want to** reassign a stalled or bottlenecked repair job to an on-shift mechanic directly from the dashboard or drawer,  
* **so that** technician workloads are balanced and delayed jobs are resumed immediately.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Admin live mechanic reassignment and bottleneck escalation
  Given a repair job is stalled or requires technician reassignment
  When I select an on-shift mechanic from the dispatch dropdown and confirm the reassignment
  Then the work order updates immediately with the new mechanic assignment
  And the technician's queue reflects the change in real-time
  And the reassignment action is recorded in the system audit log with actor ID and timestamp.
```

---

### User Story 5 - Non-Admin Role-Based Access Control (RBAC) Guard (Priority: P1)

* **As a** Security Officer and System Architect,  
* **I want** non-admin staff (e.g., cashiers, mechanics) to be blocked from accessing `/admin/repairs`,  
* **so that** sensitive administrative workshop intelligence, reassignment controls, and executive dashboards are protected.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Non-admin role-based access control (RBAC) guard
  Given a non-admin user (e.g., "cashier" or "mechanic") is authenticated
  When the user navigates directly to "/admin/repairs"
  Then access is denied
  And the user is redirected to their authorized portal ("/staff/work-orders" or "/staff/pos")
  And an unauthorized access warning toast/notice is displayed.
```

---

## Edge Cases & Error Handling

1. **Zero Active Work Orders**: When all bays are clear, display an empty state banner with "No Active Workshop Repairs", allowing filter reset or manual refresh.
2. **Missing Chassis / Engine Number**: If intake was completed with only Plate Number, display `N/A` or fallback to vehicle VIN token format cleanly without breaking layouts.
3. **Mechanic Offline / Not On Shift**: Only mechanics with active shift status or eligible profiles are selectable in the reassignment dropdown. If an assigned mechanic clocks out while a job is active, highlight the card with an attention badge.
4. **Offline / Database Interruption**: In offline or test resilience mode, gracefully fall back to in-memory workshop state (`lib/workshop/workshop-mock-data.ts`) with no uncaught promise rejections.
5. **Mobile Responsiveness**: The dashboard must support tablet/mobile views using responsive grid/cards while providing full table and slide-over drawer functionality on desktop.
