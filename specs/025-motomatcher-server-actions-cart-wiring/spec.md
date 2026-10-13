# Feature Specification: MotoMatcher Server Actions, Client Cache Invalidation & 1-Click Fast-Lane Cart Wiring

**Feature Branch**: `feat/SIAA-58-motomatcher-server-actions-cart-wiring`  
**Created**: 2026-10-14  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-58](https://the-three-devsketeers.atlassian.net/browse/SIAA-58) (STORY-4.9)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts retail and repair shops, counter cashiers and service advisors need to locate compatible parts and dispatch them directly into active sales transactions without friction. Transitioning between compatibility lookup views and the Fast-Lane POS cart often wastes valuable seconds if cashiers have to manually copy SKUs, re-search inventory, or wait for sluggish round-trips.

While the Supabase database schema (SIAA-53) and matrix search RPC (SIAA-54) establish the underlying compatibility engine, this feature delivers the complete end-to-end integration layer:
1. **Type-Safe Next.js Server Actions Suite**: Exposes robust, cached Next.js Server Actions (`getMotorcycleModelsAction`, `getFitmentMatrixAction`, `addFitmentRuleAction`) with sub-100ms client caching and deterministic offline mock fallbacks.
2. **Server Cache Invalidation**: Employs Next.js tag-based cache revalidation (`revalidateTag('motomatcher-matrix')`, `revalidateTag('motomatcher-models')`) upon administrative fitment rule mutations.
3. **1-Click Fast-Lane POS Cart Dispatch**: Enables direct 1-click addition of any matched OEM or Aftermarket part into `lib/store/cart-store.ts` (`useCartStore.getState().addItem(item)`), accompanied by instant toast feedback detailing shelf locator coordinates and immediate topbar cart badge increments.
4. **Out-of-Stock Guard**: Enforces strict stock validation disabling cart insertion and showing "Out of Stock" badges whenever part inventory drops to 0 or below.
5. **Full UI Wiring**: Replaces static fixtures across the Admin Portal (`app/admin/motomatcher/`) and Staff Terminal (`app/staff/compat/page.tsx`) with dynamic, reactive server action feeds.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### User Story 1 - Type-Safe Server Actions & High-Speed Caching (Priority: P1)

* **As a** Fast-Lane Cashier or Shop Floor Advisor,
* **I want** type-safe Next.js Server Actions with sub-100ms caching,
* **so that** motorcycle model catalogs and fitment matrices load instantly with zero UI stutter.

#### Scenario 1: Cached Motorcycle Models Retrieval
* **Given** a Next.js App Router client,
* **When** calling `getMotorcycleModelsAction()` from `lib/motomatcher/actions.ts`,
* **Then** it returns the validated list of motorcycle models,
* **And** caches the result via Next.js `unstable_cache` with tag `['motomatcher-models']` and revalidation window.

#### Scenario 2: Partitioned Matrix Retrieval
* **Given** a valid motorcycle model ID (e.g. Yamaha NMAX 155),
* **When** calling `getFitmentMatrixAction(modelId, category, query)`,
* **Then** it returns `{ success: true, data: { oem_parts: [...], aftermarket_parts: [...] } }`,
* **And** ensures all records adhere to the validated Zod schema with calculated upsell price deltas.

---

### User Story 2 - Admin Fitment Rule Management & Invalidation (Priority: P2)

* **As an** authenticated Shop Admin,
* **I want to** submit new motorcycle-to-part compatibility rules,
* **so that** the catalog expands dynamically and server caches invalidate immediately.

#### Scenario 3: Admin Fitment Rule Persistence & Tag Revalidation
* **Given** an authenticated Shop Admin on `/admin/motomatcher`,
* **When** submitting a new mapping via `addFitmentRuleAction({ productId, modelId, fitmentType, yearRange, notes })`,
* **Then** the record is created in Supabase (or mock state),
* **And** `revalidateTag('motomatcher-matrix')` invalidates the server cache,
* **And** subsequent matrix queries reflect the updated compatibility mapping.

---

### User Story 3 - 1-Click Fast-Lane POS Cart Dispatch (Priority: P1)

* **As a** Counter Cashier or Shop Floor Advisor viewing the MotoMatcher matrix,
* **I want to** click "+ Add to Active POS Cart" on any matched part card,
* **so that** the item is dispatched into the active checkout queue instantly with toast feedback and shelf locator badges.

#### Scenario 4: Instant Cart Dispatch & Toast Feedback
* **Given** a user viewing the MotoMatcher matrix on Admin (`/admin/motomatcher`) or Staff (`/staff/compat`),
* **When** clicking `+ Add to Active POS Cart` on an aftermarket part (e.g. `RCB-NMAX-BP02`),
* **Then** the item is dispatched to `lib/store/cart-store.ts` via `useCartStore.getState().addItem(item)` in < 50ms,
* **And** a toast notification displays: `"Added RCB S-Series Ceramic Brake Pads to POS Cart (Shelf: Rack A-01 / Shelf 3)"`,
* **And** the POS cart count badge updates in the top navigation bar without leaving the MotoMatcher view.

---

### User Story 4 - Out-of-Stock Guard & Inventory Safety (Priority: P2)

* **As a** Cashier,
* **I want** parts with zero stock to be clearly disabled,
* **so that** out-of-stock items cannot be added to an active checkout cart.

#### Scenario 5: Out-of-Stock Button State & Action Guard
* **Given** a motorcycle part with `stock_level <= 0`,
* **When** rendered in the MotoMatcher comparison card,
* **Then** the add button is disabled with text `Out of Stock`,
* **And** action dispatch to `cartStore` is prevented.

---

## 3. Business Invariants & Rules

1. **Sub-50ms UI Latency**: Client cart insertion must happen locally in memory via `useCartStore.getState().addItem()` before/without network waterfalls.
2. **Deterministic Fallback Invariant**: When Supabase is unreachable or unconfigured, server actions must fall back gracefully to the mock engine without throwing unhandled exceptions.
3. **Zero Hardcoded Colors**: All UI elements (cards, buttons, toast banners, shelf badges) must strictly use SWIFT semantic tokens (`bg-primary`, `border-border`, `text-text-primary`, `bg-bg-surface`, `text-success`, `bg-danger-light`).
4. **Physical Shelf Visibility**: Cart dispatch toast messages and part cards must always prominently surface the physical shelf coordinate (`shelf_location`).

---

## 4. Functional Requirements

- **FR-001**: `getMotorcycleModelsAction` must support tag-based caching with `tags: ['motomatcher-models']`.
- **FR-002**: `getFitmentMatrixAction` must return a standardized `{ success: boolean; data: MotoMatcherMatrixResult; error?: string }` response.
- **FR-003**: `addFitmentRuleAction` must validate payload, persist to Supabase or fallback store, and execute `revalidateTag('motomatcher-matrix')`.
- **FR-004**: `cartStore` and `useCartStore` must expose `addItem(item, qty)` supporting `MotoMatcherMatrixPart` alongside `Product` and `CartItem`.
- **FR-005**: `AdminMotoMatcherClient` and `StaffCompatPage` must feature "+ Add to Active POS Cart" action buttons that invoke `addItem` with shelf-aware toast alerts.
- **FR-006**: Out-of-stock parts must render disabled with "Out of Stock" labels.
