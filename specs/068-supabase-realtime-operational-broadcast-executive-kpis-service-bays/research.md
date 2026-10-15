# Research & Technical Architecture: Supabase Realtime Operational Broadcast for Executive KPIs & Service Bays

**Feature**: Supabase Realtime Operational Broadcast for Executive KPIs & Service Bays  
**Ticket**: [SIAA-68](https://the-three-devsketeers.atlassian.net/browse/SIAA-68) (STORY-6.8)  
**Parent Epic**: [SIAA-6](https://the-three-devsketeers.atlassian.net/browse/SIAA-6) (EPIC-6: Executive Analytics, Revenue & Profit Margins)  

---

## Technical Context & Architecture Decisions

### 1. Supabase Realtime Publication & Replica Identity

#### Context
PostgreSQL's logical decoding publication `supabase_realtime` enables Supabase Realtime to broadcast row-level change events to WebSocket clients. By default, PostgreSQL publishes only primary keys on `UPDATE` events. Full row payloads (e.g. updated `status`, `notes`, `updated_at`, `total_due`) require `REPLICA IDENTITY FULL`.

#### Decision
- Create migration `20261021000000_executive_realtime_broadcast.sql`.
- Idempotently register tables in `supabase_realtime`:
  ```sql
  DO $$
  BEGIN
      IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'work_orders'
      ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.work_orders;
      END IF;

      IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'service_bays'
      ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.service_bays;
      END IF;

      IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables 
          WHERE pubname = 'supabase_realtime' AND tablename = 'transactions'
      ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
      END IF;
  END
  $$;
  ```
- Configure `REPLICA IDENTITY FULL` on `public.work_orders`, `public.service_bays`, and `public.transactions`.

---

### 2. Unified Multiplexed Channel vs Disparate Channels

#### Context
Multiple separate channels (e.g., one for transactions, one for bays, one for products) increase client WebSocket multiplexing overhead and connection states. The Jira ticket specifically calls for subscribing to channel `operational-intelligence`.

#### Decision
- Establish a single, centralized Supabase Realtime channel named `operational-intelligence` in `useExecutiveRealtime`.
- Chain `.on('postgres_changes', ...)` listeners on the single channel for:
  1. `transactions` (`INSERT`)
  2. `work_orders` (`*`)
  3. `service_bays` (`*`)
  4. `products` (`UPDATE`)
- This provides unified connection lifecycle management (`SUBSCRIBED`, `CHANNEL_ERROR`, `CLOSED`), reduces network socket overhead, and simplifies unmount teardown.

---

### 3. Client Hook Architecture & Callback Stability

#### Context
Passing inline callbacks (`onTransaction`, `onWorkOrderChange`) to React hooks can cause the `useEffect` hook to continuously re-subscribe if dependencies are not stabilized, leading to connection thrashing.

#### Decision
- Implement `lib/analytics/use-executive-realtime.ts` using `useRef` for all incoming callbacks:
  ```ts
  const onTransactionRef = useRef(options?.onTransaction);
  const onWorkOrderChangeRef = useRef(options?.onWorkOrderChange);
  const onServiceBayChangeRef = useRef(options?.onServiceBayChange);
  const onStockAlertRef = useRef(options?.onStockAlert);
  const onStatusChangeRef = useRef(options?.onStatusChange);

  useEffect(() => {
    onTransactionRef.current = options?.onTransaction;
    onWorkOrderChangeRef.current = options?.onWorkOrderChange;
    onServiceBayChangeRef.current = options?.onServiceBayChange;
    onStockAlertRef.current = options?.onStockAlert;
    onStatusChangeRef.current = options?.onStatusChange;
  }, [options]);
  ```
- Only re-subscribe if `enabled` or `channelName` explicitly changes.
- Return `{ isConnected, status, lastEventTimestamp }`.

---

### 4. Zero Layout Flicker & Optimistic State Propagation

#### Context
When realtime updates arrive, replacing or updating cards must not cause DOM shifts (Cumulative Layout Shift, CLS).

#### Decision
- Use CSS container constraints (`min-height`, explicit padding, and tabular nums).
- For `ServiceBayStatusCard`, map incoming `work_orders` and `service_bays` updates to existing display items using immutable updates:
  ```ts
  setBays(prev => prev.map(bay => bay.id === updatedBayId ? { ...bay, ...updatedFields } : bay));
  ```
- For `RevenueComparisonChart`, add live transactions into today's bucket (`Sun (Today)` / current weekday) and recalculate height percentages without reflowing axis labels.
- For `AdminKpiGrid`, trigger a 4-second animated pulse badge (`LIVE`) that automatically reverts to `Today` without shifting card dimensions.

---

### 5. Semantic Design Tokens & Accessibility (WCAG 2.1 AA)

#### Context
SWIFT Constitution Principle I forbids hardcoded colors.

#### Decision
- Use semantic tokens:
  - Live pulse badge: `bg-success-light text-success border-success/40 animate-pulse`
  - Warning/Critical low stock: `bg-danger-light text-danger border-danger/30`
  - In progress / pending parts: `bg-accent-light text-accent border-accent/30`
  - Completed: `bg-success-light text-success border-success/30`
  - Neutral / Queued: `bg-bg-muted text-text-secondary border-border-subtle`
- Provide `aria-live="polite"` on metric value changes to announce live updates to assistive technology.
