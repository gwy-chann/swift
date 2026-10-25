# Feature Specification: Automatic POS Labor Checkout to Service Bay Work Order Queue Bridge

**Feature Branch**: `feat/SIAA-100-pos-labor-checkout-work-order-bridge`  
**Created**: 2026-10-26  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-100](https://the-three-devsketeers.atlassian.net/browse/SIAA-100) (STORY-5.11)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  
**Prerequisites**: [SIAA-99](https://the-three-devsketeers.atlassian.net/browse/SIAA-99) (STORY-5.10: Dedicated Mechanic Workshop Queue), [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66) (STORY-6.6: Supabase Service Bay Work Orders Schema), [SIAA-96](https://the-three-devsketeers.atlassian.net/browse/SIAA-96) (STORY-8.9: POS Checkout & Thermal Receipts)  
**Related Features**: [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35) (Live Bay Utilization & Mechanic Monitor), [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18) (Hybrid POS Cart & Workshop Labor Line-Item Engine)  

---

## Executive Summary & Business Intent

In high-volume motorcycle parts and repair operations, customers frequently arrive for both walk-in retail parts and on-site mechanical servicing (such as oil changes, brake overhaul, chain adjustments, and tire replacements). When a cashier tenders payment at the Point of Sale (`/staff/pos`), any labor service item included in the bill must seamlessly translate into an operational repair job for the workshop floor.

Currently, the POS checkout orchestration decrements part stock and generates receipts, while the mechanic workshop queue (`/staff/work-orders`) displays pre-seeded work orders and facilitates manual job claiming. However, there is no automated bridge between POS checkout completion and the work order lifecycle. Mechanics on the floor must wait for physical paper receipts or manual clerical re-entry.

This feature establishes an end-to-end, automated transactional bridge connecting POS labor checkout to the workshop queue:
1. **Intelligent Service Detection**: Analyzes line items upon checkout completion; if the cart contains at least one labor service item (`item_type = 'service'`), it automatically initiates work order creation.
2. **Customer & Vehicle Intake Attribution**: Collects or derives vehicle model, plate number, customer name, and technician intake notes at checkout or defaults them seamlessly to avoid blocking fast-lane transactions.
3. **Automated Order Number & Bay Resolution**: Generates human-readable tracking identifiers (`WO-YYYY-XXXX`) and resolves requested service bay foreign keys.
4. **Immediate Real-Time Queue Broadcast**: Pushes a Realtime broadcast payload over the `operational-intelligence` channel and triggers PostgreSQL change events so that mechanic terminal displays (`/staff/work-orders`) update in under 500ms without manual page refreshes.
5. **Unassigned Mechanic Claim Workflow**: Sets auto-provisioned work orders to `status = 'QUEUED'` with `mechanic_id = null`, rendering an active "Claim Job" button for floor technicians.
6. **Pure Parts Isolation**: Ensures transactions consisting exclusively of physical parts (`item_type = 'part'`) decrement catalog inventory normally without spawning redundant empty work orders.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Auto-Provisioning Work Order from POS Labor Items (Priority: P1)

* **As a** Cashier or Shop Floor Terminal user,  
* **I want** completed POS checkout transactions containing labor services to automatically provision active work orders in the database,  
* **so that** the repair jobs immediately queue in the Workshop Queue (`/staff/work-orders`) and appear on mechanic workstations without manual re-entry.

**Why this priority**: Core business value proposition. Eliminates double entry, prevents lost repair jobs, and ties financial revenue to workshop labor execution.

**Independent Test**: Complete a checkout with a labor service item (e.g. `SRV-OIL-01`) at `/staff/pos` and verify a matching record in `public.work_orders` is created with status `QUEUED`.

**Acceptance Scenarios**:
```gherkin
Scenario: Automatic Work Order Creation for Labor Item
  Given a customer checks out at the POS with a cart containing at least one labor service item ("item_type = 'service'")
  When the cashier tenders payment and checkout completes ("processCheckoutAction" / "process_pos_checkout")
  Then the system automatically generates a new record in "public.work_orders" with:
    | field                     | value / specification                                    |
    | order_number              | auto-generated unique ID (e.g. "WO-2026-XXXX")          |
    | bay_id                    | resolved service bay ID matching item bay, or null       |
    | customer_name             | customer name from checkout intake or default            |
    | vehicle_model             | motorcycle model & displacement                          |
    | plate_number              | customer vehicle plate number                            |
    | service_code              | labor service code (e.g., "SRV-OIL-01")                 |
    | service_name              | descriptive labor service title                          |
    | status                    | "QUEUED"                                                |
    | notes                     | intake complaint notes entered at POS                    |
  And the transaction links to the work order via receipt or foreign key reference.

Scenario: Multiple Service Items in Single Cart
  Given a customer checks out a hybrid cart containing 2 distinct labor service items (e.g., Oil Change and Brake Inspection)
  When the cashier completes checkout
  Then the system provisions a work order record for each ordered labor service or bundles them into a multi-task work order
  And each item is assigned a distinct "order_number" with status "QUEUED".
```

---

### User Story 2 - Real-Time Broadcast to Workshop Queue (Priority: P1)

* **As a** Workshop Technician or Shop Supervisor monitoring `/staff/work-orders`,  
* **I want** newly provisioned work orders to appear instantly on my screen upon cashier checkout,  
* **so that** I can begin prepping the service bay and tools without latency or manual page refreshing.

**Why this priority**: Essential for fast floor response and real-time coordination between front-counter cashiers and back-shop mechanics.

**Independent Test**: Keep `/staff/work-orders` open in one browser window, complete a labor checkout in another window, and observe the new card render under 500ms.

**Acceptance Scenarios**:
```gherkin
Scenario: Real-Time Broadcast Delivery
  Given a mechanic viewing "/staff/work-orders" on the workshop floor
  When a cashier finishes checkout for a repair service at POS
  Then Supabase Realtime broadcast triggers on "operational-intelligence" channel
  And the new work order card appears under "Workshop Bay Queue" on the mechanic's screen in under 500ms without page refresh.

Scenario: In-Memory / Offline Development Fallback Broadcast
  Given an environment without active Supabase websocket connections (offline/test mode)
  When checkout completes successfully
  Then the in-memory work order store prepends the new order
  And local window custom events notify active tab subscribers immediately.
```

---

### User Story 3 - Unassigned Work Order Claim Flow (Priority: P2)

* **As a** Shop Mechanic on duty,  
* **I want** newly auto-provisioned work orders to clearly show as "Unassigned" with a prominent "Claim Job" action,  
* **so that** any available mechanic can claim ownership and pull the vehicle into their bay.

**Why this priority**: Fair workload distribution and technician self-dispatching are fundamental to SWIFT shop floor ergonomics.

**Independent Test**: Locate a newly auto-provisioned work order in `/staff/work-orders`, verify "Unassigned" badge and "Claim Job" button, click it, and verify the order is assigned to the current mechanic.

**Acceptance Scenarios**:
```gherkin
Scenario: Mechanic Claims Auto-Provisioned Work Order
  Given a newly auto-provisioned work order without a designated technician ("mechanic_id = null")
  When the card renders in the mechanic queue
  Then the card displays an "Unassigned" status and an enabled "Claim Job" button allowing any available mechanic to take ownership
  When the mechanic clicks "Claim Job"
  Then "mechanic_id" is updated to the logged-in mechanic's profile ID
  And the card updates to show the mechanic's name with option to "Start Job".
```

---

### User Story 4 - Pure Parts Transactions Skip Work Order Creation (Priority: P1)

* **As a** Store Administrator or Inventory Clerk,  
* **I want** checkouts with physical parts only to complete without creating work orders,  
* **so that** the repair queue remains clean and free of counter-only retail sales clutter.

**Why this priority**: Invariant protection. Creating work orders for counter sales of spark plugs or oil bottles would pollute workshop metrics.

**Independent Test**: Complete a checkout containing only physical catalog parts (e.g. `SKU-SPK-001`), verify inventory decrements, and verify `public.work_orders` count is unchanged.

**Acceptance Scenarios**:
```gherkin
Scenario: Pure Catalog Parts Checkout
  Given a cashier checks out a cart containing only physical catalog parts ("item_type = 'part'")
  When checkout completes
  Then inventory stock decrements normally in "public.products" and "public.stock_adjustment_logs"
  And no work order record is created in "public.work_orders"
  And the workshop queue remains untouched.
```

---

## Edge Cases & Invariant Protections

1. **Unallocated Service Bay**: If the labor service does not specify a target bay (or all bays are occupied), `bay_id` defaults to `NULL`, the work order is assigned status `QUEUED`, and the card displays "Unassigned Bay" waiting for manual bay assignment.
2. **Missing Customer Intake Details**: If the cashier fast-lanes the checkout without typing customer name or plate number, the system gracefully falls back to:
   - `customer_name`: `"Walk-in Customer"`
   - `vehicle_model`: `"Motorcycle (General)"`
   - `plate_number`: `"FOR-REG"`
   - `notes`: `"POS Fast-lane Checkout - Service labor ordered at counter"`
3. **Database Disconnection / Mock Fallback**: If Supabase PostgreSQL is temporarily unreachable or the stored procedure is executed in an in-memory test environment:
   - The server action falls back to in-memory store creation in `lib/workshop/workshop-actions.ts`.
   - The transaction ID and receipt number are preserved.
   - The returned `CheckoutActionResult` reports successful provisioning with `workOrdersCreated: N`.
4. **Concurrent Claiming Conflict**: If two mechanics attempt to claim the same auto-provisioned work order simultaneously, the first write wins and the second receives a descriptive toast: `"Work order already claimed by another technician."`

---

## Functional Requirements *(mandatory)*

- **FR-001**: System MUST inspect cart line items during checkout and identify any item with `itemType === 'service'`.
- **FR-002**: When at least one labor service is detected, system MUST atomically provision one or more records in `public.work_orders`.
- **FR-003**: System MUST auto-generate unique human-readable order numbers following format `WO-YYYY-XXXX` (e.g. `WO-2026-0042`).
- **FR-004**: System MUST resolve matching `bay_id` from `public.service_bays` based on the item's bay description or default to `NULL` if not specified.
- **FR-005**: System MUST record intake details (`customer_name`, `vehicle_model`, `plate_number`, `service_code`, `service_name`, `notes`) with non-empty defaults for walk-ins.
- **FR-006**: System MUST initialize auto-provisioned work orders with `status = 'QUEUED'` and `mechanic_id = NULL`.
- **FR-007**: System MUST broadcast real-time notifications on the `operational-intelligence` Supabase channel upon work order creation.
- **FR-008**: System MUST update `/staff/work-orders` UI reactively via `useExecutiveRealtime` and in-memory listeners when an `INSERT` event occurs.
- **FR-009**: System MUST prevent work order creation if all cart items have `itemType === 'part'`.
- **FR-010**: System MUST return work order creation metadata (`workOrdersCreated`, `workOrderNumbers`) in the checkout action response.

---

## Success Criteria *(mandatory)*

1. **Zero Double Entry**: 100% of POS transactions with labor services automatically produce corresponding queued work orders without clerical re-typing.
2. **Real-Time Responsiveness**: Newly created work orders appear on active `/staff/work-orders` screens within 500 milliseconds of checkout tender.
3. **Zero Queue Pollution**: 0 work orders are generated for transactions containing exclusively physical motorcycle parts.
4. **Failsafe Resilience**: If database writes fail or in offline demo mode, in-memory state synchronization maintains seamless continuity with zero crashed checkouts.
5. **Design Token Compliance**: All UI modifications consume canonical semantic tokens (`lib/tokens.ts`, `app/globals.css`) with zero hardcoded hex/RGB values.
