# Feature Specification: Barcode Scan-Optimized Fast-Lane Checkout & POS Hotkeys

**Feature Branch**: `feat/SIAA-28-barcode-scan-pos-hotkeys`  
**Created**: 2026-10-15  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-28](https://the-three-devsketeers.atlassian.net/browse/SIAA-28) (STORY-5.1)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  
**Target View**: Staff Shop Floor Terminal Fast-Lane POS (`/staff/pos` and `mockup/staff.html#view-staff-pos`)

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts shops and dealership service counters, checkout speed directly impacts customer wait times, counter congestion, and shop floor throughput. During morning rush hours and evening checkout peaks, cashiers and counter attendants must process customer baskets in under 15 seconds.

To achieve this target, the Staff Shop Floor Terminal Fast-Lane POS requires:
1. **Barcode / SKU Scanner Ingestion**: Seamless ingestion of hardware wedge barcode scanners (and manual keyboard input) via an autofocus search field (`#posItemSearchInput`). Pressing `[ENTER]` or scanning a barcode tag instantaneously appends the item to the active cart ticket with quantity 1, auto-clears the field, and maintains autofocus for rapid subsequent scans.
2. **Instant Category Filter Navigation**: Quick-pick category pills ("All Fast Items", "Brakes", "Drivetrain", "Fluids", "Add Labor / Bay Service", etc.) that filter the product catalog grid in real-time with zero latency.
3. **Dedicated POS Keyboard Hotkeys (`F12` Checkout)**: Global trapping of the `F12` physical function key to prevent default browser behavior (opening DevTools) and immediately launch the payment settlement checkout flow when at least one line item is present in the cart.
4. **Resilient Unrecognized Barcode Handling**: Non-blocking toast error notifications ("Item code or barcode not found") when an invalid, damaged, or uncataloged barcode is scanned, preserving the current active cart ticket and immediately refocusing the scanner.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### User Story (Jira STORY-5.1)

* **As a** Shop Floor Cashier or Parts Counter Attendant,
* **I want to** scan physical barcode tags or type item SKUs directly into an autofocus input field with hotkey checkout support,
* **so that** I can ring out customer counter purchases in under 15 seconds during peak shop floor rush hours.

---

### Scenario 1: Barcode / SKU Scan Instant Cart Ingestion (Priority: P1)

* **Given** an active Fast-Lane POS view (`#view-staff-pos`) on the staff terminal (`/staff/pos`)
* **When** a cashier scans a product barcode or types an exact SKU (e.g. `MOT-3100-10W40`) and presses `[ENTER]`
* **Then** the matching item is immediately appended to the current cart ticket with quantity 1
* **And** the input field is cleared and remains focused for consecutive rapid scanning.

---

### Scenario 2: Quick Category Filter Navigation (Priority: P1)

* **Given** the Fast-Lane POS catalog pane
* **When** a staff member clicks a category pill (e.g., "Brakes", "Drivetrain", "Fluids", "Add Labor / Bay Service")
* **Then** the product grid filters instantaneously to show only items matching that category
* **And** clicking "All Fast Items" restores the full quick-pick item catalog.

---

### Scenario 3: POS Keyboard Hotkey Execution (F12 Checkout) (Priority: P1)

* **Given** an active cart ticket with at least one line item
* **When** the cashier presses the `F12` function key on the physical keyboard
* **Then** default browser behavior (e.g. browser developer tools) is prevented
* **And** the thermal receipt checkout / payment settlement modal opens immediately for payment settlement.

---

### Scenario 4: Unrecognized Barcode Notification & Fallback (Priority: P1)

* **Given** an invalid or uncataloged barcode/SKU entered in `#posItemSearchInput`
* **When** the cashier presses `[ENTER]`
* **Then** the system presents a clear alert ("Item code or barcode not found") without crashing or clearing the existing cart items
* **And** the input field remains focused ready for the next barcode scan.

---

## 3. Dependencies & Relationships

* **Prerequisites (Blocked by)**:
  * [SIAA-10](https://the-three-devsketeers.atlassian.net/browse/SIAA-10) (STORY-1.3: Staff Shop Floor Terminal Layout Shell - provides `/staff/pos` and `#view-staff-pos`)
  * [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18) (STORY-3.1: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine - provides active cart state and calculation)
  * [SIAA-13](https://the-three-devsketeers.atlassian.net/browse/SIAA-13) (STORY-2.1: Master Parts Catalog & Multi-Attribute Search Filtering - provides SKU and barcode indexed records)
* **Blocks (Enables)**:
  * [SIAA-30](https://the-three-devsketeers.atlassian.net/browse/SIAA-30) (STORY-5.3: Staff Shift Attendance Log History & Timesheet Tracking - transaction volume auditing)
  * [SIAA-33](https://the-three-devsketeers.atlassian.net/browse/SIAA-33) (STORY-6.1: Executive KPI Dashboard & Real-Time Operational Health Metric Cards)
* **Related To**:
  * [SIAA-21](https://the-three-devsketeers.atlassian.net/browse/SIAA-21) (Cash Tender & Payment Processing with Real-Time Change Calculation)
  * [SIAA-22](https://the-three-devsketeers.atlassian.net/browse/SIAA-22) (Industry-Standard Thermal Receipt Generation & Printable Modal)
  * [SIAA-25](https://the-three-devsketeers.atlassian.net/browse/SIAA-25) (1-Click Fast-Lane POS Cart Insertion & Live Upsell Dispatch)

---

## 4. Requirements & Specifications

### Functional Requirements

- **FR-001**: The POS search input MUST be rendered with element ID `posItemSearchInput` and automatically receive focus upon mounting and view activation.
- **FR-002**: Scanning a barcode or typing a query into `#posItemSearchInput` and pressing `[ENTER]` MUST query the active catalog (both physical products by SKU/barcode/name and workshop labor services by service code/name).
- **FR-003**: Upon an exact SKU or barcode match, the item MUST be added to the active cart ticket with quantity 1 (or increment quantity if already in cart).
- **FR-004**: If the matched product is physical and has zero stock (`stock <= 0`), the Manager Override Modal MUST be triggered rather than silently failing or incrementing beyond available inventory.
- **FR-005**: After any scan submission (successful match or unrecognized item), `#posItemSearchInput` MUST be cleared and programmatically re-focused (`inputRef.current?.focus()`).
- **FR-006**: When an unrecognized barcode or SKU is submitted, the POS view MUST trigger a prominent notification alert banner/toast stating "Item code or barcode not found" without mutating existing cart items.
- **FR-007**: Category filter pills MUST support one-click instant filtering across all catalog categories (`Brakes`, `Drivetrain`, `Fluids`, etc.) plus workshop labor services (`Add Labor / Bay Service` / `SERVICES`).
- **FR-008**: The "All Fast Items" pill (`ALL`) MUST reset filtering and display the complete quick-pick catalog.
- **FR-009**: The `F12` physical function key MUST be trapped on the POS interface:
  - `e.preventDefault()` MUST be called unconditionally to block native browser DevTools.
  - If the active cart has items (`items.length > 0`), the payment checkout settlement modal (`CashTenderModal`) MUST open immediately.
  - If the active cart is empty (`items.length === 0`), an informative toast MUST notify the cashier ("Cannot checkout: Cart is empty").
- **FR-010**: The parent container of the staff POS view MUST bear `id="view-staff-pos"` to maintain 1:1 specification fidelity with `mockup/staff.html`.
- **FR-011**: All UI styling MUST strictly use semantic SWIFT design tokens (`bg-bg-surface`, `bg-primary`, `bg-secondary`, `text-text-primary`, `border-border`, etc.) with zero hardcoded hex/rgb values.

### Non-Functional Requirements

- **NFR-001**: **Latency**: Scan ingestion and cart line-item recalculation MUST execute in under 50ms synchronously.
- **NFR-002**: **Hardware Compatibility**: Compatible with USB and Bluetooth HID barcode scanners configured in keyboard wedge mode emitting ASCII string + carriage return (`\r` or `\n`).
- **NFR-003**: **Accessibility (WCAG 2.1 AA)**: Full keyboard navigability without mouse dependence (`[ENTER]` for scan, `[F12]` for checkout, `[Escape]` for modal dismissal).
- **NFR-004**: **Theme Consistency**: High-contrast error and success feedback banners compatible with both Light and Dark modes.

---

## 5. Assumptions & Edge Cases

1. **Hardware Scanner Emulation**: Barcode scanners output rapid sequential characters ending in `Enter`. The input event loop must handle standard React synthetic events without debouncing that could drop characters.
2. **Case Sensitivity**: SKU and barcode matching MUST be case-insensitive and trim leading/trailing whitespace.
3. **Out-of-Stock Scans**: If a barcode for an item with 0 stock is scanned, it triggers the existing manager override flow, ensuring stock guard policies are respected.
4. **Rapid Consecutive Scans**: Scanning items rapidly in succession will sequentially append each item without race conditions or input focus loss.
