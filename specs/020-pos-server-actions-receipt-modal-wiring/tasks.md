# Implementation Tasks: POS Server Actions, Receipt Persistence & Thermal Modal UI Wiring

**Feature**: `020-pos-server-actions-receipt-modal-wiring`  
**Jira Ticket**: [SIAA-52](https://the-three-devsketeers.atlassian.net/browse/SIAA-52)  
**Branch**: `feat/SIAA-52-pos-server-actions-receipt-modal-wiring`  

---

## Phase 1: Contracts & Shared Types
- [x] **TASK-52.1**: Define `ThermalReceiptData`, `ThermalReceiptItem`, and `ThermalRollWidth` in `lib/pos/contracts.ts` and ensure Zod validation parity with `receipt-modal.contract.ts`.

## Phase 2: Server Action Revalidation & Transaction Lookup
- [x] **TASK-52.2**: Update `processCheckoutAction` in `lib/pos/actions.ts` to execute Next.js cache revalidation (`revalidateTag('pos-cart')`, `revalidateTag('inventory-catalog')`, `revalidatePath('/admin')`).
- [x] **TASK-52.3**: Update `getTransactionByReceiptAction` in `lib/pos/transaction-actions.ts` to return normalized `ThermalReceiptData` (supporting canonical receipt `TX-1041`).

## Phase 3: Cart Store Async Checkout & State Management
- [x] **TASK-52.4**: Upgrade `CartStore.checkout` in `lib/store/cart-store.ts` to an async method that calls `processCheckoutAction`, preserves cart on error, clears cart on success, and sets `activeReceiptData` / `isReceiptModalOpen`.
- [x] **TASK-52.5**: Add modal controls `openReceiptModal` and `closeReceiptModal` to `cartStore` and expose via `useCartStore`.

## Phase 4: Thermal Receipt Modal Component
- [x] **TASK-52.6**: Create `components/pos/thermal-receipt-modal.tsx` with:
  - 58mm / 80mm roll width toggle
  - High-contrast monochromatic paper styling using SWIFT design tokens (`bg-bg-surface`, `text-text-primary`, `border-border`)
  - Itemized physical parts (with shelf locator badge) and workshop services (with bay and duration)
  - Subtotal, discount breakdown, total due, cash tendered, change due
  - `@media print` thermal printing styles and Print Receipt button invoking `window.print()`
  - Close button and keyboard Esc / backdrop dismiss

## Phase 5: Terminal & Admin Realtime UI Wiring
- [x] **TASK-52.7**: Wire `<ThermalReceiptModal>` into `app/staff/pos/page.tsx` and `app/admin/pos/page.tsx`, binding to `useCartStore` checkout completion.
- [x] **TASK-52.8**: Implement `components/admin/realtime-revenue-tracker.tsx` (or update `app/admin/page.tsx`) with Supabase Realtime channel on `transactions` to increment Gross Revenue live without page reload.

## Phase 6: Automated Testing & Verification
- [x] **TASK-52.9**: Write unit test `lib/store/__tests__/cart-store-checkout.test.ts` verifying async checkout, cart clearance, and error handling.
- [x] **TASK-52.10**: Write component test `components/pos/__tests__/thermal-receipt-modal.test.tsx` verifying 58mm/80mm toggle, line items, and print triggering.
- [x] **TASK-52.11**: Write test `lib/pos/__tests__/checkout-revalidation.test.ts` verifying cache tag revalidations and receipt lookup for `TX-1041`.
- [x] **TASK-52.12**: Run `npm run typecheck`, `npm run lint`, and `npm test` inside `.worktrees/SIAA-52`.

## Phase 7: Atomic Commits & Pull Request
- [x] **TASK-52.13**: Apply atomic commits according to `.agents/rules/atomic-commit.md`.
- [x] **TASK-52.14**: Trigger Graphify auto-sync and synthesize Pull Request via `gh pr create`.
