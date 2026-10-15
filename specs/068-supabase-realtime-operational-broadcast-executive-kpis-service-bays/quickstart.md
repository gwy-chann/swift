# Quickstart & Verification Guide: Supabase Realtime Operational Broadcast for Executive KPIs & Service Bays

**Feature**: Supabase Realtime Operational Broadcast for Executive KPIs & Service Bays  
**Ticket**: [SIAA-68](https://the-three-devsketeers.atlassian.net/browse/SIAA-68) (STORY-6.8)  

---

## 1. Database Migration Verification

Apply the database migration to register `work_orders`, `service_bays`, and `transactions` in `supabase_realtime`:

```bash
# Verify migration syntax and publication status
supabase db reset
```

Or query PostgreSQL directly:
```sql
SELECT pubname, schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('work_orders', 'service_bays', 'transactions');
```

Expected output:
```text
      pubname      | schemaname |  tablename   
-------------------+------------+--------------
 supabase_realtime | public     | work_orders
 supabase_realtime | public     | service_bays
 supabase_realtime | public     | transactions
```

---

## 2. Automated Test Verification

Execute all unit and integration test suites:

```bash
npm test -- lib/analytics/__tests__/use-executive-realtime.test.ts
```

Check static types and linting:
```bash
npx tsc --noEmit
npm run lint
```

---

## 3. End-to-End Walkthrough Scenarios

### Scenario A: Realtime POS Checkout Invalidation (<500ms)
1. Open Admin Dashboard at `/admin`.
2. In a separate tab or terminal session, simulate a checkout:
   ```ts
   window.dispatchEvent(new CustomEvent('swift:pos:checkout', { detail: { totalDue: 1850.00 } }));
   ```
3. Observe `/admin`:
   - Gross Revenue card increments immediately by +₱1,850.00.
   - `LIVE` pulse badge flashes with subtext `+₱1850.00 sale just received!`.
   - Today's revenue bar in `RevenueComparisonChart` adjusts upwards.
   - Badge reverts to `Today` after 4 seconds.

### Scenario B: Service Bay Queue Status Transition
1. In the Service Bay Status card on `/admin`, observe Bay 1 (Quick Bay).
2. Emit a work order status update to `PENDING_PARTS`:
   - Status badge transitions to `PENDING_PARTS` with accent-light token styling.
   - Time / mechanic indicator updates with zero layout shift (CLS = 0).

### Scenario C: Critical Low-Stock Threshold Alert
1. Emit a stock decrement on an inventory part past `min_threshold`:
   - Critical Low Stock card increments count.
   - High-visibility danger styling activates immediately (`bg-danger-light text-danger`).
