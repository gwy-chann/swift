# Implementation Plan: MotoMatcher Server Actions, Invalidation & Cart Wiring

**Feature**: `025-motomatcher-server-actions-cart-wiring`  
**Ticket**: [SIAA-58](https://the-three-devsketeers.atlassian.net/browse/SIAA-58)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4)  

---

## 1. Architectural Blueprint & Boundaries

```mermaid
graph TD
    UI[MotoMatcher Views\n/admin/motomatcher & /staff/compat] -->|getMotorcycleModelsAction| MCActions[Server Actions\nlib/motomatcher/actions.ts]
    UI -->|getFitmentMatrixAction| MCActions
    UI -->|addFitmentRuleAction| MCActions
    MCActions -->|unstable_cache tags| Cache[Next.js Server Cache\n'motomatcher-models'\n'motomatcher-matrix']
    MCActions -->|RPC / Tables| SB[(Supabase DB / Fallback)]
    UI -->|1-Click '+ Add to Active POS Cart'| CartStore[Cart Store\nlib/store/cart-store.ts\nuseCartStore.getState().addItem]
    CartStore -->|Reactive Sync| NavBadge[Topbar Cart Count Badge]
    CartStore -->|Local Feedback| Toast[Shelf Locator Toast Banner]
```

---

## 2. Module Breakdown

### 2.1 Server Actions (`lib/motomatcher/actions.ts`)
- Cache `getMotorcycleModelsAction` with `unstable_cache` tag `['motomatcher-models']`.
- Return standardized `{ success: true, data: MotoMatcherMatrixResult }` from `getFitmentMatrixAction`.
- Implement `addFitmentRuleAction` accepting `AddFitmentRuleInput`, persisting mapping to Supabase (or fallback), and invoking `revalidateTag('motomatcher-matrix')`.

### 2.2 Cart Store (`lib/store/cart-store.ts`)
- Implement `addItem(item: Product | MotoMatcherMatrixPart | CartItem, qty?: number)` on `CartStore`.
- Map `MotoMatcherMatrixPart` fields (`retail_price`, `stock_level`, `shelf_location`) to `PartCartItem`.
- Guard against zero or negative stock.
- Bind `useCartStore.getState = cartStore.getState`.

### 2.3 UI Wiring
- **Admin Portal** (`app/admin/motomatcher/admin-motomatcher-client.tsx`):
  - Add "+ Add to Active POS Cart" on OEM and Aftermarket cards.
  - Disable with "Out of Stock" if `stock_level <= 0`.
  - Trigger toast: `"Added [name] to POS Cart (Shelf: [location])"`.
- **Staff Terminal** (`app/staff/compat/page.tsx`):
  - Wire dynamic models from `getMotorcycleModelsAction`.
  - Connect "+ Add to Active POS Cart" with shelf locator toast and out-of-stock guard.

### 2.4 Testing Strategy
- Unit test suite for Server Actions envelope, caching tags, and fallback in `lib/motomatcher/__tests__/server-actions.test.ts`.
- Unit test suite for Cart Store `addItem` with `MotoMatcherMatrixPart` and stock guards in `lib/store/__tests__/cart-store-motomatcher.test.ts`.
