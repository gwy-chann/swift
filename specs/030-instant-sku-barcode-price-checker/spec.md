# Feature Specification: Instant SKU / Barcode Price Checker & Margin Simulator

**Feature Branch**: `feat/SIAA-31-instant-sku-barcode-price-checker`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-31](https://the-three-devsketeers.atlassian.net/browse/SIAA-31) (STORY-5.4)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  
**Target View**: Staff Shop Floor Terminal (`/staff/pricecheck` and `#view-staff-pricecheck`)  

---

## 1. Executive Summary & Objective

In a fast-paced motorcycle parts workshop and retail shop floor, mechanics, floor service advisors, and parts counter clerks are continuously approached by walk-in customers asking for instant price quotes on motorcycle replacement parts and consumables.

Previously, verifying wholesale vs. retail prices or checking margin thresholds required opening a new active POS checkout session or navigating away from floor tools.

This feature delivers an **Instant Barcode / SKU Price Checker & Margin Simulator** on the Staff Shop Floor Terminal (`/staff/pricecheck`):
1. **Sub-200ms Barcode & SKU Lookup**: Instant keystroke and hardware barcode scanner response that renders product pricing without full page reloads or layout shift.
2. **Dual-Tier Pricing & Gross Markup Percentage**: Clear display of Wholesale Price (warning gold), Retail Price / SRP (success green), Base Acquisition Cost (₱), and calculated Gross Markup % `(((retail - cost) / cost) * 100)`.
3. **Physical Rack & Shelf Locator Mapping**: Prominent rendering of physical bin coordinates (e.g. `Rack A-01 / Shelf 2`) utilizing `<ShelfLocationTag />` for immediate runner dispatch.
4. **Interactive Margin Simulator**: Real-time margin preview when testing custom retail or wholesale price adjustments on the fly.
5. **Reference Price Schedule Table**: High-velocity reference product table below the scanner displaying wholesale, retail, gross markup %, and rack/shelf locations for rapid walk-by reference.
6. **Graceful Error Handling**: Explicit and user-friendly error banners for unrecognized barcodes or missing items without breaking terminal state.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### User Story (Jira STORY-5.4)

* **As a** Floor Mechanic or Parts Counter Clerk,
* **I want to** scan or search any product SKU to immediately inspect wholesale vs. retail pricing, markup percentage, and shelf location,
* **so that** I can answer customer price inquiries instantly on the shop floor without opening an active POS ticket.

---

### Scenario 1: Sub-200ms Barcode / SKU Price Lookup (Priority: P1)

* **Given** an active Price Checker view (`#view-staff-pricecheck`) on the staff terminal (`/staff/pricecheck`)
* **When** a user enters or scans a SKU (e.g., `YAM-NMAX-BL01` or `HON-CLK-CVTB`) into `#priceScanInput`
* **Then** the result card (`#priceScanResultBox`) renders in under 200ms without requiring a full page refresh
* **And** the lookup responds to both manual typing and rapid hardware barcode scanner input.

---

### Scenario 2: Dual Pricing & Gross Markup Percentage Calculation (Priority: P1)

* **Given** a matched inventory item in the scanner
* **When** the result card (`#priceScanResultBox`) displays
* **Then** it clearly displays:
  * Wholesale Price (₱ formatted in warning gold: `text-warning` / token `var(--warning)`)
  * Retail Price (₱ formatted in success green: `text-success` / token `var(--success)`)
  * Base Acquisition Cost (₱ formatted in `text-text-primary`)
  * Calculated Gross Markup % `(((retail - cost) / cost) * 100)` formatted to 1 decimal place (e.g., `60.7%`)
  * SC / PWD statutory 20% discount price (mandated under RA 9994 / RA 10754).

---

### Scenario 3: Physical Warehouse Bin / Shelf Coordinate Display (Priority: P1)

* **Given** a verified item in the price lookup scanner
* **When** viewing the result card
* **Then** the exact physical location coordinate (e.g. `Rack A-01 / Shelf 2` or amber `Unassigned Bay` fallback) is prominently displayed using `<ShelfLocationTag />` for fast floor runner dispatch.

---

### Scenario 4: Reference Price Schedule Data Table & Invalid Code Handling (Priority: P1)

* **Given** the price check view (`/staff/pricecheck`)
* **When** browsing below the scanner box
* **Then** a reference table lists key high-velocity products with their SKU, Product Description, Wholesale Price, Retail Price, Gross Markup %, and Shelf Location
* **And** entering an unrecognized barcode or SKU displays a distinct "No item found for barcode / code: [query]" notification card without crash.

---

### Scenario 5: Interactive Margin Simulator (Priority: P2)

* **Given** a matched product in the price checker
* **When** the staff member toggles the "Margin Simulator" drawer or inputs a hypothetical custom retail or wholesale price
* **Then** the gross markup percentage recalculates dynamically in real time, showing positive margin gains in success green or below-cost warnings in danger red.

---

## 3. Dependencies & Relationships

* **Prerequisites (Blocked by)**:
  * [SIAA-10](https://the-three-devsketeers.atlassian.net/browse/SIAA-10) (STORY-1.3: Staff Shop Floor Terminal Layout Shell - provides `#view-staff-pricecheck`)
  * [SIAA-13](https://the-three-devsketeers.atlassian.net/browse/SIAA-13) (STORY-2.1: Master Parts Catalog & Multi-Attribute Search Filtering - provides product cost, wholesale, retail rates)
  * [SIAA-14](https://the-three-devsketeers.atlassian.net/browse/SIAA-14) (STORY-2.2: Physical Rack & Shelf Locator Mapping - provides warehouse bin coordinates)
* **Blocks (Enables)**:
  * [SIAA-7](https://the-three-devsketeers.atlassian.net/browse/SIAA-7) (EPIC-7: System Admin, Labor Rates Matrix & Auditing - markup compliance)
* **Related To**:
  * [SIAA-19](https://the-three-devsketeers.atlassian.net/browse/SIAA-19) (Dual-Tier Pricing Switcher: Retail vs. Wholesale)
  * [SIAA-24](https://the-three-devsketeers.atlassian.net/browse/SIAA-24) (Side-by-Side OEM vs. Aftermarket Comparison Matrix)
  * [SIAA-27](https://the-three-devsketeers.atlassian.net/browse/SIAA-27) (Touch-Optimized MotoMatcher & Shelf Locator Integration)
  * [SIAA-39](https://the-three-devsketeers.atlassian.net/browse/SIAA-39) (Global Markup Rules Configuration)
  * [SIAA-64](https://the-three-devsketeers.atlassian.net/browse/SIAA-64) (Staff Terminal Server Actions, Secure Elevation Auth & UI Wiring)

---

## 4. Requirements & Specifications

### Functional Requirements

- **FR-001**: The root container of the price check view MUST declare `id="view-staff-pricecheck"` to maintain DOM contract fidelity with `mockup/staff.html` and automated end-to-end tests.
- **FR-002**: The barcode/SKU input field MUST declare `id="priceScanInput"` and support immediate live querying on keystroke/scan with debounced server action execution (<120ms debounce for typing, immediate on Enter or Barcode scanner carriage return).
- **FR-003**: The price scan result container MUST declare `id="priceScanResultBox"` and display within 200ms when matching an inventory item.
- **FR-004**: The result card MUST include:
  - SKU & Product Name
  - Category and Brand
  - Wholesale Price formatted with Philippine Peso currency symbol (₱) in warning gold (`text-warning` / token `var(--warning)`)
  - Retail Price / SRP formatted with ₱ in success green (`text-success` / token `var(--success)`)
  - Base Cost formatted with ₱
  - Gross Markup percentage `(((retail - cost) / cost) * 100)` rounded to 1 decimal place
  - Statutory SC / PWD 20% discount price (`retail * 0.8`)
  - Prominent `<ShelfLocationTag />` displaying exact physical coordinates (`Rack A-01 / Shelf 2` or unassigned)
  - Live stock level with threshold badge (`IN STOCK`, `LOW STOCK`, or `OUT OF STOCK`).
- **FR-005**: Below the scanner box, the view MUST render the Base Product Price Schedule table listing key catalog items with SKU, Product Description, Wholesale Price, Retail Price, Gross Markup %, and Shelf Location.
- **FR-006**: When no matching product is found, `#priceScanResultBox` MUST render a high-visibility danger-styled empty state: `"No item found for barcode / code: [query]"` along with helpful guidance.
- **FR-007**: The view MUST include an interactive Margin Simulator section allowing clerks to test simulated price points and immediately view projected gross profit (₱) and gross margin percentage.
- **FR-008**: All UI styling MUST strictly use semantic SWIFT design tokens (`bg-bg-surface`, `bg-bg-card`, `bg-primary`, `text-text-primary`, `text-warning`, `text-success`, `border-border`, etc.) with zero hardcoded hex/rgb values.

### Non-Functional Requirements

- **NFR-001 (Performance & Sub-200ms Latency)**: Keystroke/barcode lookups against the catalog MUST resolve in under 200ms without full page reloads.
- **NFR-002 (Accessibility - WCAG 2.1 AA)**: All interactive controls (input, clear buttons, simulated sliders/inputs) MUST provide accessible labels, ARIA live announcements for results, and minimum 44x44px touch targets.
- **NFR-003 (Zero Hydration Mismatch)**: Components must initialize deterministically with clean server-render and client hydration.
- **NFR-004 (Theme Harmony)**: Colors and contrast must automatically harmonize across Light Mode (default) and Dark Mode using CSS variables in `app/globals.css`.
