# Quickstart & Validation Guide: Supabase Realtime Multi-Terminal Sync & Low-Stock Alerts Engine

**Feature Branch**: `feat/SIAA-48-supabase-realtime-multi-terminal-sync`  
**Feature Spec**: [`specs/014-supabase-realtime-multi-terminal-sync/spec.md`](spec.md)  
**Contracts**: [`contracts/realtime-product.ts`](contracts/realtime-product.ts) | [`contracts/realtime-migration.sql`](contracts/realtime-migration.sql)  
**Jira Issue**: [SIAA-48](https://the-three-devsketeers.atlassian.net/browse/SIAA-48)  

---

## 1. Prerequisites

Ensure local environment dependencies are running and configured:
```bash
# 1. Verify TypeScript build and node test runner
npx tsc --noEmit
npm test
```

---

## 2. Validation Scenarios

### Scenario 1: Apply Realtime Migration & Verify Publication

Apply migration `supabase/migrations/20261011010000_enable_realtime_products.sql` and verify publication membership and replica identity:

```sql
-- Verify table is registered in supabase_realtime publication
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' AND tablename = 'products';

-- Verify replica identity is FULL
SELECT relname, relreplident 
FROM pg_class 
WHERE relname = 'products';
-- (relreplident 'f' indicates REPLICA IDENTITY FULL)
```

**Expected Outcome**:
- `public.products` appears in `pg_publication_tables` for `supabase_realtime`.
- `relreplident` displays `'f'` (Full).

---

### Scenario 2: Multi-Terminal Instant Stock Propagation

1. Open Terminal A in browser at `http://localhost:3000/admin/inventory`.
2. Open Terminal B in browser (or incognito window) at `http://localhost:3000/staff/pos`.
3. Locate SKU `BRK-PAD-001` on Terminal A (e.g. initial count: 15).
4. On Terminal B (Staff POS), add 2 units of `BRK-PAD-001` to ticket and complete sale.
5. Observe Terminal A without reloading the page.

**Expected Outcome**:
- Within 500ms, Terminal A's stock counter dynamically updates from 15 to 13.
- Inventory KPI cards on Terminal A recalculate total stock and valuation reactively.

---

### Scenario 3: Automatic Low-Stock Alert Badge Dynamic Toggle

1. In Terminal A (`/admin/inventory`), locate a product with `stock = 6` and `minThreshold = 5`.
2. Notice the initial badge status is green healthy: `6 in stock` (`bg-success-light text-success`).
3. From POS or an adjustment modal, decrement stock by 2 units so stock drops to 4 (`stock <= minThreshold`).
4. Observe the stock status badge in `CatalogTable`.

**Expected Outcome**:
- The badge automatically switches from green `6 in stock` to amber/danger `Low: 4 left (Min 5)` (`bg-danger-light text-danger`) with the `AlertTriangle` icon.
- No page reload occurs.

---

## 3. Automated Test Suite Execution

Run test suites covering store updates, payload mapping, and badge behavior:

```bash
npm test
```
