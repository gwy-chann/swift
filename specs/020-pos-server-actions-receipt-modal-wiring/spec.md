# Feature Specification: POS Next.js Server Actions, Receipt Persistence & Thermal Modal UI Wiring

**Feature Branch**: `feat/SIAA-52-pos-server-actions-receipt-modal-wiring`  
**Created**: 2026-10-11  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-52](https://the-three-devsketeers.atlassian.net/browse/SIAA-52) (STORY-3.9)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) (EPIC-3: Point of Sale & Hybrid Service Billing)  

---

## 1. Executive Summary & Objective

In the SWIFT motorcycle parts and workshop management platform, completing a customer checkout bridges fast-lane point-of-sale operations with persistent inventory accounting, thermal printing hardware, and real-time operational monitoring.

While prior story SIAA-51 implemented the atomic PostgreSQL RPC `process_pos_checkout` and foundational server action `processCheckoutAction`, the client-side cart store (`lib/store/cart-store.ts`) remained operating with synchronous local state and decoupled mock decrement routines. Furthermore, no interactive `<ThermalReceiptModal>` component existed to render authentic 58mm/80mm thermal receipt previews, trigger direct browser print output, or inspect previous transactions (such as canonical transaction `TX-1041`). Finally, administrative dashboards (`/admin` and analytics) lacked real-time Supabase subscriptions to dynamically reflect sales transactions and update revenue KPIs without manual page reloads.

This feature completes the end-to-end POS checkout lifecycle:
1. **Asynchronous Cart Store Integration**: Modernizes `CartStore.checkout()` into an asynchronous routine dispatching `processCheckoutAction()`, validating responses, managing transaction state, and automatically clearing the active cart upon success.
2. **Next.js Route Revalidation**: Augments `processCheckoutAction` to revalidate Next.js cache tags (`pos-cart`, `inventory-catalog`, and path `/admin`).
3. **Interactive Thermal Receipt Modal (`<ThermalReceiptModal>`)**: Builds an accessible, token-compliant thermal receipt modal with 58mm / 80mm roll width toggle, itemized physical parts, workshop labor services, technician duration, discount breakdown, cash tendered, change due, and clean `@media print` thermal printing styles.
4. **Receipt Persistence & Lookup**: Enables both direct modal rendering from newly finalized checkout state and asynchronous lookup via `getTransactionByReceiptAction(receiptNumber)` (verifying canonical test receipt `TX-1041`).
5. **Realtime Admin Dashboard Revenue Updates**: Wires a Supabase Realtime channel (`pos_transactions_channel`) on the Admin Dashboard to dynamically capture incoming checkout events and increment today's Gross Revenue KPI cards in real time without page reload.

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Seamless Cart Store Checkout Integration (Priority: P1)

* **As a** Cashier or Shop Floor Clerk,
* **I want** the Fast-Lane POS terminal wired directly to Supabase checkout Server Actions with thermal receipt persistence,
* **so that** processing payments immediately prints a verifiable receipt, clears the cart, and notifies the warehouse floor in real-time.

#### Scenario 1: Seamless Cart Store Checkout Integration
* **Given** an active cart in `useCartStore` containing physical parts and labor services,
* **When** the cashier submits payment (`cartStore.checkout()` or POS terminal checkout button),
* **Then** it dispatches `processCheckoutAction(payload)`,
* **And** upon a successful response:
  1. The cart store records the finalized transaction details.
  2. The active cart items and discount rate are cleared.
  3. The `<ThermalReceiptModal>` opens automatically displaying the persistent transaction record and printable receipt.
* **And** upon failure (e.g. `INSUFFICIENT_STOCK`), an error toast is surfaced and cart contents are preserved for cashier resolution.

#### Scenario 2: Next.js Cache Revalidation on Checkout
* **Given** a checkout action completes successfully in `processCheckoutAction()`,
* **When** server action post-processing runs,
* **Then** it revalidates cache tags `pos-cart` and `inventory-catalog`,
* **And** revalidates the admin overview route `/admin` so catalog counts and sales stats remain synchronized across server components.

---

### User Story 2 - Thermal Receipt Lookup & Printing (Priority: P1)

* **As a** Cashier or Customer,
* **I want** an authentic thermal receipt modal preview supporting standard 58mm and 80mm formats,
* **so that** I can review itemized breakdown, verify labor technician duration, and print a physical customer copy.

#### Scenario 3: Thermal Receipt Layout & Formatting
* **Given** a finalized transaction or existing transaction record with receipt number `TX-1041`,
* **When** `<ThermalReceiptModal>` renders,
* **Then** it displays:
  - Header: SWIFT MOTO SERVICE branding, store address, TIN, telephone, receipt number, timestamp, and cashier name.
  - Itemized table: Physical parts with shelf location badges and workshop labor services with designated service bay and duration.
  - Pricing summary: Subtotal, discount type and amount (e.g. Senior/PWD or promotional), Total Due, Cash Tendered, and Change Due.
  - Footer: Customer copy notice, warranty notice (7 days with receipt), and barcode simulation.

#### Scenario 4: 58mm / 80mm Roll Width Switching & Print Action
* **Given** the `<ThermalReceiptModal>` is open,
* **When** the user toggles between 58mm (compact) and 80mm (standard) widths,
* **Then** the receipt paper preview dynamically adjusts width (e.g., max-w-[280px] vs max-w-[360px]) with crisp typographic alignment,
* **And** clicking "Print Receipt" invokes `window.print()` targeting dedicated `@media print` thermal styling.

#### Scenario 5: Historical Receipt Lookup
* **Given** an entered receipt number (e.g., `TX-1041`),
* **When** `getTransactionByReceiptAction('TX-1041')` is requested,
* **Then** it resolves the persistent transaction record and populates the `<ThermalReceiptModal>` seamlessly.

---

### User Story 3 - Realtime Admin Dashboard Broadcast (Priority: P2)

* **As an** Admin or Shop Owner monitoring the business,
* **I want** the Admin Dashboard to dynamically capture POS sales via Supabase Realtime,
* **so that** daily gross revenue and transaction counters update instantly without manual browser refresh.

#### Scenario 6: Realtime Revenue KPI Card Increment
* **Given** an admin monitoring `/admin`,
* **When** any cashier terminal completes a POS checkout anywhere in the workshop,
* **Then** the Supabase Realtime subscription on `transactions` receives the `INSERT` payload,
* **And** increments the "Gross Revenue" KPI card by the new transaction's `total_due`,
* **And** briefly displays a subtle live update badge without triggering a page reload.

---

## 3. SWIFT Design Tokens & Accessibility Guidelines

- **Strict Token Adherence**:
  - Zero arbitrary hex/rgb colors!
  - Surfaces: `bg-bg-base`, `bg-bg-surface`, `bg-bg-card`, `bg-bg-muted`, `bg-bg-hover`
  - Typography: `text-text-primary`, `text-text-secondary`, `text-text-muted`, `text-text-light`
  - Accents: `bg-primary`, `text-primary`, `bg-success`, `text-success`, `bg-danger`, `text-danger`, `bg-accent`, `text-accent`
  - Borders: `border-border`, `border-border-subtle`, `border-border-focus`
- **Receipt Paper Surface**:
  - The receipt preview utilizes high-contrast semantic monochromatic tokens (`bg-bg-surface` / `text-text-primary` with subtle dotted borders) ensuring dark and light mode legibility while rendering pure black-on-white on print media.
- **Accessibility (WCAG 2.1 AA)**:
  - Modal provides `role="dialog"`, `aria-modal="true"`, `aria-labelledby`, Esc key dismissal, and autofocus trapping.
  - Interactive buttons have accessible names, visible focus rings (`focus-visible:ring-2 focus-visible:ring-primary`), and min 44x44px touch targets.
