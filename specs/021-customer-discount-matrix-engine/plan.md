# Technical Implementation Plan: Customer Discount Matrix Engine

**Feature**: Customer Discount Matrix Engine (Senior, PWD & VIP) & Subtotal Computation  
**Branch**: `feat/SIAA-20-customer-discount-matrix-engine`  
**Date**: 2026-10-12  

---

## 1. Boundary & Component Mapping

| Layer / Component | File | Responsibilities |
| :--- | :--- | :--- |
| **Contracts & Models** | `lib/pos/discount-matrix.ts`<br>`lib/types/cart.ts`<br>`lib/types/transaction.ts` | Define `DiscountTier`, `DiscountTierId`, constants, validation schemas, and update `CartTotals` / `CartStoreState`. |
| **Database Migration** | `supabase/migrations/20261014020000_customer_discount_matrix.sql` | Expand `public.transactions.discount_type` check constraint to include `'fleet'` and `'senior_pwd'`. |
| **State Engine** | `lib/store/cart-store.ts` | Add `discountType` to `CartStoreState`, add `setDiscountTier(tierId)` with mutual exclusivity and toggle-off logic, ensure synchronous total recomputation. |
| **POS UI Component** | `components/pos/hybrid-cart-pane.tsx` | Render four interactive chips (`0% Standard`, `5% Fleet`, `10% VIP`, `20% SC/PWD`) with SWIFT semantic design tokens (`border-accent`, `bg-accent-light`, `text-accent`) matching `../mockup/style.css`. |
| **Automated Tests** | `lib/pos/__tests__/discount-matrix.test.ts` | Test subtotal calculation, discount amounts, rounding precision, mutual exclusivity, toggle resetting, and transaction stamping. |

---

## 2. Technical Decisions & Invariant Checks

1. **Mutual Exclusivity Logic**:
   - Calling `setDiscountTier(tierId)`:
     - If `tierId === this.state.discountType` or `tierId === 'none'`, set `discountRate = 0`, `discountType = 'none'`.
     - Otherwise, set `discountRate = tier.rate`, `discountType = tier.id`.
2. **Design Tokens**:
   - Active: `border-accent text-accent bg-accent-light`
   - Inactive: `border-border text-text-secondary bg-bg-base hover:bg-bg-hover hover:text-text-primary`
   - Discount amount: `text-danger font-mono font-bold`
   - Total due: `text-success font-mono font-black text-lg`
3. **Transaction Persistence**:
   - `cartStore.checkout()` stamps `discountType` and `discountRate`.
   - `processCheckoutAction` safely passes `discount_type: payload.discountType`.
