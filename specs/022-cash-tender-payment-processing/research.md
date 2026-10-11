# Research & Technical Decisions: Cash Tender & Payment Processing with Real-Time Change Calculation

**Feature**: `022-cash-tender-payment-processing`  
**Ticket**: [SIAA-21](https://the-three-devsketeers.atlassian.net/browse/SIAA-21)  
**Date**: 2026-10-12  

---

## 1. Technical Context & Integration Architecture

The SWIFT Point of Sale consists of:
- `HybridCartPane` (`components/pos/hybrid-cart-pane.tsx`): Displays items, subtotal, discount chips, total due, and "COMPLETE SALE (F12)" button.
- `StaffPosPage` (`app/staff/pos/page.tsx`) & `AdminPosPage` (`app/admin/pos/page.tsx`): Coordinates catalog, cart, override modals, and checkout action.
- `useCartStore` (`lib/store/cart-store.ts`): Holds active ticket items, discount rate, pricing mode, and invokes `checkout()`.
- `processCheckoutAction` (`lib/pos/actions.ts`): Persists transaction and items via atomic RPC / mock engine.
- `ThermalReceiptModal` (`components/pos/thermal-receipt-modal.tsx`): Renders printable thermal receipt once checkout completes.

Currently, triggering "COMPLETE SALE (F12)" directly executes `checkout({ cashier, cashTendered: totals.total, paymentMethod: 'Cash' })`, bypassing any tender input or change calculation.

### Architectural Solution:
1. Introduce standalone pure calculation utilities: `lib/pos/cash-tender.ts`
   - Deterministic, unit-testable mathematical functions for change/shortage calculation and Philippine Peso quick denominations.
2. Introduce interactive modal: `components/pos/cash-tender-modal.tsx`
   - Pure UI component driven by semantic tokens.
   - Accessible keyboard handling (`F12`, `Enter`, `Escape`), auto-focusing numeric input, smart denomination buttons, real-time feedback banner.
3. Wire into `StaffPosPage` and `AdminPosPage`:
   - "COMPLETE SALE (F12)" opens `CashTenderModal`.
   - On valid submit, calls `checkout({ ...params, cashTendered, paymentMethod: 'Cash' })`.
   - On successful checkout, modal closes and `ThermalReceiptModal` opens automatically with the exact tender & change stamped.

---

## 2. Denomination Generation Strategy

Philippine Peso (PHP) banknotes in circulation:
- ₱20, ₱50, ₱100, ₱200, ₱500, ₱1,000.

For a given `totalDue > 0`:
1. **Exact Amount**: Always include `totalDue` as the first quick option (e.g. "Exact ₱880.00").
2. **Next Standard Denominations**:
   - Calculate round milestones higher than `totalDue`:
   - E.g., for ₱880:
     - Next ₱100 boundary: ₱900 (or skip if near banknote)
     - Next standard banknote: ₱1,000
     - Next common bill combination: ₱1,500 (₱1,000 + ₱500)
     - Next banknote multiple: ₱2,000 (2 × ₱1,000)
3. Algorithm:
   ```typescript
   export function generateQuickDenominations(totalDue: number): number[] {
     if (totalDue <= 0) return [0];
     const roundedTotal = Math.round(totalDue * 100) / 100;
     const suggestions = new Set<number>();
     suggestions.add(roundedTotal); // Exact

     // Standard banknotes and multiples
     const candidates = [
       Math.ceil(roundedTotal / 50) * 50,
       Math.ceil(roundedTotal / 100) * 100,
       Math.ceil(roundedTotal / 500) * 500,
       Math.ceil(roundedTotal / 1000) * 1000,
       Math.ceil(roundedTotal / 1000) * 1000 + 500,
       Math.ceil(roundedTotal / 1000) * 1000 + 1000
     ];

     for (const amt of candidates) {
       if (amt >= roundedTotal && suggestions.size < 4) {
         suggestions.add(amt);
       }
     }

     return Array.from(suggestions).sort((a, b) => a - b);
   }
   ```
   For ₱880:
   - `suggestions` will produce: `[880, 1000, 1500, 2000]`.
   Matches Scenario 1 in SIAA-21: `Exact ₱880, ₱1,000, ₱1,500, ₱2,000`!

---

## 3. Mathematical Invariants & Precision

Floating point precision issues (e.g., `1000 - 880 = 120.00000000000001` or `880 - 500 = 380`) must be guarded using:
```typescript
function roundMoney(val: number): number {
  return Math.round((val + Number.EPSILON) * 100) / 100;
}
```
- When `cashTendered < totalDue`:
  - `isValid = false`
  - `shortage = roundMoney(totalDue - cashTendered)`
  - `changeDue = 0`
- When `cashTendered >= totalDue`:
  - `isValid = true`
  - `shortage = 0`
  - `changeDue = roundMoney(cashTendered - totalDue)`

---

## 4. Design Token Audit & Compliance

All elements strictly use tokens from `app/globals.css`:
- Background / Cards: `bg-bg-surface`, `bg-bg-base`, `border-border`
- Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`
- Positive state (Change Due): `bg-success-light`, `text-success`, `border-success/30`
- Negative state (Shortage): `bg-danger-light`, `text-danger`, `border-danger/30`
- Action buttons: `bg-primary`, `hover:bg-primary-hover`, `text-text-light`
- Inactive / Disabled: `bg-bg-muted`, `text-text-muted`, `border-border-subtle`
- Denomination chips: `bg-bg-base`, `hover:bg-bg-hover`, `border-border`, `text-text-primary`, active `bg-primary text-text-light`
