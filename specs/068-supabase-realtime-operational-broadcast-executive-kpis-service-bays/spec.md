# Feature Specification: Supabase Realtime Operational Broadcast for Executive KPIs & Service Bays

**Feature Branch**: `feat/SIAA-68-realtime-operational-broadcast-kpis-service-bays`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-68](https://the-three-devsketeers.atlassian.net/browse/SIAA-68) (STORY-6.8)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  
**Prerequisites**: [SIAA-66](https://the-three-devsketeers.atlassian.net/browse/SIAA-66) (STORY-6.6: Supabase Service Bay Work Orders Schema), [SIAA-50](https://the-three-devsketeers.atlassian.net/browse/SIAA-50) (STORY-3.7: Supabase POS Transactions Schema)  
**Blocks / Enables**: Downstream STORY-6.9 (Server Actions & UI Wiring), [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (STORY-6.1: Executive KPI Dashboard & Real-Time Operational Health Metric Cards), [SIAA-35](https://the-three-devsketeers.atlassian.net/browse/SIAA-35) (STORY-6.3: Live Service Bay Work Order Queue & Mechanic Utilization Monitor)

---

## Executive Summary & Business Intent

SWIFT combines high-frequency retail counter checkout with active motorcycle workshop repair bay management. Executive and operations managers need live visibility into daily gross revenue, bay turnaround queues, and inventory threshold alerts without manual page refreshes or polling overhead.

This feature implements the Supabase Realtime Change Data Capture (CDC) broadcast layer for the SWIFT Admin Dashboard. It registers database tables (`work_orders`, `service_bays`, `transactions`, and `products`) in the `supabase_realtime` publication with `REPLICA IDENTITY FULL`, provides a resilient client hook `useExecutiveRealtime` subscribing to the `operational-intelligence` channel, and dynamically connects the Admin KPI grid, 7-Day Trend Chart, and Service Bay Status cards with sub-500ms reactive state updates, zero layout flicker, and strict adherence to SWIFT semantic design tokens.

---

## Clarifications

### Session 2026-10-15
- Q: Which Supabase channel name should multiplex transactions, work orders, service bays, and low-stock alerts? → A: Single channel `operational-intelligence` as defined in the Jira specification.
- Q: What constitutes a low-stock alert event in the realtime feed? → A: A CDC `UPDATE` payload on `products` where `new.stock <= new.min_threshold` (or `new.stock < old.stock` dropping into threshold).
- Q: How should the 7-Day Trend Chart react to realtime transactions? → A: Today's bar (`Sun (Today)`) optimistically adds the transaction's parts/labor amount to the active day without page refresh.
- Q: What is the fallback behavior when Supabase credentials are not configured in test/offline environments? → A: The hook logs a debug notice, sets status to `CLOSED`, and listens for local window `swift:pos:checkout` events for testing fidelity.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Realtime Publication Registration & Full Replica Identity (Priority: P1)

As a System Administrator or DevOps Engineer,  
I want database tables `work_orders`, `service_bays`, and `transactions` registered in the `supabase_realtime` publication with `REPLICA IDENTITY FULL`,  
so that every point-of-sale checkout, bay status shift, and repair work order lifecycle update emits full-row Change Data Capture (CDC) events across active WebSocket connections.

**Why this priority**: Without CDC publication registration and full replica identity, Supabase Realtime cannot stream row updates, preventing the admin dashboard from receiving live push events.

**Independent Test**: Execute SQL migration `20261021000000_executive_realtime_broadcast.sql` on Supabase PostgreSQL and verify `pg_publication_tables` confirms `work_orders`, `service_bays`, and `transactions` are in `supabase_realtime` with full replica identity configured.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Registering tables in supabase_realtime publication
  Given a Supabase PostgreSQL instance with public.work_orders, public.service_bays, and public.transactions
  When migration 20261021000000_executive_realtime_broadcast.sql is executed
  Then public.work_orders is registered in publication supabase_realtime
  And public.service_bays is registered in publication supabase_realtime
  And public.transactions is registered in publication supabase_realtime
  And tables work_orders, service_bays, and transactions have REPLICA IDENTITY FULL configured
  And re-running the migration succeeds idempotently without error
```

---

### User Story 2 - Sub-500ms POS Transaction Invalidation & Live Revenue Pulse (Priority: P1)

As an Executive or Operations Manager monitoring the shop floor,  
I want the Admin Dashboard at `/admin` to receive POS transaction `INSERT` payloads in sub-500ms via `useExecutiveRealtime`,  
so that the Gross Revenue metric card and 7-Day Trend Chart update dynamically with a live visual pulse and fresh revenue increment without manual page reloads.

**Why this priority**: Executives need immediate confirmation of shop floor sales activity and real-time revenue pacing against daily targets.

**Independent Test**: Render the Admin Dashboard with `useExecutiveRealtime`, emit a mock or Supabase CDC `INSERT` on `transactions`, and assert that within 500ms `grossRevenue` increments by `total_due`, a `LIVE` pulse badge activates, and the current day's revenue bar updates.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Sub-500ms POS Transaction Invalidation
  Given an open Admin Dashboard view at /admin
  When a cashier completes a transaction with total_due 1500.00 on the Staff POS terminal
  Then the useExecutiveRealtime client hook receives the INSERT payload within 500ms
  And triggers an update of the Gross Revenue card incrementing by 1500.00
  And displays a temporary LIVE pulse badge with sale increment notification
  And updates the 7-Day Trend Chart today's bar without reloading the page
```

---

### User Story 3 - Realtime Service Bay Queue State Synchronization (Priority: P1)

As a Workshop Supervisor or Service Bay Manager,  
I want live updates to `work_orders` and `service_bays` to immediately reflect on the Service Bay Status card,  
so that when mechanics transition a job to `COMPLETED`, `PENDING_PARTS`, or `IN PROGRESS`, the dashboard updates status badges and queue counts dynamically with zero layout flicker.

**Why this priority**: Prevents miscommunication between mechanics and service advisors regarding bay availability, idle time, and bottlenecks.

**Independent Test**: Emit a CDC `UPDATE` on `public.work_orders` changing status to `COMPLETED` or `PENDING_PARTS`, and verify that `ServiceBayStatusCard` immediately updates the bay status badge and mechanic note with zero layout shift or visual jitter.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Realtime Work Order Lifecycle Transition
  Given the Service Bay Status card rendered on the Admin Dashboard
  When a floor mechanic updates work order WO-2026-0001 status to PENDING_PARTS
  Then the card updates the status badge to PENDING_PARTS dynamically
  And the badge styling reflects the semantic accent color tokens
  And the queue summary count adjusts with zero layout flicker
```

---

### User Story 4 - Low-Stock Threshold Alert Trigger (Priority: P2)

As an Inventory Manager or Executive,  
I want live stock decrements below `min_threshold` to trigger an immediate alert on the `Critical Low Stock` metric card,  
so that replenishment actions can be taken immediately without waiting for end-of-day inventory audits.

**Why this priority**: Prevents shop downtime and stockouts of high-velocity motorcycle parts (e.g., brake pads, engine oils).

**Independent Test**: Emit an `UPDATE` event on `products` where `stock <= min_threshold`, and verify that the `Critical Low Stock` card increments its count, toggles the danger styling badge (`bg-danger-light text-danger`), and triggers the `onStockAlert` callback.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Low-stock threshold alert triggered during checkout
  Given inventory stock for part SKU-OIL-10W40 decrements past min_threshold of 5
  When the realtime CDC event is broadcast on channel operational-intelligence
  Then the Critical Low Stock metric card increments its count
  And toggles high-visibility danger styling immediately
```

---

### User Story 5 - Resilient Realtime Hook Lifecycle & Offline Reconnection (Priority: P2)

As a System Administrator,  
I want `useExecutiveRealtime` to handle WebSocket disconnects, reconnects, and component unmounts cleanly,  
so that no channel memory leaks or duplicate subscriptions occur during client navigation.

**Why this priority**: Avoids browser memory exhaustion and duplicate event handling on fast refreshes or network hiccups.

**Independent Test**: Mount the hook, simulate network disconnection (`CHANNEL_ERROR` / `TIMED_OUT`), assert `isConnected` becomes `false`, reconnect to `SUBSCRIBED`, assert `isConnected` becomes `true`, unmount component, and assert `removeChannel` is called.

**Acceptance Scenarios (Gherkin)**:
```gherkin
Scenario: Channel reconnection and cleanup
  Given useExecutiveRealtime is subscribed to operational-intelligence
  When the connection drops and recovers
  Then the hook status transitions from SUBSCRIBED to CHANNEL_ERROR to SUBSCRIBED
  And when the component unmounts
  Then supabase.removeChannel is cleanly invoked without error
```

---

## Edge Cases

1. **Simultaneous Multi-Counter Checkouts**: Multiple cashiers completing transactions at the same second. The hook must accumulate gross revenue increments atomically without race conditions (`setGrossRevenue(prev => prev + amount)`).
2. **Missing / Mock Environment**: When `NEXT_PUBLIC_SUPABASE_URL` is undefined or during local offline testing, the hook must gracefully degrade, log a debug warning, and fallback to `swift:pos:checkout` window events.
3. **Duplicate CDC Payloads**: Deduplicate incoming events by record `id` and `commit_timestamp` to prevent double-counting revenue.
4. **Out-of-Order Work Order Updates**: Ensure timestamp comparison (`updated_at`) guarantees latest status wins if network packets arrive out-of-order.
5. **Zero Layout Flicker**: Bay cards and KPI cards maintain fixed height / min-height containers so changes in text or badge length never cause cumulative layout shift (CLS = 0).

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide an idempotent SQL migration (`20261021000000_executive_realtime_broadcast.sql`) registering `work_orders`, `service_bays`, and `transactions` in publication `supabase_realtime` and setting `REPLICA IDENTITY FULL`.
- **FR-002**: System MUST implement a dedicated React client hook `useExecutiveRealtime` in `lib/analytics/use-executive-realtime.ts` subscribing to channel `operational-intelligence`.
- **FR-003**: `useExecutiveRealtime` MUST accept optional handlers: `onTransaction`, `onWorkOrderChange`, `onServiceBayChange`, `onStockAlert`, `onStatusChange`.
- **FR-004**: `useExecutiveRealtime` MUST listen to:
  - `postgres_changes` event `INSERT` on table `transactions`
  - `postgres_changes` events `INSERT`, `UPDATE`, `DELETE` on table `work_orders`
  - `postgres_changes` events `INSERT`, `UPDATE` on table `service_bays`
  - `postgres_changes` event `UPDATE` on table `products` where `stock <= min_threshold`
- **FR-005**: System MUST update `app/admin/page.tsx` (and client components) to subscribe to `useExecutiveRealtime` and dynamically update:
  - Gross Revenue card & 4-second live visual pulse
  - 7-Day Trend Chart today's bar
  - Active Service Bay queue and status badges
  - Critical Low Stock count and danger styling
- **FR-006**: Hook MUST expose connection status (`CONNECTING`, `SUBSCRIBED`, `TIMED_OUT`, `CHANNEL_ERROR`, `CLOSED`) and `isConnected: boolean`.
- **FR-007**: Hook MUST cleanly unsubscribe and release channels on unmount via `supabase.removeChannel(channel)`.
- **FR-008**: System MUST provide strongly typed contracts in `lib/contracts/executive-realtime.ts` and `specs/068-supabase-realtime-operational-broadcast-executive-kpis-service-bays/contracts/`.
- **FR-009**: All visual elements MUST strictly use SWIFT semantic design tokens (`bg-success-light`, `text-success`, `bg-danger-light`, `text-danger`, `bg-accent-light`, `text-accent`, etc.) with zero hardcoded hex/RGB values.
- **FR-010**: System MUST provide automated unit and integration tests verifying hook lifecycle, CDC event handling, optimistic updates, and component wiring.

---

## Key Entities & State Invariants

- **ExecutiveRealtimeOptions**: Handlers for `onTransaction`, `onWorkOrderChange`, `onServiceBayChange`, `onStockAlert`, `onStatusChange`, and `enabled` flag.
- **ExecutiveRealtimeState**: `isConnected: boolean`, `status: RealtimeChannelStatus`, `lastEventTimestamp: string | null`.
- **TransactionBroadcastPayload**: `total_due: number`, `receipt_number: string`, `payment_method: string`, `cashier_name: string`.
- **WorkOrderBroadcastPayload**: `id: string`, `order_number: string`, `bay_id: string | null`, `status: WorkOrderStatus`, `vehicle_model: string`, `service_name: string`.
- **StockAlertPayload**: `sku: string`, `name: string`, `stock: number`, `min_threshold: number`.

---

## Success Criteria

- **SC-001**: SQL migration registers all three tables in `supabase_realtime` publication with full replica identity and executes idempotently.
- **SC-002**: POS transaction events broadcast to `operational-intelligence` update the Gross Revenue card in under 500ms.
- **SC-003**: Work order status changes update the Service Bay card with zero layout flicker and correct token styling.
- **SC-004**: Low-stock events trigger danger badge styling and count increment immediately.
- **SC-005**: `npx tsc --noEmit` passes with 0 errors.
- **SC-006**: `npm run lint` passes with 0 errors.
- **SC-007**: `npm test` passes all tests with 100% success rate.
- **SC-008**: 100% compliance with SWIFT Constitution Principle I (zero hardcoded colors).
