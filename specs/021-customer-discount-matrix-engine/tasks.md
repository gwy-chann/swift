# Implementation Tasks: Customer Discount Matrix Engine

**Feature**: Customer Discount Matrix Engine (Senior, PWD & VIP) & Subtotal Computation  
**Branch**: `feat/SIAA-20-customer-discount-matrix-engine`  
**Date**: 2026-10-12  

---

## Task Checklist & Execution Order

- [x] **Task 1: Database Migration for Extended Discount Types**
  - Path: `supabase/migrations/20261014020000_customer_discount_matrix.sql`
  - Scope: Expand check constraint on `public.transactions.discount_type` to allow `'none'`, `'senior'`, `'pwd'`, `'vip'`, `'fleet'`, `'senior_pwd'`.
  - Atomic Commit: `feat(db): [SIAA-20] expand transactions discount_type check constraint to include fleet and senior_pwd`

- [x] **Task 2: Discount Matrix Contracts & Domain Models**
  - Paths: `lib/pos/discount-matrix.ts`, `lib/types/cart.ts`, `lib/types/transaction.ts`
  - Scope: Define `DISCOUNT_TIERS`, `DiscountTier`, `DiscountTierId`, schemas, and update `CartTotals` / `CartStoreState` / `Transaction`.
  - Atomic Commit: `feat(pos): [SIAA-20] define discount matrix domain models contracts and calculation helpers`

- [x] **Task 3: Cart Store Discount State Machine & Unit Tests (TDD)**
  - Paths: `lib/store/cart-store.ts`, `lib/pos/__tests__/discount-matrix.test.ts`
  - Scope: Implement `setDiscountTier`, mutual exclusivity, toggle-off logic, subtotal recomputation, and comprehensive unit tests.
  - Atomic Commit: `feat(pos): [SIAA-20] implement cart store discount matrix engine with test suite`

- [x] **Task 4: POS Hybrid Cart Pane Discount Chips UI with Semantic Tokens**
  - Path: `components/pos/hybrid-cart-pane.tsx`
  - Scope: Render standardized discount chips (`0% Standard`, `5% Fleet`, `10% VIP`, `20% SC/PWD`) styled with SWIFT semantic design tokens (`border-accent`, `bg-accent-light`, `text-accent`) matching `../mockup/style.css`.
  - Atomic Commit: `feat(pos): [SIAA-20] render interactive discount chips in pos hybrid cart pane with semantic tokens`

- [x] **Task 5: Final Verification, Task Completion & Knowledge Graph Sync**
  - Scope: Execute `npm run test`, `npm run lint`, mark tasks completed, and synchronize AST map.
  - Atomic Commit: `docs(specs): [SIAA-20] mark all implementation and verification tasks complete`
