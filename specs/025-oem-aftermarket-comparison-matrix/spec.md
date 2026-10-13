# Feature Specification: Side-by-Side OEM vs. Aftermarket Performance Comparison Matrix

**Feature Branch**: `feat/SIAA-24-oem-aftermarket-comparison-matrix`  
**Created**: 2026-10-14  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-24](https://the-three-devsketeers.atlassian.net/browse/SIAA-24) (STORY-4.2)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts retail and repair workshops, customers frequently face a choice between standard factory OEM replacements (guaranteed factory specifications) and aftermarket performance upgrades (enhanced tuning, racing specs, or cost-effective alternatives). Without clear, side-by-side presentation, counter clerks must spend extra time flipping between screens, explaining differences, and manually looking up prices and shelf bins.

Building upon the Motorcycle Selector Engine ([SIAA-23](https://the-three-devsketeers.atlassian.net/browse/SIAA-23)) and the atomic fitment RPC ([SIAA-54](https://the-three-devsketeers.atlassian.net/browse/SIAA-54)), this feature delivers a dedicated, modular **Side-by-Side OEM vs. Aftermarket Performance Comparison Matrix**.

Key outcomes:
1. **Dual-Column Layout Rendering**: High-contrast, side-by-side columns dividing OEM Standard Replacement parts from Performance / Alternative Aftermarket parts.
2. **Comprehensive Part Card Display**: Each card prominently displays SKU, part name, brand, retail price (₱), warehouse shelf bin locator badge, and real-time stock availability with low-stock warnings.
3. **Partitioning & Universal Item Support**: Automatic categorization separating `oem: true` parts into the OEM column and `oem: false` parts into the Aftermarket column, including universal components.
4. **Graceful Empty State Fallbacks**: Contextual fallbacks when a selected platform has OEM parts cataloged but no aftermarket alternatives (or vice versa).
5. **Interactive Action Affordance**: 1-click cart insertion action with visual feedback and upsell delta indicators.
6. **Strict Token Adherence**: Built using SWIFT semantic design tokens (`bg-bg-surface`, `text-primary`, `bg-secondary`, etc.) with zero hardcoded colors.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### User Story (Jira STORY-4.2)

* **As a** Counter Clerk or Motorcycle Owner,
* **I want to** view OEM Factory Standard Replacement parts side-by-side with Performance Aftermarket alternatives for the selected motorcycle,
* **so that** I can easily compare prices, brands, and upgrade specifications to make an informed buying decision.

---

### Scenario 1: Dual-Column Layout Rendering (Priority: P1)

* **Given** an active motorcycle model is selected (e.g., Yamaha NMAX 155),
* **When** the comparison matrix renders,
* **Then** it displays two distinct columns:
  * Column 1: "OEM Standard Factory Parts (Original Spec)"
  * Column 2: "Performance / Alternative Aftermarket (Upgrade Spec)"
* **And** each column header is styled with high-contrast distinct theme headers using SWIFT semantic tokens:
  * OEM header styled with primary brand tokens (`bg-primary-light`, `border-primary-border`, `text-primary`, `ShieldCheck` icon)
  * Aftermarket header styled with secondary accent tokens (`bg-secondary/10`, `border-secondary/20`, `text-secondary`, `Zap` icon)
* **And** on mobile/narrow viewports, the columns adapt responsively into stacked view (`grid-cols-1 lg:grid-cols-2`).

---

### Scenario 2: Part Card Attribute Display (Priority: P1)

* **Given** matched parts in either column,
* **When** part cards are rendered,
* **Then** each card clearly displays:
  1. **SKU Code** (monospace font, subtle text badge)
  2. **Part Name** (bold, truncated with full title tooltip)
  3. **Brand** (manufacturer name e.g., "Yamaha Genuine", "Brembo", "Koso")
  4. **Physical Shelf Location Badge** (e.g., `Rack A-01 / Shelf 2` with map pin icon)
  5. **Retail Price** (formatted in Philippine Pesos: `₱XXX.XX` in high-contrast primary/secondary typography)
  6. **Stock Availability Badge** (`X in stock` in `bg-success-light text-success`, or `Low Stock` alert badge in `bg-danger-light text-danger` when `stock <= minThreshold`).

---

### Scenario 3: Universal vs. Model-Specific Card Partitioning (Priority: P1)

* **Given** inventory items matching either the specific model or tagged as `Universal`,
* **When** the matrix compiles part items,
* **Then** parts with `oem: true` (or `fitment_type === 'oem'`) populate the OEM column,
* **And** parts with `oem: false` (or `fitment_type === 'aftermarket'` / `fitment_type === 'universal'`) populate the Aftermarket column,
* **And** each part clearly indicates its classification badge (`OEM` vs `AFTERMARKET` / `UNIVERSAL`).

---

### Scenario 4: Graceful Empty Category Fallback (Priority: P2)

* **Given** a motorcycle platform or category filter where one column has parts but the other column has zero matching items,
* **When** that column is rendered,
* **Then** it renders a clean, accessible fallback state with an informative message:
  * For empty OEM: "No OEM matches in stock for this platform. Check alternative aftermarket parts or consult distributor catalog."
  * For empty Aftermarket: "No Aftermarket matches in stock for this platform. Check universal components or request special order."
* **And** if both columns are empty, both render their respective fallback cards without breaking grid symmetry.

---

### Scenario 5: 1-Click Cart Insertion & Upsell Delta Affordance (Priority: P2)

* **Given** parts rendered in either column,
* **When** the clerk clicks the "Add to POS Cart" button on a part card,
* **Then** the item is added to the active POS cart via `cartStore`,
* **And** the button temporarily transitions to an "Added to Cart" state with a checkmark for 1.8 seconds,
* **And** for aftermarket items that feature an upgrade delta compared to an OEM baseline, an upsell badge (e.g., `+₱150.00 (+25.0%)`) is displayed.

---

## 3. Dependencies & Relationships

* **Prerequisites (Blocked by)**:
  * [SIAA-23](https://the-three-devsketeers.atlassian.net/browse/SIAA-23) (Motorcycle Make, Model & Displacement Selector Engine - supplies active model context)
  * [SIAA-13](https://the-three-devsketeers.atlassian.net/browse/SIAA-13) (Master Parts Catalog - supplies OEM flag, price, and stock levels)
  * [SIAA-14](https://the-three-devsketeers.atlassian.net/browse/SIAA-14) (Physical Rack & Shelf Locator Mapping - supplies warehouse bin coordinates)
  * [SIAA-54](https://the-three-devsketeers.atlassian.net/browse/SIAA-54) (Supabase Atomic MotoMatcher Matrix Search RPC & Fitment Verification Engine)
* **Blocks (Enables)**:
  * [SIAA-25](https://the-three-devsketeers.atlassian.net/browse/SIAA-25) (1-Click Fast-Lane POS Cart Insertion & Live Upsell Dispatch)
  * [SIAA-26](https://the-three-devsketeers.atlassian.net/browse/SIAA-26) (Subsystem Category & Universal vs. Dedicated Fitment Filtering)
  * [SIAA-27](https://the-three-devsketeers.atlassian.net/browse/SIAA-27) (Staff Floor Terminal Touch-Optimized MotoMatcher & Shelf Locator Integration)
* **Related To**:
  * [SIAA-17](https://the-three-devsketeers.atlassian.net/browse/SIAA-17) (Automated Low-Stock Threshold Detection)
  * [SIAA-39](https://the-three-devsketeers.atlassian.net/browse/SIAA-39) (Global Markup Rules Configuration)

---

## 4. Clarifications & Resolved Decisions

1. **Dual Data-Source Flexibility**:
   - *Decision*: `<ComparisonMatrix />` supports both direct `Product` objects (from client-side filtered inventory) and `MotoMatcherMatrixPart` objects (from the atomic RPC server action). It normalizes them transparently via `normalizeToComparisonPart`.
2. **Mobile Layout Adaptation**:
   - *Decision*: On mobile viewports (`< 1024px`), the columns stack vertically with clear sticky headers so staff can scroll through OEM then Aftermarket without cramped horizontal overflow.
3. **Low-Stock Alert Threshold**:
   - *Decision*: A part displays `Low Stock` alert (`bg-danger-light text-danger`) if `stock <= minThreshold` (or `stock <= 5` if undefined), otherwise displaying `{stock} in stock` (`bg-success-light text-success`).
4. **Interactive POS Cart Feedback**:
   - *Decision*: Clicking "Add to POS Cart" adds 1 unit to `cartStore`, flips the button state to "Added to Cart" with a checkmark for 1800ms, and resets without page reload.

---

## 5. Success Criteria & Quality Metrics

1. **Dual Column Partitioning Accuracy**: 100% of OEM parts (`oem: true`) route to the left column; 100% of aftermarket parts route to the right column.
2. **Zero Hardcoded Colors**: 100% of UI colors derive strictly from SWIFT design tokens (`app/globals.css` and `lib/tokens.ts`).
3. **Card Attribute Completeness**: All 6 required attributes (SKU, Name, Brand, Shelf Bin, Retail ₱, Stock Badge) render on every part card.
4. **Empty State Grace**: Empty columns render clean fallback notices without layout shifts or JavaScript errors.
5. **Accessibility**: Keyboard navigable with proper ARIA attributes, semantic button elements, and WCAG AA color contrast.
6. **Cross-Portal Reuse**: `<ComparisonMatrix />` component is shared and reused across both `/admin/motomatcher` and `/staff/compat`.
