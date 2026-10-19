# Feature Specification: Staff POS Checkout Authorization & Action Guards

**Feature Branch**: `feat/SIAA-84-staff-pos-checkout-guards`  
**Created**: 2026-10-20  
**Status**: Ready for Planning / Implementation  
**Jira Issue**: [SIAA-84](https://the-three-devsketeers.atlassian.net/browse/SIAA-84)  
**Parent Epic**: [SIAA-77](https://the-three-devsketeers.atlassian.net/browse/SIAA-77) (Staff Terminal POS & Attendance Controls)  
**Target View**: Staff Shop Floor Fast-Lane POS (`/staff/pos` and `mockup/staff.html#view-staff-pos`)

---

## 1. Executive Summary & Objective

In high-volume motorcycle parts retail and repair workshops, shop floor terminals (`Terminal #01`) are shared across multi-disciplinary staff members: Cashiers, Shop Floor Mechanics, and Warehouse Inventory Clerks. 

Currently, on `/staff/pos`, the checkout trigger (`handleOpenPayment`) only verifies if `isShiftActive && shiftStatus === "on_shift"`. It does not verify the active operator's assigned role or permission flags. As a consequence, a floor mechanic or warehouse inventory clerk who is clocked in can assemble a parts cart, initiate the cash tender workflow, and complete sales transactions. This circumvents cash drawer accountability, drawer balancing, and store internal control policies.

This specification implements **Staff POS Checkout Authorization & Action Guards**:
1. **Role-Based Checkout Guard**: Fast-Lane POS checkout (`handleOpenPayment` and hotkeys `F9` / `F12`) is restricted strictly to active staff members with authorized roles: `cashier` or `admin`.
2. **Unauthorized Role Alert Modal (`UnauthorizedRoleModal`)**: When an unauthorized profile (e.g., `mechanic`, `inventory_clerk`, or generic staff) attempts to checkout, the tender modal is blocked, and an informative, accessible alert modal is displayed with clear messaging.
3. **Forensic Security Audit Logging**: Every blocked unauthorized checkout attempt immediately logs an immutable security event to `public.system_audit_logs` via `logSecurityEventAction`, recording the staff profile, role, cart value, and terminal IP.
4. **Manager Elevation Override (`ManagerOverrideModal`)**: In urgent customer service scenarios where a mechanic must urgently complete a parts checkout and no cashier is available, a "Request Manager Override" action allows entering an administrator PIN / master password to grant one-time checkout authorization.
5. **State & Store Integration**: `PunchStore` (`lib/store/punch-store.ts`) tracks and exposes `currentStaffRole` across profile switches and storage rehydration, ensuring reliable, synchronous role checks on the POS screen.
6. **SWIFT Semantic Design Tokens**: Full adherence to SWIFT design tokens (`bg-bg-surface`, `bg-bg-card`, `text-text-primary`, `border-border`, `border-danger`, `text-danger`, `bg-primary`, `bg-bg-hover`) with zero hardcoded hex/rgb.

---

## 1.1 Clarifications & Decisions

### Session 2026-10-20
- **Q1: Which roles are permitted to process sales directly?**  
  - **A**: Only profiles with `role === "cashier"` or `role === "admin"`. Profiles with `mechanic`, `inventory_clerk`, or other roles are prohibited from initiating checkout unless elevated.
- **Q2: Does the guard block cart item insertion or catalog browsing?**  
  - **A**: No. Mechanics and warehouse clerks can still look up parts, scan barcodes, and stage items into the cart to assist customers. The guard strictly intercepts the checkout tender action (`Proceed to Payment` button click and `F9`/`F12` hotkeys).
- **Q3: What happens upon successful Manager Elevation?**  
  - **A**: The manager enters their admin PIN/password in `ManagerOverrideModal`. Upon verification (`verifyAdminElevationAction`), one-time checkout authorization is granted, allowing the payment modal to open immediately for the current sale.
- **Q4: What audit log details are recorded on rejection?**  
  - **A**: An audit record with action `"Unauthorized POS Checkout Attempt"`, severity `"warning"` or `"security_alert"`, containing the staff name, role, cart item count, total cart value, and terminal identifier.

---

## 2. User Scenarios & Acceptance Criteria (Mike Cohn Format)

### Primary User Story (Jira SIAA-84)

* **As a** Store Owner or Shop Manager,  
* **I want** the Fast-Lane POS payment tender process locked to active Cashiers and Admins,  
* **So that** mechanics and inventory clerks cannot punch orders, accept cash, or generate sales receipts from the shared terminal.

---

### Scenario 1: Mechanic or Inventory Clerk attempts checkout (Restricted Access)

* **Given** an employee authenticated as a `mechanic` or `inventory_clerk` on the Staff Terminal
* **When** they click "Proceed to Payment" or press the checkout hotkey (`F9` / `F12`)
* **Then** the payment modal does NOT open
* **And** the UI displays an unauthorized guard alert modal (`UnauthorizedRoleModal`):  
  *"Access Restricted: Only active Cashiers or Store Managers can process sales and accept payments."*
* **And** an audit event is logged in `public.system_audit_logs`.

---

### Scenario 2: Authorized Cashier completes checkout (Happy Path)

* **Given** an employee authenticated as a `cashier` or `admin` with an active shift
* **When** they click "Proceed to Payment" or press the checkout hotkey
* **Then** the cash tender modal opens smoothly
* **And** the transaction proceeds to receipt generation upon cash confirmation.

---

### Scenario 3: Manager Elevation Override (Floor Emergency)

* **Given** a mechanic assisting a customer needs to finalize an emergency parts checkout
* **When** the mechanic requests elevation via the restricted modal
* **Then** the terminal prompts for a Manager PIN override (`ManagerOverrideModal`)
* **And** upon entering valid Admin credentials, the one-time sale is authorized under the manager's approval and the payment tender modal opens.

---

### Scenario 4: Keyboard Hotkey Evaluation Guard

* **Given** an unauthorized role is active on the POS terminal
* **When** the employee presses `F9` or `F12`
* **Then** `evaluatePosHotkey` returns `canExecute: false` with reason `"UNAUTHORIZED_ROLE"`
* **And** the `UnauthorizedRoleModal` opens, preventing unauthorized shortcut bypass.

---

## 3. Functional Requirements

- **FR-001**: `PunchStoreState` and `usePunchStore` MUST expose `currentStaffRole: DbUserRole | 'admin' | 'cashier' | 'mechanic' | 'inventory_clerk' | 'staff'`.
- **FR-002**: When switching staff via `switchStaff(profile)`, `PunchStore` MUST update `currentStaffRole` based on the selected profile's `role`.
- **FR-003**: In `StaffPosPage` (`app/staff/pos/page.tsx`), `handleOpenPayment` MUST inspect `currentStaffRole`. If `currentStaffRole !== 'cashier' && currentStaffRole !== 'admin'`, checkout MUST be aborted and `isUnauthorizedModalOpen` set to `true`.
- **FR-004**: `evaluatePosHotkey` in `lib/pos/barcode-scanner.ts` MUST accept `userRole?: string` in options. If `userRole` is neither `'cashier'` nor `'admin'`, it MUST reject the hotkey with `action: 'CHECKOUT_PAY'`, `canExecute: false`, and `reason: 'UNAUTHORIZED_ROLE'`.
- **FR-005**: An `UnauthorizedRoleModal` component MUST be rendered when an unauthorized user attempts checkout, showing the employee's name and role, explaining cashier-only restrictions, offering a "Cancel" button and a "Request Manager Override" button.
- **FR-006**: When checkout is blocked due to unauthorized role, a server action or client call to `logSecurityEventAction` MUST log an audit event with severity `"warning"` containing metadata: `{ attemptedRole: currentStaffRole, staffName: currentStaff, cartItemCount, cartTotal }`.
- **FR-007**: A `ManagerOverrideModal` MUST prompt for the administrator PIN or master password (`verifyAdminElevationAction`). Upon success, one-time checkout authorization is granted, closing the override modal and opening `PaymentModal`.
- **FR-008**: All modal components and alerts MUST strictly use SWIFT semantic design tokens (`bg-bg-surface`, `bg-bg-card`, `text-text-primary`, `border-danger`, `bg-danger/10`, `text-danger`, `text-text-muted`) with zero hardcoded hex or RGB colors.

---

## 4. Non-Functional & Security Requirements

- **NFR-001**: Zero layout shift and immediate sub-millisecond evaluation of checkout guards.
- **NFR-002**: Keyboard accessibility: `Escape` key closes `UnauthorizedRoleModal` and `ManagerOverrideModal`. Tab navigation cycles focus within the modal.
- **NFR-003**: Audit trails are recorded asynchronously without blocking UI responsiveness.
- **NFR-004**: Strict compliance with WCAG AA accessibility contrast ratios.

---

## 5. Success Criteria & Verification Metrics

- **SC-001**: 100% of checkout attempts from `mechanic` and `inventory_clerk` profiles trigger `UnauthorizedRoleModal` without opening `PaymentModal`.
- **SC-002**: 100% of checkout attempts from `cashier` and `admin` profiles with active shifts proceed directly to `PaymentModal`.
- **SC-003**: 100% of rejected checkout attempts generate a structured audit record in `public.system_audit_logs`.
- **SC-004**: Unit tests in `staff-pos-checkout-guard.test.ts` pass with 100% assertion coverage across all role scenarios.
