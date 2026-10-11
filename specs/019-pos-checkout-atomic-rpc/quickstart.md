# Quickstart & Verification Guide: Supabase Atomic Checkout RPC

**Feature**: SIAA-51 (STORY-3.8)  
**Spec Directory**: `specs/019-pos-checkout-atomic-rpc/`  

---

## 1. Migration Deployment

The atomic stored procedure migration is located at:
`supabase/migrations/20261014010000_process_pos_checkout_rpc.sql`

To deploy to local or remote Supabase:
```bash
npx supabase db push
# or run against local Postgres:
psql $DATABASE_URL -f supabase/migrations/20261014010000_process_pos_checkout_rpc.sql
```

---

## 2. Running Automated Tests

Run the dedicated test suite validating the stored procedure contract, Server Action, and rollback mechanics:
```bash
npm test -- lib/pos/__tests__/atomic-checkout-rpc.test.ts
```

Run full typechecking:
```bash
npx tsc --noEmit
```

---

## 3. Verification Scenarios Walkthrough

### Scenario 1: Multi-Item Hybrid Sale
1. Open Staff POS at `/staff/pos`.
2. Add physical parts (`MOT-3100-10W40`, Qty 1) and workshop service (`SRV-OIL-01`, Qty 1).
3. Click "Complete Sale (F12)".
4. Observe successful completion toast, stock level decremented on shelf/catalog display, and cart cleared.

### Scenario 2: Insufficient Stock Protection & Toast Alert
1. In mock or live state, select a part with low stock (e.g. `stock = 1`).
2. Add quantity 2 to the cart.
3. Click "Complete Sale (F12)".
4. Observe high-contrast toast: `"Cannot complete checkout: Insufficient stock for SKU <sku>"`.
5. Cart items remain intact, stock remains unchanged, and no corrupt transaction is created.
