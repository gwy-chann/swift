# Implementation Tasks: Staff POS Checkout Authorization & Action Guards

**Feature**: `084-staff-pos-checkout-guards`  
**Jira Issue**: [SIAA-84](https://the-three-devsketeers.atlassian.net/browse/SIAA-84)  
**Date**: 2026-10-20  

---

## Phase 1: Contracts & Type Definitions

- [x] **TASK-001**: Define checkout authorization contracts and evaluator logic in `lib/contracts/checkout-guard.ts`.
  - Export `StaffRole`, `PosCheckoutGuardContext`, and `PosCheckoutGuardResult`.
  - Implement pure evaluator `evaluatePosCheckoutAuthorization(context)`.

---

## Phase 2: Core Store & Hotkey Guard Extensions

- [x] **TASK-002**: Extend `PunchStore` (`lib/store/punch-store.ts`) with `currentStaffRole`.
  - Add `currentStaffRole: StaffRole` to `PunchStoreState` and `role?: StaffRole` to `StaffMemberShiftState`.
  - Initialize `currentStaffRole` from profile (defaulting to `'cashier'` for Mike Morales).
  - Update `switchStaff` to accept optional `role` and resolve from `MOCK_STAFF_PROFILES`.
  - Expose `currentStaffRole` from `usePunchStore()`.
  - Preserve `currentStaffRole` in `localStorage` serialization (`swift_staff_shift_state`).
- [x] **TASK-003**: Extend `evaluatePosHotkey` in `lib/pos/barcode-scanner.ts`.
  - Add `userRole?: string` to options.
  - Support `F12` and `F9` keys.
  - Reject checkout with `reason: 'UNAUTHORIZED_ROLE'` when role is neither `'cashier'` nor `'admin'`.

---

## Phase 3: Unit & Integration Testing (TDD)

- [x] **TASK-004**: Create comprehensive test suite in `lib/pos/__tests__/staff-pos-checkout-guard.test.ts`.
  - Test pure evaluator `evaluatePosCheckoutAuthorization` with cashier, admin, mechanic, inventory clerk, and staff roles.
  - Test one-time manager override allowance.
  - Test inactive shift and empty cart rejection precedence.
  - Test `evaluatePosHotkey` rejection on `F12` and `F9` for unauthorized roles.
  - Test `PunchStore` tracking of `currentStaffRole` across `switchStaff`.

---

## Phase 4: UI Components & Modal Creation

- [x] **TASK-005**: Create `UnauthorizedRoleModal` component in `components/pos/unauthorized-role-modal.tsx`.
  - Semantic SWIFT tokens (`bg-bg-surface`, `bg-bg-card`, `border-danger`, `text-text-primary`, `bg-danger/10`, `text-danger`).
  - Clear heading, operator badge, restriction explanation, "Cancel / Return to Cart" button, and "Request Manager Override" button.
- [x] **TASK-006**: Create `ManagerOverrideModal` component in `components/pos/manager-override-modal.tsx`.
  - Prompt for Manager PIN / Admin Password.
  - Integrate with `verifyAdminElevationAction` server action.
  - Provide keypad and keyboard input with validation and error states.

---

## Phase 5: Staff POS Page Wiring & Security Audit Logging

- [x] **TASK-007**: Wire checkout guard and modals in `app/staff/pos/page.tsx`.
  - Consume `currentStaffRole` from `usePunchStore()`.
  - Update `handleOpenPayment` to evaluate role guard.
  - Open `UnauthorizedRoleModal` when unauthorized role attempts checkout.
  - Log audit event to `public.system_audit_logs` via `logSecurityEventAction` on rejection.
  - Wire `ManagerOverrideModal` to grant one-time checkout authorization and open `PaymentModal`.
  - Update keyboard hotkey listener to pass `userRole: currentStaffRole`.

---

## Phase 6: Verification, Quality Gates & Sync

- [x] **TASK-008**: Run test suite (`npm test -- lib/pos/__tests__/staff-pos-checkout-guard.test.ts`).
- [x] **TASK-009**: Run static analysis (`npx tsc --noEmit` and `npm run lint`).
- [x] **TASK-010**: Trigger Graphify auto-sync (`graphify . --update`) and review AST map.
