# Technical Research & Architecture Decisions: POS Server Actions, Receipt Persistence & Thermal Modal UI Wiring

**Feature**: `020-pos-server-actions-receipt-modal-wiring`  
**Jira Ticket**: [SIAA-52](https://the-three-devsketeers.atlassian.net/browse/SIAA-52)  
**Date**: 2026-10-11  

---

## 1. Technical Architecture & Component Boundaries

### 1.1 Cart Store Evolution (`lib/store/cart-store.ts`)
- **Current State**: `CartStore.checkout()` is synchronous, generates local randomized `id: TX-XXXX`, directly mutates `inventoryStore.decrementStock`, and clears items synchronously.
- **Target Architecture**:
  - `CartStore.checkoutAsync(params)` (or asynchronous `checkout`) invokes `processCheckoutAction(payload)`.
  - Maps active cart items (`type === 'part'` vs `type === 'service'`) to `CheckoutPayload.items`.
  - On `result.success`:
    - Persists `lastTransaction` record or receipt number.
    - Clears active cart items and resets discount.
    - Sets `isReceiptModalOpen: true` and `activeReceiptNumber: result.receiptNumber`.
    - Returns `{ success: true, receiptNumber, transactionId }`.
  - On error:
    - Retains cart contents so the cashier does not lose the customer's items.
    - Returns `{ success: false, error: result.error, code: result.code, sku: result.sku }`.
  - Exposes `openReceipt(receiptNumberOrData)` and `closeReceipt()` helper state methods for re-opening previous receipts.

### 1.2 Route & Cache Revalidation (`lib/pos/actions.ts`)
- Using `next/cache`:
  - `revalidateTag('pos-cart')`
  - `revalidateTag('inventory-catalog')`
  - `revalidatePath('/admin')`
  - `revalidatePath('/staff/pos')`
  - `revalidatePath('/admin/pos')`
- Executed on successful completion of `processCheckoutAction` in both Supabase RPC and offline/mock paths.

### 1.3 Thermal Receipt Modal Component (`components/pos/thermal-receipt-modal.tsx`)
- **Layout & Sizing**:
  - Roll width switch: `58mm` (compact, ~280px) vs `80mm` (standard, ~360px).
  - High-contrast monochromatic styling utilizing semantic tokens:
    - `bg-bg-surface text-text-primary border-border font-mono`
  - Header:
    - Store title: `SWIFT MOTO SERVICE`
    - Address: `104 Rizal Ave, Motor City`
    - Tax ID / TIN: `TIN: 409-281-992-000`
    - Tel: `(02) 8921-4450`
  - Metadata: Receipt #, Date/Time, Cashier name.
  - Line Items Table:
    - Header: `ITEM`, `QTY`, `AMOUNT`
    - Physical parts: item name, quantity, unit price, total price, shelf locator badge.
    - Labor services: service name, duration, service bay badge, total price.
  - Totals:
    - Subtotal, Discount amount (if discount applied), Total Due, Cash Tendered, Change Due, Payment Method.
  - Footer:
    - "Thank you for your business!"
    - "Parts warranty valid for 7 days with receipt."
    - "*** CUSTOMER COPY ***"
    - Simulated Code 128 / barcode pattern.
  - Print Media:
    - `@media print`: hides modal backdrop, buttons, topbar, sidebars, sets receipt paper to pure black text on white background with 0 margins for direct thermal receipt roll printing.

### 1.4 Realtime Admin Dashboard Subscription (`components/admin/realtime-revenue-tracker.tsx` / `app/admin/page.tsx`)
- Uses Supabase Realtime channel:
  ```ts
  const channel = supabase
    .channel('admin-pos-transactions')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'transactions' },
      (payload) => {
        // Increment today's gross revenue by payload.new.total_due
      }
    )
    .subscribe();
  ```
- Gracefully handles offline / disconnected environments without throwing errors.

---

## 2. Design Token Governance

- **Zero Hardcoded Colors Rule**:
  - No `#fff`, `#000`, `bg-gray-*`, `text-blue-*`.
  - Use `bg-bg-surface`, `bg-bg-base`, `text-text-primary`, `text-text-secondary`, `text-text-muted`, `border-border`.
  - Status indicators: `bg-success/10 text-success`, `bg-primary/10 text-primary`, `bg-accent/10 text-accent`.
  - Verified against `lib/tokens.ts` and `app/globals.css`.
