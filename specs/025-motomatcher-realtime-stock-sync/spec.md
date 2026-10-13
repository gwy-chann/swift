# Feature Specification: Supabase Realtime Fitment Updates & Stock Alert Broadcast for Floor Terminals

**Feature Branch**: `feat/SIAA-55-motomatcher-realtime-stock-sync`  
**Created**: 2026-10-14  
**Status**: Ready for Planning  
**Jira Ticket**: [SIAA-55](https://the-three-devsketeers.atlassian.net/browse/SIAA-55) (STORY-4.8)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts retail and repair workshop environments, floor mechanics using mobile terminals and counter clerks operating the MotoMatcher compatibility matrix must see instant inventory decrements and stock status broadcasts. 

When a cashier sells out an OEM brake pad (e.g. `Yamaha NMAX 155` front brake pads) or a high-wear spark plug at the checkout counter, floor mechanics and counter clerks looking at their terminals must immediately see the updated stock levels and out-of-stock badges without having to manually refresh their browser or reload the page.

This feature implements:
1. **Supabase Realtime Publication**: Adds `public.product_fitments` and verifies `public.products` in the `supabase_realtime` publication, configuring `REPLICA IDENTITY FULL` for reliable change payload distribution.
2. **Realtime Hook & Subscription Engine (`useMotoMatcherRealtime`)**: A resilient client hook listening to postgres changes on channel `motomatcher-matrix` (and `realtime:products`), automatically propagating stock decrements into the active view and optimistic local state.
3. **Reactive MotoMatcher UI & Stock Badge States**: Immediate visual transitions for parts in the MotoMatcher matrix:
   - High Stock: Standard shelf & stock display
   - Low Stock: Warning badge highlighting near-depletion
   - Out of Stock: `<span class="badge badge-danger">Out of Stock</span>` badge with disabled 1-click "Add to POS" button
4. **Resilient Network Handling**: Silent auto-reconnection and optimistic cache invalidation upon connection recovery to ensure zero stale data across terminals.

---

## Clarifications

### Session 2026-10-14

- Q: Which publication and channel names should be used for broadcasting fitment and stock changes? → A: Database publication `supabase_realtime` for `public.product_fitments` and `public.products`; client subscription channel `motomatcher-matrix`.
- Q: What visual badge and button behavior should occur when stock reaches 0? → A: Badge renders `<span class="badge badge-danger">Out of Stock</span>` using SWIFT semantic danger tokens (`bg-danger-light text-danger border-danger/20`) and the 1-click "Add to POS" button is disabled without page reload.
- Q: How does reconnection handle temporary network drops on floor terminals? → A: Silent auto-reconnection automatically triggers cache invalidation and re-hydration to guarantee consistency.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Realtime Publication on Inventory & Fitment Links (Priority: P1)

* **As a** System Administrator or Database Engineer,
* **I want** `public.product_fitments` and `public.products` registered with the Supabase Realtime publication with full replica identity,
* **so that** database-level mutations (inserts, updates, deletes) are broadcast over WebSocket channels to all connected floor terminals.

#### Scenario 1: Realtime Publication on Inventory & Fitment Links
* **Given** the Supabase PostgreSQL database instance,
* **When** migration `20261017000000_motomatcher_realtime.sql` is applied,
* **Then** `public.product_fitments` and `public.products` are added to the `supabase_realtime` publication,
* **And** `REPLICA IDENTITY FULL` is enabled on `public.product_fitments` and verified on `public.products`.

**Independent Test**: Verify via `pg_publication_tables` query that both `products` and `product_fitments` belong to `pubname = 'supabase_realtime'`.

---

### User Story 2 - Multi-Terminal Instant Stock Synchronization & Out of Stock Guards (Priority: P1)

* **As a** Floor Mechanic using a mobile terminal or Counter Clerk running MotoMatcher,
* **I want** live real-time stock decrements broadcasted across floor terminals via Supabase Realtime,
* **so that** when a cashier sells out an OEM brake pad or spark plug at the checkout counter, the MotoMatcher matrix on every floor device instantly reflects stock changes without requiring a manual browser refresh.

#### Scenario 2: Multi-Terminal Instant Stock Synchronization
* **Given** a Floor Mechanic viewing `Yamaha NMAX 155` OEM brake pads showing `2 in stock`,
* **When** a cashier completes a sale decrementing stock to `0` via the POS checkout RPC,
* **Then** the MotoMatcher matrix UI receives a `postgres_changes` event on channel `realtime:products` / `motomatcher-matrix` within 500ms,
* **And** the UI dynamically updates the stock badge to `<span class="badge badge-danger">Out of Stock</span>` (using semantic design token `bg-danger-light text-danger border-danger/20`),
* **And** disables the 1-click cart insertion button (`Add to POS`) without page reload.

**Independent Test**: Render MotoMatcher page, simulate a stock update payload to `0` on the active part, and assert that the stock badge immediately switches to Out of Stock and the button is disabled.

---

### User Story 3 - Silent Reconnection and Cache Invalidation (Priority: P2)

* **As a** Floor Mechanic navigating between repair bays with varying Wi-Fi coverage,
* **I want** the Realtime client to automatically reconnect and invalidate cached fitment data upon network restoration,
* **so that** my terminal never displays stale inventory counts after temporary packet drops or brief Wi-Fi disconnects.

#### Scenario 3: Silent Reconnection and Fallback
* **Given** a floor terminal loses network connectivity briefly,
* **When** connectivity is restored,
* **Then** the Realtime client automatically reconnects,
* **And** triggers an optimistic cache invalidation / re-sync to guarantee data consistency across terminals.

**Independent Test**: Simulate websocket disconnection and reconnection; verify channel state transitions to `SUBSCRIBED` and cache revalidation triggers.

---

### User Story 4 - Low Stock Threshold Alert Broadcast (Priority: P3)

* **As a** Floor Supervisor or Parts Specialist,
* **I want** MotoMatcher to visibly highlight items that cross below their minimum threshold,
* **so that** staff can initiate replenishment or warn customers of imminent stock-out.

#### Scenario 4: Low Stock Alert Badge
* **Given** a part with `min_threshold = 5` and current stock `6`,
* **When** a transaction decrements stock to `4`,
* **Then** the MotoMatcher part card dynamically reflects a warning alert badge indicating low stock,
* **And** allows adding remaining units up to available stock.

**Independent Test**: Emit stock decrement payload crossing below `min_threshold` and verify low-stock styling is applied.

---

## 3. Edge Cases

- **EC-001: Concurrent Checkouts**: Multiple cashiers decrementing stock simultaneously. Handled by atomic database RPCs and monotonic state updates in the UI store.
- **EC-002: Rapid WebSocket Payloads (Network Flurry)**: Multiple inventory events firing within milliseconds. Handled by lightweight state dispatching and idempotent updates in `inventoryStore`.
- **EC-003: Database Offline or Supabase Env Missing**: When running offline or during testing, `useMotoMatcherRealtime` gracefully falls back to local state and sets status to `CLOSED` without throwing unhandled exceptions.
- **EC-004: Part Stock Re-stocking (Positive Increment)**: When inventory is restocked from `0` to `10`, the Out of Stock badge reverts to In Stock and the "Add to POS" button is re-enabled immediately.
- **EC-005: Unmounted Components**: Clean channel tear-down (`supabase.removeChannel(channel)`) when navigating away from the MotoMatcher screen to prevent memory leaks.

---

## 4. Requirements

### Functional Requirements

- **FR-001**: System MUST provide a Supabase migration (`20261017000000_motomatcher_realtime.sql`) registering `public.product_fitments` and `public.products` to `supabase_realtime` publication.
- **FR-002**: System MUST provide a client hook `useMotoMatcherRealtime(activeModelId, options)` that subscribes to Supabase Realtime channel `motomatcher-matrix`.
- **FR-003**: System MUST update active product state in `inventoryStore` and local MotoMatcher views within 500ms of receiving a `postgres_changes` event.
- **FR-004**: System MUST render an Out of Stock badge (`<span class="badge badge-danger">Out of Stock</span>`) and disable the 1-click cart insertion button when stock reaches `0`.
- **FR-005**: System MUST support silent reconnection with optimistic cache re-sync when network connectivity returns.
- **FR-006**: System MUST support configurable callbacks (`onStockUpdate`, `onLowStock`, `onFitmentChange`) in `useMotoMatcherRealtime`.
- **FR-007**: All UI styling MUST strictly use SWIFT semantic design tokens (`bg-danger`, `text-danger`, `bg-success`, `text-success`, `bg-primary`, etc.) with zero hardcoded hex or RGB colors.

### Key Entities

- **ProductFitment**: The relational mapping between catalog products and motorcycle models (`product_id`, `model_id`, `fitment_type`, `year_range`, `notes`).
- **ProductStockChange**: Realtime payload representing updated inventory levels (`sku`, `stock`, `previous_stock`, `min_threshold`).
- **MotoMatcherRealtimeState**: Client-side reactive state tracking channel connection status (`SUBSCRIBED`, `CONNECTING`, `CLOSED`, `CHANNEL_ERROR`), active model ID, and latency metrics.

---

## 5. Success Criteria

### Measurable Outcomes

- **SC-001**: Stock changes broadcast from POS sales reflect on floor terminals in under 500ms.
- **SC-002**: Items with zero stock immediately show Out of Stock badge and prevent cart insertion without full page reload.
- **SC-003**: 100% adherence to SWIFT semantic design tokens and WCAG AA contrast standards.
- **SC-004**: Zero memory leaks or orphaned WebSocket listeners across route navigation.
- **SC-005**: 100% pass rate on TypeScript type checking and unit test suites.

---

## 6. Assumptions

- Prerequisites SIAA-53 (Motorcycle Models & Fitment Compatibility Matrix Schema) and SIAA-48 (Supabase Realtime Multi-Terminal Sync) are complete.
- Client terminals use modern browsers supporting WebSockets.
- Supabase Realtime service is provisioned and enabled on the Supabase project instance.
