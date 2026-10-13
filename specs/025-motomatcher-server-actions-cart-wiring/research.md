# Technical Research & Architecture Decisions: MotoMatcher Server Actions & Cart Wiring

**Feature**: `025-motomatcher-server-actions-cart-wiring`  
**Ticket**: [SIAA-58](https://the-three-devsketeers.atlassian.net/browse/SIAA-58)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4)  

---

## 1. Technical Context & Constraints

- **Framework**: Next.js App Router (v16.3.8) with React 19 (`useSyncExternalStore`, Client Components, Server Actions `'use server'`).
- **Database & RPC**: Supabase PostgreSQL with `get_moto_matcher_matrix` stored procedure and `part_fitment_rules` table.
- **Styling**: Tailwind CSS v4 with SWIFT Semantic Tokens (`app/globals.css`, `lib/tokens.ts`).
- **State Store**: Reactive external store `cartStore` (`lib/store/cart-store.ts`) powering Fast-Lane POS.

---

## 2. Architectural Decisions & Trade-offs

### Decision 1: Server Actions Caching via Next.js `unstable_cache`
- **Context**: Motorcycle platform models rarely change during a shift, while compatibility queries for a given model and filter can be repeated frequently.
- **Choice**: Wrap model retrieval in `unstable_cache` with tag `['motomatcher-models']` and 3600s revalidation TTL. For `addFitmentRuleAction`, invoke `revalidateTag('motomatcher-matrix')` and `revalidateTag('motomatcher-models')`.
- **Fallback**: Provide safe graceful degradation when `next/cache` is executed in non-Next runtime environments (e.g. Node.js unit tests).

### Decision 2: Envelope Standardization for `getFitmentMatrixAction`
- **Context**: The Jira acceptance criteria dictates:
  `calling getFitmentMatrixAction(modelId, category, query) returns { success: true, data: { oem_parts: [...], aftermarket_parts: [...] } }`.
- **Choice**: Standardize `getFitmentMatrixAction` to return:
  ```ts
  export interface FitmentMatrixActionResult {
    success: boolean;
    data: MotoMatcherMatrixResult;
    error?: string;
  }
  ```
  While retaining helper/fallback accessors so existing consumers transition smoothly.

### Decision 3: Direct In-Memory Cart Store Dispatch (`addItem`)
- **Context**: Cashiers expect instantaneous (< 50ms) dispatch when clicking "+ Add to Active POS Cart".
- **Choice**: Extend `cartStore` with `addItem(item: Product | MotoMatcherMatrixPart | CartItem, qty = 1)` and bind `useCartStore.getState = cartStore.getState`.
- **Stock Guard**: If `item.stock_level <= 0` or `item.stock <= 0`, immediately reject insertion with `{ success: false, reason: 'out_of_stock' }`.

### Decision 4: Toast Feedback & Shelf Locator Presentation
- **Context**: Cashiers need immediate confirmation of the shelf location (e.g., `"Shelf: Rack A-01 / Shelf 3"`) so stock runners can retrieve physical parts while POS continues ringing up.
- **Choice**: Integrate a lightweight, accessible toast notification queue into the MotoMatcher views with auto-dismiss (3500ms) and manual close.
