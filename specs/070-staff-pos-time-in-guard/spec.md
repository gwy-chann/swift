# Feature Specification: Enforce Active Shift Time-In Guard Before Processing Customer Orders in Staff POS

**Feature Branch**: `feat/SIAA-74-staff-pos-time-in-guard`  
**Created**: 2026-10-19  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-74](https://the-three-devsketeers.atlassian.net/browse/SIAA-74)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (Staff Shop Floor Terminal & Time Clock)  
**Target View**: Staff Shop Floor Terminal Fast-Lane POS (`/staff/pos` and `mockup/staff.html#view-staff-pos`)

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts retail and workshop service counters, operational integrity and accounting compliance require all financial transactions, inventory decrements, and sales tickets to be strictly attributed to an active, accountable employee on duty.

Currently in the Staff POS terminal (`/staff/pos`), cashiers can construct carts and complete sales (`COMPLETE SALE (F12)`) regardless of their shift attendance state. When staff members have not clocked in via the digital Punch Clock (`/staff/clock`), or are currently on break or clocked out, sales can still be processed. This creates discrepancies in cashier accountability, commission tracking, audit trails, and shift reconciliation.

This specification enforces an **Active Shift Time-In Guard** across the Staff POS terminal:
1. **Checkout Action Intercept**: Prevent opening payment tender modal (`CashTenderModal`) when cashier is not actively timed in (`shiftStatus !== 'on_shift'` or `!isShiftActive`).
2. **Hotkey (F12) Intercept**: Evaluate attendance guard in hotkey processing so pressing `F12` does not trigger checkout when shift is inactive.
3. **Visual Inactive Shift Indicator & Direct Navigation**: Render a prominent, accessible warning badge/banner in the POS ticket header or cart pane alerting staff of inactive shift status, accompanied by a direct navigation shortcut button to the Punch Clock (`/staff/clock`).
4. **Modal/Alert Dialog on Blocked Attempt**: When checkout is attempted while shift is inactive, present an informative prompt or modal directing the user to time in.
5. **Authentic Cashier Attribution**: Attribute completed transactions to the active shift employee from `usePunchStore` rather than generic placeholder identities.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-74)

* **As a** Shop Floor Cashier or Staff Member,  
* **I want** the system to verify that I am actively timed in (on shift) before allowing customer orders to be processed or completed at the POS terminal,  
* **So that** all completed transactions and sales records are accurately attributed to an active, accountable staff member on duty, preventing untracked floor transactions when not clocked in.

---

### Scenario 1: Block Checkout When Staff Is Not Timed In (Priority: P1)

* **Given** a staff member is operating the Staff POS (`/staff/pos`)
* **And Given** the staff member is NOT currently timed in (`shiftStatus` is `'idle'`, `'completed'`, or `'break'`, or `isShiftActive` is `false`)
* **When** the staff member attempts to proceed with checkout (clicks "COMPLETE SALE" or presses `F12`)
* **Then** the payment tender modal (`CashTenderModal`) MUST NOT open
* **And Then** an alert or modal notification MUST appear stating: "Active Shift Required: You must clock in / time in before processing customer orders." with an action button to navigate directly to the Punch Clock (`/staff/clock`).

---

### Scenario 2: Allow Checkout When Staff Is Actively on Shift (Priority: P1)

* **Given** a staff member is actively timed in (`shiftStatus === 'on_shift'` and `isShiftActive === true`)
* **When** the staff member clicks "COMPLETE SALE (F12)" or presses `F12` with items in the cart
* **Then** the payment tender modal opens as expected and the order can be completed
* **And** the completed transaction record attributes the sale to the active employee identity.

---

### Scenario 3: Visual Inactive Shift Warning Indicator in POS Cart (Priority: P2)

* **Given** a staff member on `/staff/pos` is not timed in
* **When** the POS cart or terminal view is rendered
* **Then** a clear visual warning badge or banner indicates "Not Timed In / Shift Inactive"
* **And** the primary checkout action button reflects a disabled or guarded state with informative tooltip/notice styling.

---

### Scenario 4: Real-Time & Offline State Resilience (Priority: P2)

* **Given** the staff terminal operates offline or online
* **When** attendance state changes occur (clocking in on another tab, break toggles, or store rehydration)
* **Then** the POS interface updates reactively via `usePunchStore` without requiring a page reload.

---

### Scenario 5: Hotkey F12 Guard Evaluation (Priority: P1)

* **Given** a staff member has items in the cart but is not timed in
* **When** the staff member presses `F12`
* **Then** default browser behavior is prevented
* **And** checkout does not initiate, triggering the "Active Shift Required" notification.

---

## 3. Edge Cases & Boundary Conditions

1. **Shift Status Toggles While Cart Is Populated**:
   If a cashier builds a cart while timed in, and subsequently clocks out or pauses for break, the checkout button and hotkey immediately become guarded without loss of cart items.
2. **Break vs. Clocked Out**:
   Both `break` and `completed` / `idle` states are considered non-active for customer sales processing, requiring resume or clock-in.
3. **Empty Cart vs. Inactive Shift Priority**:
   If cart is empty and shift is inactive, attempting checkout warns about cart being empty first or informs about both conditions gracefully.
4. **Offline Persistence**:
   If remote connection is interrupted, the client-side `usePunchStore` state serves as the source of truth for the local terminal attendance guard.

---

## 4. Functional Requirements

- **FR-001**: Staff POS MUST check active attendance state (`isShiftActive` and `shiftStatus === 'on_shift'`) before opening the payment tender modal.
- **FR-002**: If shift is not active, checkout clicks and `F12` hotkeys MUST be blocked and display a dedicated active shift alert/modal.
- **FR-003**: The blocked alert MUST provide a direct link or action button navigating to `/staff/clock`.
- **FR-004**: `HybridCartPane` MUST render a visual status banner when shift is inactive informing the cashier that time-in is required.
- **FR-005**: `evaluatePosHotkey` MUST support checking shift active status and return a distinct evaluation reason (`SHIFT_INACTIVE`).
- **FR-006**: When checkout executes successfully, `checkout()` MUST attach the current staff member's name from `usePunchStore` (`currentStaff`) to the transaction payload.
- **FR-007**: All UI elements MUST strictly utilize SWIFT semantic design tokens (`bg-warning-light`, `text-warning`, `border-border`, etc.) with zero hardcoded colors.
- **FR-008**: The active shift guard modal and banner MUST be fully keyboard-navigable and accessible according to WCAG 2.1 AA.

---

## 5. Key Entities

### ShiftGuardState
- `isShiftActive`: boolean indicating whether an active shift is in progress.
- `shiftStatus`: `'on_shift' | 'break' | 'completed' | 'idle'`.
- `currentStaff`: string representation of active staff member name.

### PosCheckoutContext
- `cartItemCount`: number of items currently in the cart ticket.
- `isModalOpen`: boolean flag for any active overlay modal.
- `isShiftActive`: boolean attendance check flag.

---

## 6. Success Criteria

- **SC-001**: 100% of checkout attempts (click or F12) while shift is inactive or on break are blocked with zero exceptions.
- **SC-002**: Users can navigate from the blocked notification to the punch clock view in 1 click.
- **SC-003**: Completed transactions reliably store the active employee name rather than static fallback text.
- **SC-004**: Automated tests verify guard behavior across all shift states (`on_shift`, `break`, `completed`, `idle`).

---

## 7. Assumptions & Dependencies

- Shift state is managed by `usePunchStore` (`lib/store/punch-store.ts`) and synchronized with Supabase attendance logs.
- Routing to the punch clock view is `/staff/clock`.
- Cash tender and receipt printing workflows remain intact once the guard passes.
