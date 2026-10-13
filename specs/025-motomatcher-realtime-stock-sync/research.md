# Technical Research & Architecture Specification: Supabase Realtime Fitment Updates & Stock Alert Broadcast

**Feature**: `025-motomatcher-realtime-stock-sync`  
**Jira Ticket**: [SIAA-55](https://the-three-devsketeers.atlassian.net/browse/SIAA-55) (STORY-4.8)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  
**Date**: 2026-10-14  

---

## 1. Problem Statement & Operational Context

In busy motorcycle repair bay and parts store environments:
- Floor technicians roam with mobile tablets checking motorcycle compatibility (e.g. while examining a Yamaha NMAX or Honda Click in the bay).
- Counter cashiers execute rapid POS checkouts at fixed checkout terminals.
- When the last OEM brake pad is sold at counter 1, mobile devices running MotoMatcher previously could show stale inventory until a manual browser refresh was triggered. If a mechanic tells a customer "we have 1 set in stock" when it was just sold seconds earlier, it creates customer friction and wasted technician labor.

To eliminate this friction, Supabase Realtime pushes database change events over WebSockets directly to floor terminals within <500ms.

---

## 2. Technical Stack Constraints & Guidelines

- **Framework**: Next.js 15 App Router with React 19 Client Components (`"use client"`).
- **Database & Realtime**: PostgreSQL via Supabase with `@supabase/supabase-js`.
- **Publication**: `supabase_realtime` publication must include `public.products` and `public.product_fitments` with `REPLICA IDENTITY FULL`.
- **Styling**: Tailwind CSS v4 with strict SWIFT Design Tokens (`lib/tokens.ts`, `app/globals.css`).
  - In Stock: `text-success bg-success-light border border-success/20`
  - Low Stock: `text-accent bg-accent-light border border-accent/20`
  - Out of Stock: `<span class="badge badge-danger">Out of Stock</span>` / `text-danger bg-danger-light border border-danger/20`
- **Zero Hardcoded Colors**: No arbitrary hex/rgb values.

---

## 3. Database Migration Strategy

### Migration: `20261017000000_motomatcher_realtime.sql`

```sql
-- 1. Ensure public.products is in supabase_realtime publication
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

ALTER TABLE public.products REPLICA IDENTITY FULL;

-- 2. Ensure public.product_fitments is in supabase_realtime publication
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'product_fitments'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.product_fitments;
    END IF;
END
$$;

ALTER TABLE public.product_fitments REPLICA IDENTITY FULL;
```

---

## 4. Realtime Channel & Hook Architecture

### Channel: `motomatcher-matrix`

The hook `useMotoMatcherRealtime(activeModelId, options)` coordinates:
1. **Product Changes**: Listens to `postgres_changes` on `schema: 'public', table: 'products'`.
   - On UPDATE/INSERT: Maps row payload and updates `inventoryStore.updateProduct()`.
   - Detects when stock drops to 0 or crosses `min_threshold`.
   - Triggers `options.onStockUpdate(updatedProduct)` and `options.onLowStock(updatedProduct)`.
2. **Fitment Changes**: Listens to `postgres_changes` on `schema: 'public', table: 'product_fitments'`.
   - On INSERT/UPDATE/DELETE: If the fitment affects `activeModelId`, triggers optimistic cache invalidation / re-fetch callback `options.onFitmentChange()`.
3. **Connection State Tracking**:
   - Manages connection statuses (`CONNECTING`, `SUBSCRIBED`, `TIMED_OUT`, `CHANNEL_ERROR`, `CLOSED`).
   - Automatically reconnects and re-synchronizes when the terminal reconnects after brief drops.

---

## 5. UI Integration & Component Wireframe

In `app/staff/compat/page.tsx`:
- Mounts `useMotoMatcherRealtime(selectedModel?.id)`.
- Renders connection status dot indicator in the header.
- Dynamic stock badge rendering:
  - If `part.stock <= 0`:
    ```tsx
    <span className="text-[10px] px-2 py-0.5 rounded-md font-bold text-danger bg-danger-light border border-danger/20 badge badge-danger">
      Out of Stock
    </span>
    ```
  - Button state:
    ```tsx
    <button
      type="button"
      disabled={part.stock <= 0}
      onClick={() => handleAddToCart(part)}
      className={part.stock <= 0 ? "opacity-50 cursor-not-allowed ..." : "..."}
    >
      {part.stock <= 0 ? "Unavailable" : addedSku === part.sku ? "Added" : "Add to POS"}
    </button>
    ```

---

## 6. Resilience & Test Strategy

- **Unit Tests**:
  - Test hook behavior in mock environment (`use-motomatcher-realtime.test.ts`).
  - Test store updates upon simulated postgres payload.
  - Test transition from In Stock -> Out of Stock and button disablement.
  - Test reconnection and fallback gracefully when Supabase client is offline.
- **Integration Tests**:
  - Verify migration SQL syntax and publication statements.
  - Verify zero TypeScript compiler errors (`tsc --noEmit`).
