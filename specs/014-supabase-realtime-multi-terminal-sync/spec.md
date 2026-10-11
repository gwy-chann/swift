# Feature Specification: Supabase Realtime Multi-Terminal Sync & Low-Stock Alerts Engine

**Feature Branch**: `feat/SIAA-48-supabase-realtime-multi-terminal-sync`

**Created**: 2026-10-11

**Status**: Draft

**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-48 - STORY-2.9: Supabase Realtime Multi-Terminal Sync & Low-Stock Alerts Engine. Inventory stock counts and low-stock alerts update in real-time across all connected terminals without refreshing the page, so that floor mechanics never retrieve parts that were just sold at the POS counter, and restock alerts trigger immediately."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Multi-Terminal Instant Stock Propagation (Priority: P1)

Counter cashiers at the POS terminals and warehouse staff on the shop floor or admin desk need stock level modifications to propagate across all active application sessions without requiring manual page reloads or polling.

**Why this priority**: In a fast-paced motorcycle parts workshop, parts sold at the checkout lane must immediately reflect as deducted in the inventory catalog. Without real-time synchronization, shop mechanics may attempt to pick and allocate physical parts that were already sold, leading to customer delays and stock discrepancy.

**Independent Test**: Can be independently verified by opening two client views displaying the same SKU (or mocking a Realtime channel event), issuing a stock adjustment or POS checkout on one terminal, and asserting that the second terminal receives the Supabase Realtime `postgres_changes` event (`UPDATE`) within 500ms and automatically re-renders the new stock quantity and inventory KPI metrics.

**Acceptance Scenarios**:

1. **Given** Terminal A (Admin Inventory view) and Terminal B (Staff Fast-Lane POS) displaying SKU `BRK-PAD-001` with 15 units, **When** Terminal B checks out 2 units decrementing stock to 13, **Then** Terminal A receives a Supabase Realtime `postgres_changes` event (`UPDATE`) within 500ms, **And** Terminal A updates the displayed stock count and KPI cards dynamically without requiring a page reload.
2. **Given** multiple connected clients, **When** an inventory supervisor performs a stock restock adjustment of +10 units in the Admin portal, **Then** all connected staff and admin terminals immediately display the incremented count in their product listings.
3. **Given** an active inventory view, **When** the network temporarily drops and reconnects, **Then** the Realtime subscription automatically recovers and re-synchronizes with the latest database state.

---

### User Story 2 - Automatic Low-Stock Alert Badge & Notification Toggle (Priority: P1)

Store supervisors and warehouse clerks need instant visual alerts whenever any motorcycle part's stock level drops to or below its designated minimum reorder threshold (`min_threshold`).

**Why this priority**: Prompt floor restocking and supplier purchase orders prevent stockouts of critical consumable motorcycle items (e.g., brake pads, 4T engine oils, spark plugs). Automatic visual transitions from healthy to low-stock status ensure staff take timely action.

**Independent Test**: Can be tested by updating a product's stock count from above `min_threshold` to equal to or below `min_threshold` via a realtime event, and verifying that the `StockBadge` component instantly switches from healthy state (`bg-success-light text-success`) to low stock state (`bg-danger-light text-danger`) with the warning icon.

**Acceptance Scenarios**:

1. **Given** a product `OIL-MOT-10W40` with `stock = 6` and `min_threshold = 5`, **When** a sale decrements stock by 2 units to 4, **Then** upon receiving the realtime update, the UI badge dynamically switches from neutral/success to the danger/amber `Low Stock` status.
2. **Given** a product whose stock drops to 0, **When** the realtime update event arrives, **Then** the UI badge dynamically transitions to the `Out of Stock` status badge (`bg-danger text-text-light`).
3. **Given** a product in low-stock status, **When** an inbound restock increases stock above `min_threshold`, **Then** the UI badge immediately reverts to the healthy green in-stock status.

---

### User Story 3 - Database Realtime Publication & Replica Identity (Priority: P1)

Database administrators and backend services need `public.products` registered with Supabase's `supabase_realtime` publication and configured with proper replica identity.

**Why this priority**: Supabase Realtime utilizes PostgreSQL logical replication slots. If `public.products` is not explicitly added to `supabase_realtime`, no change events are broadcast to WebSocket subscribers. Setting `REPLICA IDENTITY FULL` guarantees that UPDATE events transmit complete old and new row states.

**Independent Test**: Can be independently verified by inspecting publication membership in PostgreSQL (`SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'products'`) and verifying that changes broadcast through the Supabase Realtime engine.

**Acceptance Scenarios**:

1. **Given** the database, **When** migration runs, **Then** `public.products` is registered with the `supabase_realtime` publication (`ALTER PUBLICATION supabase_realtime ADD TABLE public.products;`).
2. **Given** `public.products`, **When** migration runs, **Then** `REPLICA IDENTITY FULL` is applied to ensure full row context on update events.

---

### User Story 4 - Reactive Hook & Store Synchronization Architecture (Priority: P2)

Frontend engineers need a robust, reusable React hook `useInventoryRealtime()` that encapsulates Supabase Realtime subscription lifecycle, channels, cleanups, and dispatching to `inventoryStore.updateProduct()`.

**Why this priority**: Centralizing the realtime subscription into a custom hook prevents memory leaks from uncleaned WebSocket channels, ensures consistent mapping from snake_case database rows to camelCase `Product` domain models, and decouples UI components from Supabase client plumbing.

**Independent Test**: Can be independently tested using unit and integration tests that mock the Supabase client channel, trigger payload events, and verify that `inventoryStore.updateProduct` updates the reactive state and notifies listeners.

**Acceptance Scenarios**:

1. **Given** `InventoryCatalog`, **When** the component mounts, **Then** `useInventoryRealtime()` initializes and subscribes to `postgres_changes` on `public.products`.
2. **Given** an incoming `UPDATE` payload, **When** processed by `useInventoryRealtime()`, **Then** it dispatches `inventoryStore.updateProduct(payload.new)`, triggering automatic re-renders in `CatalogTable` and `InventoryStatsCards`.
3. **Given** `InventoryCatalog`, **When** the component unmounts, **Then** the channel subscription is cleanly unsubscribed and destroyed.

---

### Edge Cases

- **Missing or Partial Fields in Payload**: The hook and store must defensively map snake_case columns (`min_threshold`, `image_url`, `created_at`, `updated_at`) and handle optional fields without throwing `TypeError`.
- **Rapid Burst Updates**: Rapid successive checkout deductions on multiple terminals must apply in sequence without race conditions, updating the local store state immutably.
- **Offline / Disconnected State**: When client has no internet connection or Supabase credentials are missing (e.g. test environments), the hook must fail gracefully without throwing uncaught exceptions or breaking page rendering.
- **Insert & Delete Events**: While SIAA-48 focuses on stock `UPDATE` propagation, `INSERT` and `DELETE` events should also be handled gracefully by updating or adding to the catalog.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST register `public.products` in the PostgreSQL `supabase_realtime` publication via a deterministic migration.
- **FR-002**: System MUST configure `REPLICA IDENTITY FULL` on `public.products` to broadcast complete row changes.
- **FR-003**: System MUST provide a custom hook `useInventoryRealtime` that manages the Supabase Realtime channel lifecycle for `public.products`.
- **FR-004**: System MUST subscribe to `postgres_changes` with filter event `*` or `UPDATE` on schema `public` and table `products`.
- **FR-005**: System MUST provide an `updateProduct` method on `InventoryStore` that updates an existing product by SKU or ID and notifies subscribers.
- **FR-006**: System MUST map snake_case database row fields (`min_threshold`, `cost`, `retail`, `wholesale`, `stock`, `location`, `oem`, `image_url`) to the canonical camelCase `Product` domain model.
- **FR-007**: System MUST automatically trigger re-renders of `CatalogTable`, `StockBadge`, and `InventoryStatsCards` when `updateProduct` is invoked.
- **FR-008**: System MUST cleanly unsubscribe the Realtime channel when the host component unmounts.
- **FR-009**: All UI styling MUST strictly use SWIFT Design Tokens (`lib/tokens.ts`, `app/globals.css`, zero hardcoded hex/rgb).

### Key Entities

- **Product**: Domain model containing `sku`, `name`, `category`, `stock`, `minThreshold`, `cost`, `wholesale`, `retail`, `location`, `oem`, `model`, `brand`.
- **RealtimeProductPayload**: PostgreSQL changes payload from Supabase Realtime containing `eventType: 'UPDATE' | 'INSERT' | 'DELETE'`, `new: Record<string, unknown>`, and `old: Record<string, unknown>`.
- **InventoryStore**: Centralized client reactive store providing `subscribe`, `getState`, `products`, `updateProduct`, `adjustStock`, `rollbackStock`, and `hydrateProducts`.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Stock updates propagate and re-render across active terminal views within 500 milliseconds of database transaction commit.
- **SC-002**: 100% of products breaching minimum threshold trigger the `Low Stock` status badge without requiring page refresh.
- **SC-003**: 0 uncaught exceptions or memory leaks when navigating into and away from realtime-enabled views.
- **SC-004**: 100% compliance with SWIFT semantic design tokens (zero hardcoded colors).
- **SC-005**: All test suites pass with 100% coverage of realtime payload transformation, store update, and threshold transitions.

## Assumptions

- Supabase project is configured with PostgreSQL logical replication enabled for `supabase_realtime`.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` are provided in application environment.
