# Implementation Plan: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine

**Feature**: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine  
**Jira Issue**: [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18) (STORY-3.1)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3)  
**Date**: 2026-10-11  

---

## 1. Architectural Overview & Boundary Mapping

This feature implements the unified Hybrid POS Cart & Line-Item Engine powering both Staff Fast-Lane POS (`/staff/pos`) and Admin POS Cashier (`/admin/pos`).

### Component Hierarchy:
```
lib/store/cart-store.ts (Central Reactive State Engine via useSyncExternalStore)
 ├── CartItem = PartCartItem | ServiceCartItem
 ├── Pure Math Subtotal / Totals Reducer (<50ms)
 └── Out-of-Stock Guard & Manager Override Handlers

components/pos/
 ├── hybrid-cart-pane.tsx (Unified Active Ticket / Cart Side Pane)
 │    ├── Ticket Header with #TX Counter & Retail/Wholesale Switcher
 │    ├── Cart Line Items List (Part Item Card with Stock & Location vs. Service Item Card with Bay & Duration)
 │    ├── Quantity Stepper (+ / - / direct) & Item Removal (✕ / trash)
 │    ├── Subtotal & Discount Rate Selector (0%, 5%, 20%)
 │    └── Total Due Banner & Complete Sale Button (F12)
 └── hybrid-catalog-pane.tsx (Fast Catalog with Search, Category Filter Tabs & Dual-Type Item Grid)

app/staff/pos/page.tsx (Staff Fast-Lane Checkout View)
app/admin/pos/page.tsx (Admin Hybrid Billing Cashier View)
```

---

## 2. Phased Implementation Roadmap

### Phase 1: Store & Type Refinements
1. **Extend Types (`lib/types/cart.ts`)**:
   - `PartCartItem`: add `stock?: number`, `minThreshold?: number`, `isOverridden?: boolean`.
   - `ServiceCartItem`: add `duration?: string`.
2. **Enhance `cartStore` (`lib/store/cart-store.ts`)**:
   - Enhance `addPart(product, qty, isOverridden)`: check stock limit; reject if stock <= 0 unless overridden.
   - Enhance `addService(service, qty)`: ensure bay and duration are populated.
   - Support `updateQuantity(id, qty, isOverridden)` with stock limit checks for parts.
   - Ensure `removeItem` and `clearCart` recalculate totals synchronously in $< 50\text{ms}$.
3. **Automated Unit Tests**:
   - Create `lib/store/__tests__/hybrid-cart-store.test.ts` verifying all 4 acceptance scenarios.

### Phase 2: Hybrid Cart UI Component
1. Implement `components/pos/hybrid-cart-pane.tsx`:
   - Visual badges: distinct styling for physical parts (SKU, Rack/Shelf location, Low/Out-of-Stock) vs. workshop services (Workshop Service badge, repair bay, duration).
   - Instant response quantity controls and remove buttons.
   - Dual-tier pricing toggle (Retail vs. Wholesale) affecting parts.
   - Discount selector (0% Standard, 5% VIP, 20% SC/PWD).
   - Checkout execution integration with inventory stock deduction.
2. Ensure strict adherence to SWIFT Design Tokens (`app/globals.css`, `lib/tokens.ts`).

### Phase 3: Integration into Staff and Admin Portals
1. Refactor `app/staff/pos/page.tsx`:
   - Replace inline local cart `useState` with `useCartStore()`.
   - Use `hybrid-cart-pane.tsx` and integrate `ManagerOverrideModal`.
2. Implement `app/admin/pos/page.tsx`:
   - Replace placeholder with full-featured Hybrid POS Cashier terminal.
   - Mirror Fast-Lane layout with shared catalog and hybrid cart pane.

### Phase 4: Verification, Lint & Atomic Commits
1. Run `npm test` to verify all store, mapper, and UI tests pass.
2. Run `npm run typecheck` (`tsc --noEmit`) and `npm run lint`.
3. Auto-sync Graphify knowledge graph (`graphify-auto-sync`).
4. Commit following the `atomic-commit` architectural layers standard.
