# Feature Specification: Staff Floor Terminal Touch-Optimized MotoMatcher & Shelf Locator Integration

**Feature Branch**: `feat/SIAA-27-staff-terminal-motomatcher-shelf-locator`  
**Created**: 2026-10-14  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-27](https://the-three-devsketeers.atlassian.net/browse/SIAA-27) (STORY-4.5)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  
**Target View**: Staff Shop Floor Terminal (`/staff/compat` and `/staff.html`)

---

## 1. Executive Summary & Objective

In busy motorcycle repair workshops and quick-service lanes, mechanics and floor service advisors frequently move between customer motorcycles on the shop floor and warehouse shelving. They operate tablet terminals, all-in-one touchscreens, or ruggedized mobile devices—often with greased or gloved hands.

While the core MotoMatcher platform selector ([SIAA-23](https://the-three-devsketeers.atlassian.net/browse/SIAA-23)), comparison matrix ([SIAA-24](https://the-three-devsketeers.atlassian.net/browse/SIAA-24)), and fast-lane cart dispatcher ([SIAA-25](https://the-three-devsketeers.atlassian.net/browse/SIAA-25)) provide rich desktop capabilities, floor mechanics require:
1. **Touch-Optimized Hit Targets**: Enlarged, ergonomic touch targets adhering to WCAG 2.1 AA recommendations (minimum 44x44px clickable areas) across motorcycle model chips, category pills, filter toggles, and "Add to Active POS Cart" action buttons.
2. **Prominent Warehouse Shelf Locator Coordinates**: Clear, high-contrast visual location badges leveraging the standardized `ShelfLocationTag` component (`Rack X-YY / Shelf Z` or amber `Unassigned Bay` fallback) so mechanics can immediately locate and retrieve parts without cross-referencing paper sheets or running back to the main cashier desk.
3. **Responsive Mobile/Tablet Adaptability**: On viewports under 768px (tablets in portrait, phone screens, or split-screen terminals), providing an ergonomic tabbed column switcher between "OEM Factory" and "Aftermarket Performance" columns to prevent horizontal overflow, excessive vertical scrolling, or cramped dual-column layouts.
4. **Instant Fast-Lane POS Hand-Off**: Seamless, optimistic cart dispatch directly to the shared floor cart with tactile visual feedback (toast notification and button state change) so cashiers at the front register can immediately ring out the parts.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### User Story (Jira STORY-4.5)

* **As a** Floor Mechanic or Shop Staff member,
* **I want to** access MotoMatcher on the Staff Shop Floor Terminal with touch-friendly controls and prominent physical shelf locators,
* **so that** I can look up compatible parts right next to the customer's motorcycle and retrieve them from warehouse shelves in seconds.

---

### Scenario 1: Touch-Optimized MotoMatcher Controls on Staff Terminal (Priority: P1)

* **Given** an authenticated staff member on the Staff Shop Floor Terminal (`/staff/compat`)
* **When** navigating to the MotoMatcher view
* **Then** the motorcycle selector, subsystem filter pills, and comparison matrix render with enlarged touch targets (minimum 44x44px bounding area for all interactive buttons)
* **And** card elements display high-contrast borders and elevated active/hover states optimized for shop touchscreen terminals.

---

### Scenario 2: Prominent Physical Rack/Shelf Picking Coordinates (Priority: P1)

* **Given** a floor mechanic identifies a compatible part in MotoMatcher
* **When** viewing the part card in either OEM or Aftermarket columns
* **Then** the physical locator tag (e.g. `Rack A-01 / Shelf 2` or `Unassigned Bay`) is prominently rendered using the standardized `ShelfLocationTag` badge with a distinct map pin icon and high-contrast background token (`bg-secondary-light text-secondary` for assigned, `bg-accent-light text-accent` for unassigned)
* **And** the locator badge is positioned prominently next to the SKU and part title for rapid picking.

---

### Scenario 3: Fast-Lane POS Hand-off from Floor Terminal (Priority: P1)

* **Given** the floor mechanic clicks "+ Add to Active POS Cart" on a compatible part card
* **When** the item is added
* **Then** it immediately dispatches to the shared POS cart via `dispatchMotoMatcherCartInsertion`
* **And** the button transitions to a green "Added to Cart" state with checkmark icon
* **And** a clear toast notification appears confirming the item was staged to the floor cart.

---

### Scenario 4: Responsive Viewport Adaptability for Tablets and Mobile (Priority: P1)

* **Given** a mechanic uses a mobile or tablet viewport (< 768px width)
* **When** viewing the comparison matrix
* **Then** an ergonomic tabbed toggle bar appears above the cards offering tabs for "OEM Factory (X)" and "Aftermarket (Y)"
* **And** selecting a tab switches the active column view smoothly without causing horizontal overflow or pinching/zooming.

---

## 3. Dependencies & Relationships

* **Prerequisites (Blocked by)**:
  * [SIAA-23](https://the-three-devsketeers.atlassian.net/browse/SIAA-23) (Motorcycle Make, Model & Displacement Selector Engine)
  * [SIAA-24](https://the-three-devsketeers.atlassian.net/browse/SIAA-24) (Side-by-Side OEM vs. Aftermarket Performance Comparison Matrix)
  * [SIAA-10](https://the-three-devsketeers.atlassian.net/browse/SIAA-10) (Staff Shop Floor Terminal Layout Shell)
  * [SIAA-14](https://the-three-devsketeers.atlassian.net/browse/SIAA-14) (Physical Rack & Shelf Locator Mapping)
* **Blocks (Enables)**:
  * [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)
* **Related To**:
  * [SIAA-15](https://the-three-devsketeers.atlassian.net/browse/SIAA-15) (Interactive Stock Adjustment Engine)
  * [SIAA-25](https://the-three-devsketeers.atlassian.net/browse/SIAA-25) (1-Click Fast-Lane POS Cart Insertion & Live Upsell Dispatch)
  * [SIAA-26](https://the-three-devsketeers.atlassian.net/browse/SIAA-26) (Subsystem Category & Universal vs. Dedicated Fitment Filtering)

---

## 4. Requirements & Specifications

### Functional Requirements

- **FR-001**: Interactive elements in the Staff MotoMatcher view (buttons, selector cards, chips) MUST have an effective clickable/tappable touch target area of at least 44x44 CSS pixels (`min-h-[44px]` or adequate padding/min-sizes) on touch devices.
- **FR-002**: Every part card in `<ComparisonMatrix />` MUST render the standardized `<ShelfLocationTag />` component displaying formatted storage bay coordinates (`Rack X-YY / Shelf Z`) or the amber unassigned warning.
- **FR-003**: The staff terminal page (`/staff/compat`) MUST pass the shelf location from the product domain model to the `ComparisonPartItem` payload.
- **FR-004**: On viewports under 768px (mobile & tablet portrait), `<ComparisonMatrix />` MUST support a segmented tabbed switcher between "OEM Standard" and "Aftermarket Upgrade" with badges displaying the active item count.
- **FR-005**: On desktop viewports (>= 1024px) and tablet landscape (>= 768px in dual-column mode), `<ComparisonMatrix />` MUST render the canonical side-by-side dual-column comparison layout.
- **FR-006**: The "+ Add to POS Cart" action button MUST expand to full-width or a minimum 44px height on touch/mobile mode, providing immediate visual feedback upon tap.
- **FR-007**: Clicking the add-to-cart action MUST synchronize the item with `usePosStore` via `dispatchMotoMatcherCartInsertion` without navigating away from the MotoMatcher view.
- **FR-008**: All UI styling MUST strictly use semantic SWIFT design tokens (`bg-bg-surface`, `bg-primary`, `bg-secondary`, `text-text-primary`, `border-border`, etc.) with zero hardcoded hex/rgb values.

### Non-Functional Requirements

- **NFR-001 (Touch Accessibility)**: Must satisfy WCAG 2.1 AA Success Criterion 2.5.5 (Target Size) with minimum 44x44px touch targets.
- **NFR-002 (Performance & Latency)**: Switching between OEM and Aftermarket tabs on mobile MUST execute in under 16ms (single frame animation) with zero network round-trip.
- **NFR-003 (Zero Hydration Mismatch)**: Touch mode and tab states must initialize deterministically without hydration flicker or layout shift.
- **NFR-004 (Theme Consistency)**: High contrast cards and badges must adapt cleanly across Light and Dark themes via established CSS custom property tokens.
