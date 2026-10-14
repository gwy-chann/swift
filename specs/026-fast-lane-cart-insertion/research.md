# Research & Technical Decisions: 1-Click Fast-Lane POS Cart Insertion & Live Upsell Dispatch

**Feature**: `026-fast-lane-cart-insertion`  
**Ticket**: [SIAA-25](https://the-three-devsketeers.atlassian.net/browse/SIAA-25) (STORY-4.3)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (Smart MotoMatcher)  

---

## 1. Real-Time Cart State Synchronization (< 50ms)

### Problem Statement
When a counter clerk clicks "+ Add to Active POS Cart" from the MotoMatcher screen (`/staff/compat` or `/admin/motomatcher`), the application must append the item to the active POS cart and reflect the change across navigation headers and sidebars instantly (< 50ms) without page reloads, tab navigation, or network latency delays.

### Decision
Utilize the centralized, in-memory `cartStore` (`lib/store/cart-store.ts`) powered by React 19's `useSyncExternalStore`.
- **Latency**: Direct in-memory state transition executes synchronously in < 1ms, far exceeding the < 50ms requirement.
- **Cross-Component Reactivity**: All components subscribed via `useCartStore()` (sidebar, topbar, mobile drawer, cart pane) receive synchronous rerender notifications immediately via subscriber callbacks.
- **Intra-Portal Persistence**: In-memory singleton state survives client-side route transitions (e.g., navigating from `/staff/compat` to `/staff/pos`).

### Alternatives Considered
- *Local Component State*: Fails cross-page persistence; switching routes loses items queued from MotoMatcher.
- *Browser Storage (localStorage / sessionStorage) Event Listeners*: Adds serialization overhead (JSON stringify/parse) and cross-tab event latency (typically 10-25ms), unnecessary for single-terminal active checkout sessions.
- *Server Database Round-Trip on Every Click*: Adds network round-trip time (50-200ms) and introduces unnecessary database write contention prior to checkout finalization.

---

## 2. Cart Badge Counter Integration in Staff & Admin Navigation

### Problem Statement
Acceptance Criteria Scenario 2 mandates:
> "Cart Badge Counter Synchronization: Header/sidebar POS Cart badge count increments in real-time (< 50ms) without requiring navigation to the POS tab."
Currently, `StaffSidebar` renders static badges defined in `STAFF_NAV_ITEMS`. The "Fast-Lane POS" item does not indicate the active item count.

### Decision
1. **Dynamic Navigation Item Resolution**:
   - `StaffSidebar` and `StaffMobileDrawer` subscribe to `useCartStore((state) => state.totals.itemCount)`.
   - For `item.id === 'pos'`, dynamically attach a badge:
     ```ts
     const dynamicBadge = item.id === 'pos' && cartItemCount > 0
       ? { text: String(cartItemCount), variant: 'primary' as const }
       : item.badge;
     ```
2. **Staff Topbar Quick Access Cart Indicator**:
   - Add a subtle, accessible Cart Quick-Access Link in `StaffTopbar` (`components/staff/staff-topbar.tsx`):
     - Displays shopping bag/cart icon with live item count badge when `itemCount > 0`.
     - Links directly to `/staff/pos`.
     - Uses semantic tokens (`bg-primary-light text-primary border-primary-border`).

---

## 3. Out-of-Stock Prevention & Stock Limit Safeguards

### Problem Statement
Scenario 3 & Scenario 4 require:
1. Matched parts with 0 stock must have their add button disabled and display "Out of Stock".
2. If already in cart and quantity reaches total available stock, further additions must be prevented with a clear alert.
3. Subsequent additions increment existing line item quantity (Q + 1) rather than creating duplicate lines.

### Decision
- **Matrix Card Presentation**:
  - `ComparisonMatrix` checks `part.stockLevel <= 0`. When true, the button is disabled with text "Out of Stock", cursor `not-allowed`, and opacity `0.5`.
- **Store-Level Guard**:
  - `cartStore.addItem` verifies:
    - If `product.stock <= 0` and not overridden: returns `{ success: false, reason: 'out_of_stock' }`.
    - If `targetQty > product.stock` and not overridden: returns `{ success: false, reason: 'exceeds_stock' }`.
    - If valid: increments existing line item `qty` or creates new line item, recalculating subtotals and discounts.
- **Standardized Dispatch Helper**:
  - Implement `dispatchMotoMatcherCartInsertion` in `lib/motomatcher/cart-dispatch.ts`:
    - Handles part normalization (`ComparisonPartItem` -> `Product` or `MotoMatcherMatrixPart`).
    - Calls `cartStore.addItem(product)`.
    - Returns standardized feedback object `{ success: boolean, message: string, lineItemQty: number }`.
    - Emits appropriate toast messages:
      - Success: `"Added [Part Name] to POS Cart! (Qty: [N])"`
      - Stock Limit: `"Cannot add more: Available stock limit reached for [Part Name]"`
      - Out of Stock: `"[Part Name] is currently out of stock"`

---

## 4. Design Token Compliance & Micro-Interactions

### Problem Statement
The SWIFT Constitution mandates strict adherence to semantic design tokens (`bg-primary`, `bg-secondary`, `bg-bg-surface`, etc.) and zero hardcoded colors.

### Decision
- **Add-to-Cart Button States**:
  - Default OEM: `bg-primary text-white hover:bg-primary-hover shadow-xs`
  - Default Aftermarket: `bg-secondary text-white hover:bg-secondary-hover shadow-xs`
  - Added State (1.8s feedback): `bg-success text-white` with `Check` icon.
  - Disabled / Out-of-Stock: `bg-bg-muted text-text-muted border border-border cursor-not-allowed opacity-50`
- **Toast Notification**:
  - Surface: `bg-bg-surface text-text-primary border border-border shadow-lg rounded-xl`
  - Icon: `bg-success-light text-success`
  - Accessible via ARIA live region `role="status"` and `aria-live="polite"`.
- **Cart Badge**:
  - In navigation: `bg-primary text-white text-[10px] font-bold px-1.5 py-0.5 rounded`
