# Feature Specification: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine

**Feature Branch**: `feat/SIAA-18-hybrid-pos-cart-labor-line-item-engine`  
**Created**: 2026-10-11  
**Status**: Specified & Validated  
**Jira Issue**: [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18) (STORY-3.1)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) (EPIC-3: Point of Sale (POS) & Hybrid Service Billing)  
**Input**: User request: `/speckit https://the-three-devsketeers.atlassian.net/browse/SIAA-18`

---

## 1. Executive Summary & Objective

In modern motorcycle service operations, customer repair tickets regularly combine physical spare parts (e.g., motor oil, spark plugs, drive belts, brake pads) with mechanical bay labor installation charges (e.g., oil change, CVT cleaning, brake fluid flushing). Traditionally, fragmented systems require split invoicing or manual line item workarounds.

This feature implements the **Hybrid POS Cart & Joint Line-Item Engine** for SWIFT, establishing:
1. **Unified Multi-Type Cart Architecture**: A single, reactive POS cart that holds and distinguishes physical inventory parts (`type: 'part'`) and workshop labor services (`type: 'service'`).
2. **Instant Item Operations**: Single-click or barcode-scanned addition, automatic quantity increments on repeat clicks, dynamic quantity adjustments (`+` / `-`), and line item removal with real-time subtotal calculation in under 50ms.
3. **Dedicated Service Line Item Attributes**: Labor line items clearly display workshop service code, designated service bay, estimated completion duration, and flat rate (₱) without decrementing physical inventory counts.
4. **Physical Out-of-Stock Protection & Manager Override**: Strict inventory guards preventing physical items with zero stock from entering the cart unless explicitly authorized via a Manager Override credential modal.
5. **Cross-Portal Cart Engine**: Shared reactive state management across both the Staff Fast-Lane POS (`/staff/pos`) and Admin POS Cashier (`/admin/pos`) terminals.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Adding Physical Motorcycle Part to Cart (Priority: P1)

* **As a** Cashier or Service Desk Advisor,
* **I want to** click or scan available motorcycle parts in the catalog,
* **so that** they are immediately added to the active transaction cart with SKU, name, unit price, and initial quantity of 1.

**Independent Test**: On POS interface, click a physical part card (e.g., `MOT-3100-10W40`). Verify cart contains the item with quantity 1. Click the same card again and verify quantity increments to 2.

**Acceptance Scenarios**:
1. **Given** the cashier is on the POS interface (`/staff/pos` or `/admin/pos`),
   **When** they click or scan an available in-stock part (e.g., `MOT-3100-10W40`),
   **Then** the item is added to the active cart with SKU, name, unit price, and quantity 1.
2. **Given** an existing physical part in the active cart,
   **When** the cashier clicks the part card in the catalog again,
   **Then** the existing line item quantity increments by 1 without creating a duplicate row.

---

### User Story 2 - Adding Repair Bay Labor Service to Cart (Priority: P1)

* **As a** Cashier or Service Desk Advisor,
* **I want to** select the "Services" category tab and add workshop labor items into the same transaction cart,
* **so that** labor installation charges are billed alongside replacement parts on one unified ticket.

**Independent Test**: Filter by "Services" tab, click `SRV-CVT-01` ("CVT Cleaning & Regreasing"). Verify it appears in the cart with a distinct workshop service badge, flat rate `₱350.00`, assigned bay ("Bay 2 / Scooter Bay"), and duration ("45 mins").

**Acceptance Scenarios**:
1. **Given** the cashier selects the "Services" category tab,
   **When** they click a workshop labor item (e.g., `SRV-CVT-01` "CVT Cleaning & Tuning"),
   **Then** the service is added to the active cart displaying its service code, assigned bay, estimated duration, and flat rate (₱).
2. **Given** a labor service line item in the cart,
   **When** reviewing the cart item list,
   **Then** it is visually flagged as a workshop labor service item distinct from physical inventory with a distinct tokenized badge.

---

### User Story 3 - Cart Quantity Modification, Removal & Instant Subtotal Math (Priority: P1)

* **As a** Cashier,
* **I want to** adjust line item quantities with `+` and `-` buttons or remove items with `✕` / trash button,
* **so that** line item quantities and running subtotals update instantaneously without page reloads or lagging.

**Independent Test**: Add items to cart. Click `+` on an item; verify quantity increases by 1 and subtotal recalculates synchronously (<50ms). Click `-` until quantity reaches 0 or click `✕`; verify item is removed and subtotal updates immediately.

**Acceptance Scenarios**:
1. **Given** items exist in the active cart,
   **When** the cashier clicks `+` on a line item,
   **Then** the item quantity increments and the line total updates.
2. **Given** an item with quantity > 1,
   **When** the cashier clicks `-`,
   **Then** the item quantity decrements by 1 and subtotal updates.
3. **Given** an item with quantity = 1,
   **When** the cashier clicks `-` or the `✕` (Remove) button,
   **Then** the item is removed completely from the cart.
4. **Given** any quantity change or item removal,
   **When** evaluated,
   **Then** the running subtotal and cart totals update instantaneously (< 50ms).

---

### User Story 4 - Out-of-Stock Guard & Manager Override on Physical Parts (Priority: P1)

* **As a** Cashier or Store Supervisor,
* **I want** the system to prevent adding out-of-stock physical items unless a Manager Override is authorized,
* **so that** inventory integrity is maintained and negative stock counts are strictly governed.

**Independent Test**: Attempt to add an item with stock 0. Verify modal appears blocking insertion. Enter authorized manager credentials (PIN/password), verify item is added to cart with an explicit `Overridden` / `Backorder` indicator. Verify that workshop labor services are NOT blocked by stock counts.

**Acceptance Scenarios**:
1. **Given** a physical part has 0 units in stock,
   **When** the cashier attempts to add it to the cart from catalog or search,
   **Then** the system displays an "Out of Stock" notification/modal and prevents addition unless manager override credentials are provided.
2. **Given** the manager provides valid credentials in the override modal,
   **When** authorized,
   **Then** the part is added to the cart flagged with `isOverridden: true` and displays an explicit badge.
3. **Given** a labor service item,
   **When** the cashier adds it to the cart,
   **Then** it is never blocked by stock guards as services are non-physical.

---

### User Story 5 - Shared Cart Engine Across Admin and Staff Terminals (Priority: P2)

* **As an** Admin or Staff Cashier,
* **I want** the POS cart state engine (`useCartStore`) to power both `/staff/pos` and `/admin/pos`,
* **so that** administrative cashiers have the exact same hybrid billing capabilities as counter staff.

**Independent Test**: Navigate to `/admin/pos`, verify the hybrid POS catalog and cart interfaces are fully operational, supporting both parts and labor line items.

**Acceptance Scenarios**:
1. **Given** an admin user accessing `/admin/pos`,
   **When** viewing the page,
   **Then** the active POS interface renders with the hybrid cart, parts catalog, services tab, and full checkout capabilities.
2. **Given** the shared `cartStore`,
   **When** items are manipulated,
   **Then** actions dispatch through `@/lib/store/cart-store` with centralized business logic.

---

## 3. Requirements

### Functional Requirements

- **FR-001**: Cart data model MUST support discriminated union `CartItem = PartCartItem | ServiceCartItem`.
- **FR-002**: `PartCartItem` MUST include `id`, `type: 'part'`, `sku`, `name`, `price`, `qty`, `retailPrice`, `wholesalePrice`, optional `location`, `stock`, and `isOverridden`.
- **FR-003**: `ServiceCartItem` MUST include `id`, `type: 'service'`, `code`, `name`, `price`, `qty`, optional `bay`, and `duration`.
- **FR-004**: System MUST calculate `subtotal`, `discountAmount`, `total`, and `itemCount` synchronously via pure functions in `< 50ms`.
- **FR-005**: Adding physical parts with stock `= 0` or exceeding available stock MUST prompt the `ManagerOverrideModal`.
- **FR-006**: Workshop labor services MUST be exempt from stock checks and immediately add to cart.
- **FR-007**: Cart line item quantity controls (`+`, `-`, direct update, delete) MUST update store state and recalculate totals.
- **FR-008**: System MUST provide dual-mode pricing recalculation (`retail` vs. `wholesale`) on physical items while keeping labor service flat rates fixed.
- **FR-009**: The hybrid cart interface MUST be integrated into `/staff/pos` and `/admin/pos`.
- **FR-010**: All UI elements MUST strictly utilize SWIFT semantic design tokens (`app/globals.css`, `lib/tokens.ts`).

---

## 4. Non-Functional Requirements & Design Tokens

- **Aesthetics & Tokens**:
  - Surfaces: `bg-bg-surface`, `bg-bg-card`, `bg-bg-base`, `bg-bg-muted`
  - Text: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-light`
  - Brand & Status: `bg-primary`, `text-primary`, `border-primary`, `bg-success`, `text-success`, `bg-danger`, `text-danger`
  - Zero hardcoded colors or unapproved Tailwind palette colors.
- **Performance**:
  - Cart addition and subtotal recalculation latency `< 50ms`.
  - Zero layout thrashing or stutter during rapid clicks.
- **Accessibility**:
  - Keyboard accessible controls (`+`, `-`, remove buttons with `aria-label`).
  - Screen reader friendly quantity announcements.
  - High contrast indicators for out-of-stock and labor items.

---

## 5. Success Criteria

1. **Hybrid Inclusion**: Both physical parts and labor services can be added to the active cart in a single ticket.
2. **Visual Differentiation**: Labor services display service badge, estimated duration, and bay location; parts display SKU, location, and stock status.
3. **Reactive Math**: Subtotal and total updates occur synchronously with <50ms response time on every quantity change.
4. **Stock Guard Enforcement**: Parts with 0 stock cannot be added without manager override PIN verification.
5. **Multi-Portal Parity**: Both Staff (`/staff/pos`) and Admin (`/admin/pos`) provide full hybrid POS cart functionality.
