# Feature Specification: Dual-Tier Pricing Switcher (Retail vs. Wholesale) with Dynamic Cart Recalculation

**Feature Branch**: `feat/SIAA-19-dual-tier-pricing-switcher`  
**Created**: 2026-10-11  
**Status**: Specified & Validated  
**Jira Issue**: [SIAA-19](https://the-three-devsketeers.atlassian.net/browse/SIAA-19) (STORY-3.2)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) (EPIC-3: Point of Sale (POS) & Hybrid Service Billing)  
**Input**: `/speckit https://the-three-devsketeers.atlassian.net/browse/SIAA-19`  

---

## 1. Executive Summary & Objective

In motorcycle spare parts and workshop operations, customers fall into two primary commercial groups:
1. **Walk-in Retail Customers**: Regular riders and individual motorcycle owners paying standard retail markup rates.
2. **Wholesale Accounts & Partner Garages**: Fleet operators, affiliated mechanics, and wholesale trade accounts entitled to wholesale price tiers.

Previously, handling both customer segments in the POS required manual line-item price overrides or opening separate transaction flows, risking human calculation errors, slow checkout times, and undercharging.

This feature implements the **Dual-Tier Pricing Switcher (Retail vs. Wholesale) with Dynamic Cart Recalculation** across the SWIFT POS interfaces (`/staff/pos` and `/admin/pos`):
- **Single-Click Tier Toggling**: Instant switching between `retail` and `wholesale` modes.
- **Dynamic Cart Recalculation**: Instant recalculation of all physical inventory parts in the cart to their respective tier unit prices without losing custom quantities or item selections.
- **Strict Workshop Labor Invariance**: Labor installation flat rates (e.g. oil change labor ₱100.00) remain strictly fixed and unaffected by wholesale/retail tier switches.
- **Synchronized Catalog Pricing**: Catalog items instantly reflect the active pricing tier so items added after a toggle enter at the correct rate.
- **High-Contrast Active Tier Indicator**: Prominent warning banner and badge (e.g. `WHOLESALE TIER ACTIVE`) positioned in the POS header and cart summary above the checkout button to prevent accidental undercharging.

---

## 2. User Stories & Acceptance Criteria

### User Story 1 - Switching to Wholesale Pricing Tier (Priority: P1)

* **As a** Cashier or Wholesale Counter Clerk,
* **I want to** toggle between Retail and Wholesale pricing with a single click,
* **so that** partner repair shops and wholesale customers automatically receive their correct tier pricing across all parts in the cart without manual overrides.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Switching to Wholesale Pricing Tier
  Given a cart populated with physical parts priced at Retail (e.g. Motul 3100 at ₱390.00)
  When the cashier clicks the "Wholesale" pricing tab
  Then all physical part line items in the cart immediately recalculate using their respective wholesale prices (e.g. Motul 3100 adjusts from ₱390.00 to ₱330.00)
  And the POS item catalog grid updates displayed prices to wholesale
  And the cart subtotal and total due recalculate synchronously in < 50ms.
```

---

### User Story 2 - Preserving Fixed Workshop Labor Rates During Tier Toggle (Priority: P1)

* **As a** Service Advisor or Cashier,
* **I want to** toggle between Retail and Wholesale pricing without altering mechanical bay labor charges,
* **so that** workshop flat rates remain exact and unaffected by spare part price schedules.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Preserving Fixed Workshop Labor Rates During Tier Toggle
  Given the cart contains both physical parts and workshop labor services (e.g. Oil Change labor ₱100.00)
  When the cashier toggles between Retail and Wholesale
  Then only physical parts prices recalculate to the target tier
  And repair bay labor flat rates remain strictly unchanged at ₱100.00
  And the labor line item retains its assigned bay and duration metadata.
```

---

### User Story 3 - Cart Quantity & Item Selection Preservation (Priority: P1)

* **As a** Cashier,
* **I want** all line item quantities, selections, and notes to remain intact when switching pricing tiers,
* **so that** changing customer account types does not wipe the active cart or require re-adding items.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Cart Quantity Preservation
  Given multiple line items in the active cart with custom quantities (e.g. 4 spark plugs, 2 oil bottles, 1 brake service)
  When switching pricing modes between Retail and Wholesale
  Then all line item quantities, ordering, and item selections remain intact without resetting the cart
  And each line item total reflects (new_tier_unit_price * unchanged_quantity).
```

---

### User Story 4 - Visual Active Tier Indicator & High-Contrast Warning Banner (Priority: P1)

* **As a** Store Supervisor or Cashier,
* **I want** an unmistakable, high-contrast visual badge and warning banner indicating when Wholesale mode is active,
* **so that** staff are immediately aware wholesale margins are in effect and cannot accidentally undercharge retail customers.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Visual Active Tier Indicator
  Given the POS cart pane and header
  When the pricing mode is set to Wholesale
  Then an explicit high-contrast badge (e.g., "WHOLESALE TIER ACTIVE") is displayed prominently above the checkout button
  And the pricing tab clearly highlights the Wholesale mode with active token styling
  And when toggled back to Retail, the wholesale warning badge smoothly disappears or transitions to Retail mode.
```

---

## 3. Business Invariants & Constraints

1. **Non-Negative Pricing**: Wholesale prices and retail prices must be non-negative numbers (`>= 0`).
2. **Wholesale Margin Invariant**: `wholesalePrice <= retailPrice` across all standard catalog products, though the engine gracefully handles promotional parity (`wholesalePrice == retailPrice`).
3. **Labor Flat Rate Immutability**: Labor services (`type === 'service'`) do not have wholesale tiers; their `rate` is constant across pricing modes.
4. **Performance Constraint**: Pricing mode toggles and full cart mathematical re-computations must execute synchronously within `< 50ms`.
5. **Zero Hardcoded Colors**: All UI elements (tabs, badges, warning alerts, price tags) must strictly utilize semantic SWIFT tokens (`bg-primary`, `bg-accent`, `text-accent`, `border-border`, etc.).

---

## 4. Dependencies & Downstream Traceability

- **Upstream (Done)**:
  - `SIAA-18` (STORY-3.1: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine)
  - `SIAA-13` (STORY-2.1: Master Parts Catalog with retail and wholesale pricing attributes)
  - `SIAA-39` (STORY-7.2: Global Markup Rules Configuration)
- **Downstream (Unlocks)**:
  - `SIAA-20` (STORY-3.3: Customer Discount Matrix Engine: Senior, PWD & VIP)
  - `SIAA-21` (STORY-3.4: Cash Tender & Payment Processing with Real-Time Change Math)
