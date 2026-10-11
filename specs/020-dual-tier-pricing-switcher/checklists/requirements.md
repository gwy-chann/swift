# Specification Quality Checklist: Dual-Tier Pricing Switcher (Retail vs. Wholesale)

**Purpose**: Validate specification completeness, business invariants, and UI token quality before proceeding to architecture and implementation  
**Created**: 2026-10-11  
**Feature**: [spec.md](../spec.md)  
**Ticket**: [SIAA-19](https://the-three-devsketeers.atlassian.net/browse/SIAA-19)  

---

## 1. Content Quality

- [x] **No implementation leakage**: Focused on business rules, cashier workflows, and tier switching behaviors.
- [x] **Clear user value**: Ensures commercial trade accounts and walk-in retail riders receive accurate pricing without cashier errors.
- [x] **Understandable for stakeholders**: Clear explanations of retail markup vs wholesale tiers.
- [x] **All mandatory sections present**: Executive summary, user stories, acceptance scenarios, constraints, and dependencies.

---

## 2. Requirement Completeness & Scenario Coverage

- [x] **Scenario 1 (Wholesale Tier Switch)**: Dynamic recalculation of all physical parts to their wholesale prices.
- [x] **Scenario 2 (Labor Rate Invariance)**: Preserves fixed workshop labor charges without alteration during tier switches.
- [x] **Scenario 3 (Quantity & Cart Preservation)**: Quantities, notes, and item selections remain intact without resetting or wiping the cart.
- [x] **Scenario 4 (Visual Active Tier Indicator)**: Prominent high-contrast warning badge (`WHOLESALE TIER ACTIVE`) above the checkout button.
- [x] **Zero [NEEDS CLARIFICATION] markers remaining**: All defaults and edge cases established.

---

## 3. SWIFT Design Tokens & Accessibility Verification

- [x] **Mandatory SWIFT Design Tokens**: Strictly uses `bg-primary`, `bg-accent`, `text-accent`, `border-border`, etc.
- [x] **Zero Hardcoded Colors**: No ad-hoc `#hex` or `rgb(...)` values.
- [x] **Accessibility (WCAG 2.1 AA)**: Minimum 4.5:1 contrast ratio for active tab state, wholesale warning badges, and price texts.
- [x] **Keyboard & Touch Ergonomics**: Clear button hit targets (min 44x44px or comfortable padding) for fast POS touchscreen operation.

---

## 4. Verification Results & Feature Readiness

- **Status**: PASSED
- **Readiness**: Ready for Architecture Planning (`data-model.md`, `contracts/`, `plan.md`)
