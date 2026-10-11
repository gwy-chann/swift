# Technical Research: Supabase Realtime Multi-Terminal Sync & Low-Stock Alerts Engine

**Feature Branch**: `feat/SIAA-48-supabase-realtime-multi-terminal-sync`  
**Feature Spec**: [`specs/014-supabase-realtime-multi-terminal-sync/spec.md`](spec.md)  
**Jira Issue**: [SIAA-48](https://the-three-devsketeers.atlassian.net/browse/SIAA-48)  

---

## 1. Executive Summary

This research resolves the key architectural decisions required to implement multi-terminal real-time inventory synchronization and automated low-stock alerting for the SWIFT motorcycle parts workshop management system. In high-velocity workshop environments, POS checkout lanes and mechanics on the shop floor interact with identical physical stock concurrently. To eliminate stock discrepancies and prevent double-allocations, stock modifications must broadcast instantly (<500ms) across all connected terminals using Supabase Realtime, updating reactive store state and UI threshold badges without page refreshes.

---

## 2. Architectural Decisions & Alternatives

### Decision 1: Supabase Realtime (`postgres_changes`) vs. HTTP Polling vs. Custom WebSockets

- **Context**: When a product's stock is decremented at a POS counter (Terminal B) or restocked by an inventory supervisor, other active terminals (Terminal A, floor tablets) need instantaneous notice of the updated stock count.
- **Decision**: Utilize Supabase Realtime client subscribing to `postgres_changes` on schema `public` and table `products`.
- **Rationale**:
  - Leverages Supabase's native PostgreSQL logical replication pipeline (`wal2json` / `pgoutput`), broadcasting changes directly from committed database transactions.
  - Sub-500ms latency without continuous client-side HTTP polling that wastes server resources and bandwidth.
  - Built-in automatic reconnection, heartbeat management, and multiplexed channels over a single WebSocket connection.
  - Zero requirement for custom WebSocket server infrastructure or external pub/sub brokers (e.g. Redis).
- **Alternatives Considered**:
  - *Periodic HTTP Polling (e.g. SWR / React Query every 5s)*: Increases server load exponentially with multiple terminals, introduces up to 5-second staleness windows, and drains mobile tablet battery on the workshop floor.
  - *Custom Socket.io / WebSocket Server*: Requires managing separate stateful WebSocket servers, authentication tokens, sticky sessions, and deployment infrastructure.

---

### Decision 2: PostgreSQL Realtime Publication Registration & Replica Identity

- **Context**: For Supabase Realtime to broadcast change events for `public.products`, the table must belong to the `supabase_realtime` publication. Additionally, update events should ideally provide full row context.
- **Decision**:
  1. Add `public.products` to the `supabase_realtime` publication via migration:
     ```sql
     ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
     ```
  2. Configure `REPLICA IDENTITY FULL` on `public.products`:
     ```sql
     ALTER TABLE public.products REPLICA IDENTITY FULL;
     ```
- **Rationale**:
  - Without registering `public.products` in `supabase_realtime`, Supabase's Realtime server ignores row changes on this table.
  - `REPLICA IDENTITY FULL` ensures that `UPDATE` payloads in PostgreSQL logical decoding capture the entire preceding row (`payload.old`) alongside the modified row (`payload.new`), allowing frontends to compare previous vs new stock levels and detect exact threshold breaches (e.g., transition from healthy stock to low stock).
- **Alternatives Considered**:
  - *Default Replica Identity (`REPLICA IDENTITY DEFAULT`)*: Only includes the primary key in `payload.old`, preventing client-side detection of what fields actually changed unless the client preserves historical snapshots.

---

### Decision 3: Custom React Hook (`useInventoryRealtime`) & Channel Lifecycle Management

- **Context**: Components such as `InventoryCatalog` or POS views must subscribe to realtime updates without creating duplicate WebSocket channels, leaking connections on navigation, or failing in disconnected / test environments.
- **Decision**: Encapsulate the subscription logic within a reusable custom React hook:
  ```ts
  export function useInventoryRealtime(options?: {
    enabled?: boolean;
    onUpdate?: (product: Product) => void;
  }): { isConnected: boolean; channelStatus: string };
  ```
- **Rationale**:
  - Manages subscription creation in `useEffect` and cleans up via `supabase.removeChannel(channel)` on component unmount.
  - Automatically handles connection status transitions (`SUBSCRIBED`, `TIMED_OUT`, `CLOSED`, `CHANNEL_ERROR`).
  - Gracefully tolerates missing environment variables or mocked clients, ensuring SSR and unit tests run cleanly without crashing.
  - Enables optional notification callbacks for low-stock alerts or sound effects.

---

### Decision 4: Centralized Store Synchronization via `inventoryStore.updateProduct()`

- **Context**: The application uses a centralized singleton `inventoryStore` (`useSyncExternalStore`) across admin and staff components. Realtime payloads arrive as raw database objects (snake_case) that must update the store.
- **Decision**:
  1. Introduce `updateProduct(partialProduct: Partial<Product> & { sku: string } | Product)` on `InventoryStore`.
  2. Implement a domain converter `mapRealtimeDbProductToProduct(row: Record<string, unknown>): Product` that converts snake_case database columns (`min_threshold`, `image_url`, `created_at`, `updated_at`, etc.) into camelCase domain types.
  3. When an `UPDATE` event arrives, the hook calls:
     ```ts
     const updated = mapRealtimeDbProductToProduct(payload.new);
     inventoryStore.updateProduct(updated);
     ```
- **Rationale**:
  - `inventoryStore.updateProduct()` updates the internal product array immutably and notifies all subscribers (`useInventoryStore`), triggering instant re-renders of `CatalogTable`, `StockBadge`, and `InventoryStatsCards`.
  - Maintains a clean separation between PostgreSQL persistence schema and TypeScript domain models.

---

### Decision 5: Automatic Low-Stock Alert State & Badge Transitions

- **Context**: Acceptance Criteria Scenario 3 requires that when a product's stock drops to or below `min_threshold`, the UI badge dynamically switches from neutral to the danger/amber `Low Stock` status.
- **Decision**:
  - `StockBadge` calculates its status dynamically using `getStockHealthStatus({ stock, minThreshold })`.
  - When `inventoryStore.updateProduct` updates `stock`, `CatalogTable` receives the updated product array and passes new values to `StockBadge`.
  - `StockBadge` evaluates `stock <= minThreshold` and immediately switches class names to `bg-danger-light text-danger` with the `AlertTriangle` icon without full-page reloads.
  - Furthermore, `useInventoryRealtime` can trigger a notification toast when `newStock <= minThreshold && oldStock > minThreshold`.

---

## 3. Migration Specification

- Migration file: `supabase/migrations/20261011010000_enable_realtime_products.sql`
- Script:
  ```sql
  -- Enable Supabase Realtime publication on public.products
  DO $$
  BEGIN
      IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'products'
      ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
      END IF;
  END
  $$;

  -- Enable full replica identity so updates deliver full previous and new row context
  ALTER TABLE public.products REPLICA IDENTITY FULL;
  ```

---

## 4. Verification & Testing Strategy

1. **Unit Tests**:
   - `inventory-store.test.ts`: Verify `updateProduct` updates existing products, preserves non-updated properties, and notifies subscribers.
   - `inventory-realtime.test.ts`: Verify `mapRealtimeDbProductToProduct` transforms snake_case rows to `Product` domain models and validates required attributes.
   - `stock-badge.test.ts`: Verify `StockBadge` dynamically transitions between healthy, low stock, and out of stock states.
2. **Type Safety & Build**:
   - Run `npx tsc --noEmit` and `npm run lint`.
3. **Graphify AST Update**:
   - Run `graphify . --update` to keep architecture graphs synced.
