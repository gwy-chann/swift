# Technical Research & Architecture Decisions: Customer Discount Matrix Engine

**Feature**: Customer Discount Matrix Engine (Senior, PWD & VIP) & Subtotal Computation  
**Branch**: `feat/SIAA-20-customer-discount-matrix-engine`  
**Date**: 2026-10-12  

---

## 1. Context & Technical Problem Statement

In the SWIFT POS terminal (`components/pos/hybrid-cart-pane.tsx`), cashiers need to seamlessly apply statutory (Senior Citizen/PWD 20%) and loyalty (VIP 10%, Fleet 5%) discounts.

Technical considerations:
1. **Cart Store Reactive Architecture**: `lib/store/cart-store.ts` uses React's `useSyncExternalStore` for predictable, zero-lag in-memory state updates.
2. **Mutual Exclusivity**: Discount selection must be mutually exclusive. A single discount tier can be active at once.
3. **Audit Trail & Stamping**: The transaction contract (`lib/types/transaction.ts`), stored procedures (`process_pos_checkout_rpc`), and receipt modal need both `discount_rate` and `discount_type`.
4. **Database Check Constraints**: Existing Supabase migration `20261014000000_pos_transactions.sql` defined:
   `discount_type TEXT NULL CHECK (discount_type IS NULL OR discount_type IN ('none', 'senior', 'pwd', 'vip'))`.
   To support Fleet (5%) and unified Senior/PWD (20%), we evaluate either extending this check constraint via migration or mapping the UI discount IDs cleanly.

---

## 2. Architecture & Design Alternatives Evaluated

| Architecture Alternative | Pros | Cons | Decision |
| :--- | :--- | :--- | :--- |
| **Alternative A: Ad-hoc percentage input field** | Allows arbitrary numbers | High risk of cashier typo, slow checkout, prone to tax audit violations | ❌ Rejected |
| **Alternative B: Compound discount stacking** | Allows multiple discounts | Violates Philippine statutory discount rules and retail business practice (prevents margin loss) | ❌ Rejected |
| **Alternative C: Standardized Discount Chips & Unified Matrix Engine** | Instant single-tap, mutually exclusive, strictly audit-logged, aligns with `mockup/staff.html` and `mockup/app.js` | Requires explicit chip definitions and reactive state updates in `cartStore` | ✅ Selected |

---

## 3. Core Technical Decisions

### Decision 1: Discount Matrix Structure & Types
We define a canonical `DiscountTier` configuration matrix in `lib/pos/discount-matrix.ts` (and contracts):

```ts
export type DiscountTierId = 'none' | 'fleet' | 'vip' | 'senior_pwd';

export interface DiscountTier {
  id: DiscountTierId;
  label: string;
  shortLabel: string;
  rate: number; // 0.00, 0.05, 0.10, 0.20
  type: 'statutory' | 'commercial' | 'none';
  description: string;
}

export const DISCOUNT_TIERS: readonly DiscountTier[] = [
  { id: 'none', label: '0% Standard', shortLabel: '0%', rate: 0.00, type: 'none', description: 'Standard retail pricing without deductions' },
  { id: 'fleet', label: '5% Fleet', shortLabel: '5%', rate: 0.05, type: 'commercial', description: 'Commercial partner garage and fleet discount' },
  { id: 'vip', label: '10% VIP', shortLabel: '10%', rate: 0.10, type: 'commercial', description: 'VIP customer loyalty privilege' },
  { id: 'senior_pwd', label: '20% SC/PWD', shortLabel: '20%', rate: 0.20, type: 'statutory', description: 'Statutory 20% Senior Citizen and PWD discount' },
] as const;
```

### Decision 2: Reactive State Integration in `CartStore`
Extend `CartStoreState` to include `discountType: DiscountTierId`:
- Initial state: `discountRate: 0`, `discountType: 'none'`
- Method: `setDiscountTier(tierId: DiscountTierId)`:
  - If selecting the active tier or `'none'`, resets to `rate: 0`, `type: 'none'` (toggle off).
  - Otherwise, sets `discountRate: tier.rate`, `discountType: tier.id`.
- Recomputes `totals` synchronously:
  ```ts
  const subtotal = items.reduce((sum, item) => sum + item.price * item.qty, 0);
  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;
  const total = Math.max(0, subtotal - discountAmount);
  ```

### Decision 3: Database & RPC Compatibility Migration
Add a targeted migration `supabase/migrations/20261014020000_customer_discount_matrix.sql` to ensure the check constraint on `public.transactions.discount_type` permits `'none', 'senior', 'pwd', 'vip', 'fleet', 'senior_pwd'`, allowing seamless persistence without truncation or rejection.

### Decision 4: Semantic UI Tokens & Mockup Parity
In `components/pos/hybrid-cart-pane.tsx`:
- Render discount chips utilizing `.pos-discount-select` container.
- Use `border-accent text-accent bg-accent-light` for the active chip, faithfully matching `../mockup/style.css` lines 1112-1116 (`var(--accent)` and `var(--accent-light)`).
- Render inactive chips with `bg-bg-base text-text-secondary border-border hover:bg-bg-hover hover:text-text-primary`.
- Keyboard accessible via standard button semantics with `role="radio"` / `aria-checked`.
