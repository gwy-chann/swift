# Implementation Tasks: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine

**Feature**: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine  
**Jira Issue**: [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18) (STORY-3.1)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3)  
**Status**: Completed  

---

## Phase 1: Setup & Domain Model Contracts

- [x] **Task 1.1**: Define validation contracts and schemas in `specs/017-hybrid-pos-cart-labor-line-item-engine/contracts/cart-contracts.ts`.
- [x] **Task 1.2**: Extend `lib/types/cart.ts` to include `stock`, `minThreshold`, and `isOverridden` on `PartCartItem`, and `duration` on `ServiceCartItem`.

## Phase 2: Domain Logic & Cart Store Engine (TDD)

- [x] **Task 2.1**: Write automated unit tests in `lib/store/__tests__/hybrid-cart-store.test.ts` verifying:
  - Scenario 1: Adding physical parts (creates `PartCartItem`, increments quantity on subsequent additions).
  - Scenario 2: Adding workshop labor services (creates `ServiceCartItem`, sets flat rate, bay, duration, distinct type).
  - Scenario 3: Steppers (`+` / `-`), removal on zero qty, and subtotal updates in <50ms.
  - Scenario 4: Physical part stock check, out-of-stock guard, and manager override bypass.
  - Dual-tier pricing toggle recalculating parts without altering service rates.
- [x] **Task 2.2**: Update `lib/store/cart-store.ts` to implement:
  - `addPart(product, qty, isOverridden)` with stock checking logic.
  - `addService(service, qty)` with service code, bay, duration, and flat rate.
  - `updateQuantity(id, qty, isOverridden)` with stock bounds validation for physical parts.
  - Instant pure recalculation of `subtotal`, `discountAmount`, `total`, and `itemCount`.

## Phase 3: Hybrid POS Cart UI Component

- [x] **Task 3.1**: Create `components/pos/hybrid-cart-pane.tsx` with:
  - Unified line item renderer distinguishing physical parts (SKU, Rack/Shelf location, stock warnings) and labor services (Workshop Service badge, repair bay, duration).
  - Synchronous quantity stepper buttons (`+` / `-`) and item removal (`✕` / trash) with full keyboard accessibility.
  - Pricing mode selector (Retail vs. Wholesale) and discount selector (0%, 5%, 20%).
  - Total due calculation display and checkout action button.
  - Strict compliance with SWIFT design tokens (`app/globals.css`, `lib/tokens.ts`).

## Phase 4: Portal Integration (`/staff/pos` and `/admin/pos`)

- [x] **Task 4.1**: Refactor `/staff/pos` (`app/staff/pos/page.tsx`) to:
  - Connect to the centralized `useCartStore`.
  - Embed `HybridCartPane`.
  - Wire `ManagerOverrideModal` with `addPart` override callback.
- [x] **Task 4.2**: Implement `/admin/pos` (`app/admin/pos/page.tsx`) replacing placeholder with the full Hybrid POS Cashier terminal:
  - Fast-lane catalog search and category filtering.
  - Shared `useCartStore` and `HybridCartPane`.
  - Full checkout and manager override integration.

## Phase 5: Verification, Convergence & Atomic Commits

- [x] **Task 5.1**: Execute automated test suite (`npm test`).
- [x] **Task 5.2**: Execute static verification: TypeScript verification (`npx tsc --noEmit`) and ESLint (`npm run lint`).
- [x] **Task 5.3**: Perform Graphify auto-sync (`graphify . --update`) and review constitutional adherence.
- [x] **Task 5.4**: Create atomic commits following `.agents/rules/atomic-commit.md`.
