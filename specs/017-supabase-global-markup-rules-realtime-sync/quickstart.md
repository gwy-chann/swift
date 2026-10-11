# Quickstart & Verification Guide: SIAA-57

**Feature**: Supabase Global Markup Rules Schema, Realtime Sync & Price Revalidation Engine  
**Ticket**: [SIAA-57](https://the-three-devsketeers.atlassian.net/browse/SIAA-57) (STORY-7.7)  

---

## 1. Automated Verification Commands

Run all unit, contract, and server action tests:

```bash
# Run server action tests for pricing rules
npm test -- lib/admin/__tests__/pricing-actions.test.ts

# Run type check
npm run typecheck

# Run linter
npm run lint
```

---

## 2. Interactive Scenarios Walkthrough

### Scenario A: Admin View & Save Markup Rules
1. Navigate to `/admin/rates` in the browser.
2. Locate the **Global Parts Markup Rules** panel card.
3. Verify current initialized values:
   - Standard Retail Markup: `35%`
   - Wholesale / Reseller Markup: `18%`
   - Performance Aftermarket Markup: `40%`
4. Update Standard Retail Markup to `38%`.
5. Click **Save Markup Rules**.
6. Verify:
   - Server mutation succeeds.
   - Success toast appears: `"Global pricing rules updated successfully"`.
   - On-demand revalidation fires for `/admin/rates`, `/staff/pos`, and `/admin/inventory`.
   - Audit entry is recorded in `public.pricing_rules_audit_logs`.

### Scenario B: Multi-Terminal Realtime Broadcast
1. Open `/staff/pos` in one browser window and `/admin/rates` in another.
2. In the admin window, change the wholesale markup to `20%`.
3. Save changes.
4. Without refreshing the `/staff/pos` window, observe the pricing calculation engine in POS receiving the Realtime event within 500ms and recalculating active cart totals accordingly.

### Scenario C: Constraint Violations
1. Try setting retail markup to `0%` or `250%`.
2. Form validator intercepts with error message: `"Retail markup must be greater than 0% and cannot exceed 200%"`.
3. Server Action independently returns `{ success: false, code: 'VALIDATION_ERROR' }`.
