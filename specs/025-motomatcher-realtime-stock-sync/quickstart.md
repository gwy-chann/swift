# Quickstart & Verification Guide: Supabase Realtime Fitment Updates & Stock Alert Broadcast

**Feature**: `025-motomatcher-realtime-stock-sync`  
**Jira Ticket**: [SIAA-55](https://the-three-devsketeers.atlassian.net/browse/SIAA-55) (STORY-4.8)  

---

## 1. Prerequisites & Environment

1. Working inside dedicated worktree: `.worktrees/SIAA-55`
2. Dependencies installed:
   ```bash
   npm install
   ```
3. Supabase local instance or configuration available in `.env.local`

---

## 2. Verification Scenarios

### Scenario 1: Database Realtime Publication Verification
Apply migration:
```bash
npx supabase migration up
```
Or verify publication directly in PostgreSQL:
```sql
SELECT pubname, tablename FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
  AND tablename IN ('products', 'product_fitments');
```
**Expected Outcome**: Both `products` and `product_fitments` are present in `supabase_realtime`.

---

### Scenario 2: Multi-Terminal Instant Stock Decrement & Out of Stock UI
1. Navigate to `/staff/compat` on a floor terminal.
2. Select `Yamaha NMAX 155`. Note OEM Brake Pad showing `Stock: 2`.
3. In another terminal or via POS checkout RPC, complete a sale decrementing stock to `0`.
4. Inspect the floor terminal MotoMatcher screen.
**Expected Outcome**:
- Within 500ms, the stock display updates to `<span class="badge badge-danger">Out of Stock</span>`.
- The "Add to POS" button is immediately disabled and changes text to "Out of Stock".
- No browser reload is required.

---

### Scenario 3: Network Drop & Silent Reconnection
1. On the floor terminal, simulate a brief network disconnect (e.g., toggle offline mode in browser devtools).
2. The connection status indicator turns amber/red (`CLOSED` or `CONNECTING`).
3. Re-enable network connectivity.
**Expected Outcome**:
- Realtime channel status returns to `SUBSCRIBED` with green indicator.
- Terminal automatically triggers cache invalidation and re-synchronizes latest inventory state.

---

### Scenario 4: Automated Test Execution
Run automated unit and integration tests:
```bash
npm test -- lib/hooks/use-motomatcher-realtime.test.ts
npm test -- lib/motomatcher
```

---

### Scenario 5: Static Analysis & Type Checking
```bash
npx tsc --noEmit
npm run lint
```
