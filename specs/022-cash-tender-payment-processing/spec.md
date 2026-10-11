# Feature Specification: Cash Tender & Payment Processing with Real-Time Change Calculation

**Feature Branch**: `feat/SIAA-21-cash-tender-payment-processing`  
**Created**: 2026-10-12  
**Status**: Specified & Validated  
**Jira Issue**: [SIAA-21](https://the-three-devsketeers.atlassian.net/browse/SIAA-21) (STORY-3.4)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) (EPIC-3: Point of Sale (POS) & Hybrid Service Billing)  
**Input**: `/speckit https://the-three-devsketeers.atlassian.net/browse/SIAA-21`  

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts retail and repair service counters, counter rushes demand fast, friction-free cash payment handling. Cashiers frequently receive larger banknotes (such as ₱500 and ₱1,000 bills) or rounded sums for odd-priced baskets (e.g., ₱880.00 total due). Manual mental arithmetic under time pressure leads to cashier miscalculations, cash drawer variances, customer disputes, and slowdowns at the counter.

This feature introduces the **Cash Tender & Payment Processing Modal with Real-Time Change Calculation** across both Staff (`/staff/pos`) and Admin (`/admin/pos`) POS terminals:
- **Dynamic Quick Currency Denominations**: Automatically renders smart, one-click PHP bill denomination buttons based on the current Total Due (e.g. Exact ₱880, ₱1,000, ₱1,500, ₱2,000).
- **Real-Time Change & Shortage Feedback**: Instantly computes and displays Change Due in high-contrast green (`text-success`) or Shortage in high-contrast red warning (`text-danger`) as the cashier types or clicks.
- **Under-Tender Validation Guard**: Strictly prevents completing payment if cash tendered is less than Total Due, disabling the action button and displaying the remaining balance.
- **Keyboard-First Hotkey Ergonomics**: Seamless hotkey activation (`F12` to open/confirm payment modal, `Enter` to submit, `Esc` to dismiss) to keep hands on the numpad without mouse reliance.
- **Seamless Downstream Integration**: Feeds validated `cashTendered` and `changeDue` directly into the existing atomic checkout pipeline and opens the printable thermal receipt modal (`SIAA-22`).
- **Semantic Design Tokens**: Strict adherence to SWIFT tokens (`bg-bg-surface`, `text-success`, `text-danger`, `bg-primary`, etc.) with zero hardcoded hex/rgb colors.

---

## 2. User Stories & Acceptance Criteria

### User Story 1 - Quick Denomination Tender Selection (Priority: P1)

* **As a** Cashier,
* **I want to** select one-tap Philippine Peso denomination buttons matching or exceeding the Total Due,
* **so that** I can tender standard banknote amounts (₱500, ₱1,000, ₱2,000) or exact payment in one click without manual keyboard entry.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Quick Denomination Tender Selection
  Given the Total Due is ₱880.00
  When the cashier opens the payment modal
  Then quick cash buttons are automatically rendered (Exact ₱880, ₱1,000, ₱1,500, ₱2,000) based on Philippine Peso denominations
  And clicking any quick cash button populates the cash tendered amount immediately.
```

---

### User Story 2 - Real-Time Change Due Calculation (Priority: P1)

* **As a** Cashier,
* **I want to** see the exact change due update synchronously in real-time as I enter or adjust the cash amount,
* **so that** I can hand over exact change with 100% mathematical accuracy.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Real-time Change Due Math
  Given the Total Due is ₱880.00
  When the cashier inputs ₱1,000.00 in cash tendered
  Then Change Due displays "₱120.00" immediately (< 10ms) with high-contrast green formatting
  And the "Complete Payment" button is enabled with active primary styling.
```

---

### User Story 3 - Under-Tender Validation Guard (Priority: P1)

* **As a** Store Supervisor,
* **I want** the system to guard against under-tendered amounts,
* **so that** cashiers cannot accidentally finalize a sale with insufficient funds received.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Under-Tender Validation Guard
  Given the Total Due is ₱880.00
  When the cashier inputs a cash amount less than the total (e.g. ₱500.00)
  Then the system disables the "Complete Payment" button
  And displays a warning indicating "Shortage: ₱380.00" in semantic danger text and background.
```

---

### User Story 4 - Keyboard Shortcut Execution (F12 / Enter) (Priority: P1)

* **As a** Fast-Lane Cashier,
* **I want to** trigger and confirm payment using standard POS keyboard hotkeys (`F12`, `Enter`, `Escape`),
* **so that** I can process customers at maximum speed without lifting my hands from the keyboard/numpad.

**Acceptance Criteria (Gherkin)**:
```gherkin
Scenario: Keyboard Shortcut Execution
  Given a valid tender amount entered in the payment modal
  When the cashier presses Enter or the F12 hotkey
  Then the payment is validated
  And the transaction checkout action executes
  And the printable thermal receipt modal opens upon completion.

Scenario: Modal Dismissal via Escape Key
  Given the payment modal is open
  When the cashier presses Escape or clicks Cancel
  Then the modal closes cleanly without processing checkout or clearing cart items.
```

---

## 3. Business Invariants & Rules

1. **Non-Negative Change Invariant**: `changeDue` = `Math.max(0, Math.round((cashTendered - totalDue) * 100) / 100)`. Change is strictly zero if `cashTendered < totalDue`.
2. **Shortage Calculation Invariant**: `shortage` = `Math.max(0, Math.round((totalDue - cashTendered) * 100) / 100)`.
3. **Checkout Gate**: A transaction cannot be finalized unless `cashTendered >= totalDue` and `cart.items.length > 0`.
4. **Denomination Smart Algorithm**:
   - Denominations include: `[Exact, Next nearest round bill, Next increments up to 2-3 standard denominations]`.
   - Philippine Peso banknote values: ₱20, ₱50, ₱100, ₱200, ₱500, ₱1,000.
   - For total ₱880: Exact (₱880), ₱1,000, ₱1,500, ₱2,000.
   - For total ₱230: Exact (₱230), ₱250, ₱300, ₱500, ₱1,000.
5. **Exact Match Highlighting**: When `cashTendered == totalDue`, Change Due is `₱0.00` ("Exact Amount Received").
6. **Persistence & Receipt Pass-Through**: The verified `cashTendered` and `changeDue` must be passed to `checkout()` and saved into the transaction record and printed on the receipt.

---

## 4. Non-Functional Requirements & Design Tokens

- **Latency**: Real-time change calculation must be synchronous with $< 5\text{ms}$ latency on every keystroke.
- **Accessibility & Focus**:
  - Modal automatically focuses the cash input upon opening (`autoFocus`).
  - Full keyboard navigation (tabbing, Enter, Escape).
  - ARIA attributes: `role="dialog"`, `aria-modal="true"`, `aria-labelledby="payment-modal-title"`.
- **Design Tokens (Mandatory Semantic Colors)**:
  - Container / Backdrop: `bg-black/60` backdrop blur, `bg-bg-surface` modal card, `border-border`.
  - Header / Labels: `text-text-primary`, `text-text-secondary`, `text-text-muted`.
  - Total Due Callout: `font-mono`, `text-text-primary`, `bg-bg-base`, `border-border`.
  - Denomination Chips:
    - Default: `bg-bg-base hover:bg-bg-hover text-text-primary border-border`
    - Selected: `bg-primary text-text-light border-primary`
  - Change Due (Valid): `text-success`, `bg-success-light`, `border-success/30`.
  - Shortage Warning (Invalid): `text-danger`, `bg-danger-light`, `border-danger/30`.
  - Action Buttons: `bg-primary hover:bg-primary-hover text-text-light` (Confirm), `bg-bg-muted text-text-secondary` (Cancel).

---

## 5. Key Entities & Domain Types

- `CashTenderCalculation`:
  - `totalDue: number`
  - `cashTendered: number`
  - `changeDue: number`
  - `shortage: number`
  - `isValid: boolean`
  - `isExact: boolean`
- `QuickDenominationOption`:
  - `label: string`
  - `amount: number`
  - `isExact: boolean`
