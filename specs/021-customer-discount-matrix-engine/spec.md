# Feature Specification: Customer Discount Matrix Engine (Senior, PWD & VIP) & Subtotal Computation

**Feature Branch**: `feat/SIAA-20-customer-discount-matrix-engine`  
**Created**: 2026-10-12  
**Status**: Specified & Validated  
**Jira Issue**: [SIAA-20](https://the-three-devsketeers.atlassian.net/browse/SIAA-20) (STORY-3.3)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) (EPIC-3: Point of Sale (POS) & Hybrid Service Billing)  
**Input**: `/speckit https://the-three-devsketeers.atlassian.net/browse/SIAA-20`  

---

## 1. Executive Summary & Objective

In Philippine retail and automotive service repair environments, businesses must comply with statutory government-mandated discount provisions (Republic Act No. 9994 for Senior Citizens, Republic Act No. 10754 for Persons with Disability / PWD granting 20% discount on qualifying goods and services) alongside commercial customer loyalty privileges (VIP 10%, Fleet Account 5%).

Prior to this feature, discount calculations were either manually deducted or lacked standardized, audit-compliant transaction records. This introduced risks of cashier miscalculation, discount double-stacking, non-compliance with statutory audit guidelines, and discrepancies during daily cash drawer reconciliation.

This feature establishes the **Customer Discount Matrix Engine (Senior, PWD & VIP) & Subtotal Computation** across the SWIFT POS interface (`/staff/pos` and `/admin/pos`):
- **Standardized Discount Chips**: Single-tap chip selection for `0% Standard`, `5% Fleet`, `10% VIP`, and `20% SC/PWD`.
- **Strict Mutual Exclusivity**: Instant switching between discount tiers with zero compounding or double-stacking; re-tapping the active chip or choosing `0% Standard` resets the discount to zero.
- **Accurate Real-Time Subtotal Breakdown**: Transparent dynamic computation displaying Gross Subtotal, Discount Amount (`-₱XXX.XX`), and Net Total Due in real-time (< 10ms).
- **Compliance & Audit Logging**: Applied discount type, discount percentage rate, and calculated discount monetary value are stamped into the transaction payload, audit trails, and receipt records for tax and legal compliance.
- **Strict Token Adherence**: Zero hardcoded CSS hex/rgb values; full fidelity with SWIFT semantic design tokens (`var(--accent)`, `var(--accent-light)`, `var(--danger)`).

---

## 2. User Stories & Acceptance Criteria

### User Story 1 - Applying Senior Citizen / PWD 20% Statutory Discount (Priority: P1)

* **As a** Cashier,
* **I want to** select the standardized "20% SC/PWD" discount chip for senior citizen or PWD customers,
* **so that** their statutory 20% privilege is accurately deducted from the active cart subtotal with full legal compliance.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Applying Senior Citizen / PWD 20% Discount
  Given an active cart with a subtotal of ₱1,000.00
  When the cashier selects the "20% SC/PWD" discount chip
  Then the discount amount (-₱200.00) is deducted from the subtotal
  And the Total Due synchronously updates to ₱800.00
  And the "20% SC/PWD" chip is rendered in the active accent token state
  And the cart summary line highlights "Discount (20%): -₱200.00" in semantic danger/accent text.
```

---

### User Story 2 - Applying Commercial VIP & Fleet Discounts (Priority: P1)

* **As a** Cashier,
* **I want to** apply commercial loyalty discount chips (e.g., VIP 10% or Fleet 5%),
* **so that** partner garages and loyal patrons receive their agreed commercial privilege accurately and transparently.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Applying Commercial VIP 10% Discount
  Given an active ticket with a subtotal of ₱1,500.00
  When the cashier selects the "10% VIP" discount chip
  Then 10% (-₱150.00) is deducted from the qualifying subtotal
  And the Total Due updates to ₱1,350.00
  And the discount rate and monetary deduction are displayed in the summary breakdown.

Scenario: Applying Commercial Fleet 5% Discount
  Given an active ticket with a subtotal of ₱2,000.00
  When the cashier selects the "5% Fleet" discount chip
  Then 5% (-₱100.00) is deducted from the subtotal
  And the Total Due updates to ₱1,900.00.
```

---

### User Story 3 - Mutual Exclusivity and Resetting Discounts (Priority: P1)

* **As a** Cashier or Store Auditor,
* **I want** discounts to be strictly mutually exclusive,
* **so that** discounts never compound or stack on top of each other, preventing revenue leakage.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Switching Between Discounts Without Stacking
  Given an active cart with "20% SC/PWD" currently applied on a ₱1,000.00 subtotal (Total Due: ₱800.00)
  When the cashier clicks "10% VIP"
  Then the 20% discount is cleanly replaced by the 10% discount
  And the discount amount updates to -₱100.00 (not -₱300.00 or -₱280.00)
  And the Total Due updates to ₱900.00
  And only the "10% VIP" chip shows active styling.

Scenario: Resetting to Standard Pricing
  Given an active cart with any discount applied
  When the cashier clicks "0% Standard" or clicks the currently active discount chip again
  Then the discount rate resets to 0.00
  And the discount amount resets to ₱0.00
  And the Total Due equals the gross subtotal.
```

---

### User Story 4 - Compliance Audit Stamping & Transaction Payload (Priority: P1)

* **As a** Store Auditor or System Administrator,
* **I want** the transaction payload to stamp the applied discount type and percentage rate,
* **so that** statutory audits, BIR compliance reports, and receipt generation can verify all discount applications.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Stamping Discount Data into Transaction Payload
  Given a transaction completed with "20% SC/PWD" discount applied
  When the checkout action or RPC executes
  Then the transaction record includes `discount_type: 'senior_pwd'` (or mapped statutory type), `discount_rate: 0.20`, and `discount_amount: 200.00`
  And an audit log entry records the applied discount rate and authorization context
  And the thermal receipt preview modal reflects the discount breakdown.
```

---

## 3. Business Invariants & Rules

1. **Non-Compounding Rule (Zero Stacking)**: At any given moment, a transaction may only have **one** active discount rule (rate $\in \{0.00, 0.05, 0.10, 0.20\}$). Discounts are applied strictly to the gross ticket subtotal, never compounded sequentially.
2. **Precision & Rounding**: Monetary amounts must be rounded to two decimal places (`Math.round(val * 100) / 100`) using standard half-up rounding.
3. **Total Non-Negativity**: Under no circumstances may `total` be negative (`Math.max(0, subtotal - discountAmount)`).
4. **Subtotal Invariance Across Line-Item Changes**: When line items are added, incremented, decremented, or removed, the active discount percentage must automatically recompute against the new subtotal in real-time.
5. **Clear Cart Reset**: Clearing the active ticket (`clearCart()`) resets the discount selection back to `0% Standard` (`rate: 0.00`, `type: 'none'`).
6. **Interaction with Dual-Tier Pricing**: If wholesale tier pricing is active, the discount rate applies to the active subtotal. Both wholesale pricing mode and customer discount are persisted in the transaction audit.

---

## 4. Non-Functional Requirements & Design Tokens

- **Latency**: Subtotal, discount deduction, and total recalculation must execute synchronously in $< 5\text{ms}$.
- **Accessibility**: Keyboard navigable discount chips with proper `aria-pressed` or `role="radio"` attributes, focus rings, and high-contrast active states satisfying WCAG 2.1 AA.
- **Design Tokens**:
  - Inactive Chip: `bg-bg-base`, `text-text-secondary`, `border-border`, `hover:bg-bg-hover`
  - Active Chip: `bg-accent-light`, `text-accent`, `border-accent` (or `bg-primary`, `text-text-light` as defined in design system)
  - Negative Discount Value: `text-danger`, `font-mono`
  - Total Due: `text-success`, `font-mono`, `text-lg`
