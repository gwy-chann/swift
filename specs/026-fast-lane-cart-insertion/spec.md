# Feature Specification: 1-Click Fast-Lane POS Cart Insertion & Live Upsell Dispatch

**Feature Branch**: `026-fast-lane-cart-insertion`

**Created**: 2026-10-14

**Status**: Ready for Planning

**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-25 (STORY-4.3: 1-Click Fast-Lane POS Cart Insertion & Live Upsell Dispatch)"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 1-Click Cart Insertion from Compatibility Matrix (Priority: P1)

As a Counter Clerk or Cashier, I want to add any matched OEM or aftermarket part directly into the active point-of-sale (POS) cart with a single click from the MotoMatcher compatibility screen, so that I can immediately queue customer purchases without leaving the compatibility screen or manually searching and typing SKUs.

**Why this priority**: Eliminates friction during in-person counter sales. Counter clerks can instantly transition a customer from motorcycle parts compatibility lookup into an active checkout order with zero navigation delays or manual SKU entry errors.

**Independent Test**: Can be tested by navigating to the MotoMatcher screen, locating an in-stock part (OEM or aftermarket), and clicking "+ Add to Active POS Cart". The item appears in the active POS cart with quantity 1 and a confirmation toast notification is displayed.

**Acceptance Scenarios**:

1. **Given** a matched part is displayed in the MotoMatcher matrix with available stock (> 0 units), **When** the clerk clicks "+ Add to Active POS Cart", **Then** the part is immediately appended to the active POS cart with quantity 1, **And** a feedback toast notification confirms: `"Added [Part Name] to POS Cart!"`.
2. **Given** a part is added to the cart from the MotoMatcher matrix, **When** the clerk clicks the add action, **Then** the button temporarily transitions into a confirmed feedback state (showing a checkmark and "Added") before returning to its normal state.

---

### User Story 2 - Real-Time Cart Badge Counter Synchronization (Priority: P1)

As a Counter Clerk or Cashier, I want the header and navigation cart badges to immediately reflect total item count updates when parts are added from MotoMatcher, so that I have clear visual confidence that items were queued into the active order without needing to leave the compatibility screen.

**Why this priority**: Provides instant visual feedback and confirmation across portal navigation headers so the clerk knows the exact state of the pending sale without switching views.

**Independent Test**: Can be tested by monitoring the global POS cart badge counter in the navigation bar/sidebar while adding items from MotoMatcher. The badge increments instantly upon click without page refresh or view switching.

**Acceptance Scenarios**:

1. **Given** the clerk is on the MotoMatcher matrix screen with an active cart count of N, **When** the clerk adds an in-stock part to the cart, **Then** the navigation header and sidebar POS Cart badge counter increments to N + 1 in real-time (< 50ms) without page reloading or tab navigation.
2. **Given** an empty cart (badge hidden or showing 0), **When** the first item is added from MotoMatcher, **Then** the badge becomes visible displaying "1" and indicates an active, non-empty checkout session.

---

### User Story 3 - Duplicate Addition & Quantity Consolidation (Priority: P2)

As a Counter Clerk or Cashier, I want adding an already-queued part again from MotoMatcher to increment the existing cart line item quantity rather than creating duplicate lines, so that the customer's order remains clean, grouped, and ready for accurate invoicing.

**Why this priority**: Prevents cart clutter and checkout discrepancies. When a customer needs two of the same spark plug, brake pad, or mirror, consecutive clicks should adjust the quantity cleanly on that line item.

**Independent Test**: Can be tested by clicking "+ Add to Active POS Cart" twice on the same part card and verifying the cart contains one line item with quantity 2.

**Acceptance Scenarios**:

1. **Given** a part already exists in the active POS cart with quantity Q, **When** the clerk clicks "+ Add to Active POS Cart" on the same part in MotoMatcher, **Then** the existing cart line item quantity updates to Q + 1 rather than creating a separate duplicate line item.
2. **Given** an item already in the cart with quantity Q, **When** the quantity increments via MotoMatcher addition, **Then** the cart subtotal, item count badge, and pricing calculations recalculate immediately.

---

### User Story 4 - Out-of-Stock Prevention & Stock Cap Safeguard (Priority: P2)

As a Counter Clerk or Inventory Manager, I want out-of-stock parts in the compatibility matrix to be prevented from cart insertion with clear restock indicators, so that staff cannot accidentally sell unavailable physical stock to counter customers.

**Why this priority**: Protects inventory integrity and prevents customer dissatisfaction caused by accepting payment for out-of-stock merchandise.

**Independent Test**: Can be tested by attempting to add a part with 0 stock to the cart. The button is disabled and displays an "Out of Stock" state, and no items are added to the cart.

**Acceptance Scenarios**:

1. **Given** a matched part in MotoMatcher has 0 units in stock, **When** rendered in the comparison matrix, **Then** the "+ Add to Active POS Cart" button is disabled and displays "Out of Stock" styling.
2. **Given** an out-of-stock part, **When** the clerk attempts to click the disabled button, **Then** the system does not add the item to the cart and provides a helpful guidance message to restock or check shelf alternatives.
3. **Given** a part in the cart currently has quantity equal to the total available inventory, **When** the clerk attempts to add another unit from MotoMatcher, **Then** the system prevents exceeding available stock and alerts the clerk that the stock limit has been reached.

---

### User Story 5 - Live Upsell Dispatch & Comparison Context (Priority: P3)

As a Counter Clerk, I want to clearly view price differences and performance advantages between OEM and aftermarket options when queueing parts, so that I can proactively suggest upgrade alternatives to the customer while building their cart.

**Why this priority**: Increases average order value and customer satisfaction by surfacing performance upgrades (e.g., racing brake pads or high-flow filters) alongside standard replacements during the checkout flow.

**Independent Test**: Can be tested by comparing an OEM part card with an aftermarket alternative and adding the aftermarket upgrade to the cart, verifying the price delta and item details flow smoothly into the active cart.

**Acceptance Scenarios**:

1. **Given** both OEM and aftermarket options are displayed for a motorcycle subsystem, **When** the clerk reviews the options, **Then** the matrix highlights the price difference and upgrade classification.
2. **Given** a customer agrees to an aftermarket upgrade, **When** the clerk clicks "+ Add to Active POS Cart" on the aftermarket card, **Then** the aftermarket item is dispatched into the active cart with proper part categorization and tier pricing intact.

---

### Edge Cases

- **Rapid Multiple Clicks**: If a clerk rapidly double-clicks the add button, the system debounces or processes consecutive actions sequentially to prevent inconsistent race conditions or corrupted cart state.
- **Stock Depletion Mid-Session**: If another register sells out the remaining inventory of a part while the clerk is viewing MotoMatcher, attempting to add the item verifies real-time stock and halts insertion with an "Item no longer available" warning if stock dropped to 0.
- **Switching Between Portals**: Cart state modified via MotoMatcher persists seamlessly when switching to the POS Fast-Lane checkout view, retaining all line items, quantities, and applied pricing tiers.
- **Discounts and Pricing Tiers**: When parts are inserted into the cart, the cart honors the customer's active pricing tier (Retail vs. Wholesale) and applies appropriate pricing rules automatically.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a direct, 1-click action ("+ Add to Active POS Cart") on every in-stock part card rendered within the MotoMatcher compatibility matrix.
- **FR-002**: System MUST append the selected part to the active POS cart session with an initial quantity of 1 upon action trigger.
- **FR-003**: System MUST display an immediate feedback toast notification confirming the addition with the format `"Added [Part Name] to POS Cart!"`.
- **FR-004**: System MUST synchronize the POS cart item counter badge in the navigation header and sidebar in real-time (< 50ms) upon successful addition.
- **FR-005**: System MUST detect when an added part already exists in the active cart and increment its existing line item quantity by 1 rather than creating duplicate line items.
- **FR-006**: System MUST disable the add-to-cart action and display an "Out of Stock" indicator when a part's available inventory count is 0.
- **FR-007**: System MUST prevent adding quantities that exceed the total available inventory of a part, notifying the user when maximum stock is reached.
- **FR-008**: System MUST support adding both OEM factory parts and aftermarket upgrade parts seamlessly into the joint hybrid POS cart.
- **FR-009**: System MUST preserve active cart line items and quantities across navigation between the MotoMatcher screen and the POS Fast-Lane checkout screen.
- **FR-010**: System MUST apply the currently active pricing mode (Retail vs. Wholesale) to any part added from the MotoMatcher screen.

### Key Entities *(include if feature involves data)*

- **MotoMatcher Part**: Represents a motorcycle-compatible component (OEM or Aftermarket) with attributes including unique SKU, part name, brand, retail/wholesale price, physical shelf bin location, available stock quantity, and fitment classification.
- **POS Cart Line Item**: Represents an item queued for customer purchase in the active POS session, containing part reference, unit price, quantity, line total, and applied pricing tier.
- **POS Cart State**: The central session state tracking all active line items, total item count, subtotal, tax/discounts, and active pricing mode across the application.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Counter clerks can add any matched part to the active POS cart in 1 single click with zero manual SKU typing.
- **SC-002**: Visual cart badge counters update within 50 milliseconds of clicking the add action.
- **SC-003**: 100% of duplicate part additions consolidate into a single line item with incremented quantity rather than creating duplicate lines.
- **SC-004**: Zero out-of-stock items can be added to the active POS cart (100% prevention rate).
- **SC-005**: 100% of cart additions triggered from MotoMatcher retain accurate item details, pricing, and shelf bin coordinates upon navigating to the POS checkout screen.
- **SC-006**: Counter clerks can complete the transition from part fitment discovery to queued checkout item in under 3 seconds.

---

## Assumptions

- Counter clerks operate primarily on desktop, touch terminal, or tablet screens with active internet connectivity to the local or cloud backend.
- The active POS cart session is maintained within the user's current working session and does not reset unexpectedly during intra-portal navigation.
- The MotoMatcher compatibility matrix has access to live stock quantities from the inventory catalog service.
- Customer pricing tiers (Retail or Wholesale) are determined by the active POS register session or selected customer profile.
- Workshop labor charges and joint parts-labor bundling follow existing hybrid cart rules established in SIAA-18.
