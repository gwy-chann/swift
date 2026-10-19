# Implementation Tasks: Active Shift Time-In Guard in Staff POS

**Feature**: `070-staff-pos-time-in-guard`  
**Jira Issue**: [SIAA-74](https://the-three-devsketeers.atlassian.net/browse/SIAA-74)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5)  
**Status**: In Progress  

---

## Phase 1: Setup & Domain Contracts

- [ ] T001 Define pure domain evaluation function and schemas in `specs/070-staff-pos-time-in-guard/contracts/shift-guard.contract.ts`
- [ ] T002 Extend `evaluatePosHotkey` types and implementation in `lib/pos/barcode-scanner.ts` to accept `isShiftActive?: boolean` and evaluate `reason: "SHIFT_INACTIVE"`

---

## Phase 2: TDD & Domain Logic Tests

- [ ] T003 [P] Create unit test suite `tests/unit/pos/shift-guard.test.ts` covering:
  - `evaluateShiftGuard` across all shift states (`on_shift`, `break`, `completed`, `idle`)
  - `evaluatePosHotkey` with `isShiftActive: false` and `isShiftActive: true`
  - Hotkey priority handling (empty cart vs inactive shift vs active modal)
- [ ] T004 Run and verify unit tests pass with `npm test tests/unit/pos/shift-guard.test.ts`

---

## Phase 3: UI Components

- [ ] T005 [P] Create `components/pos/active-shift-guard-modal.tsx`:
  - Accessible modal dialog (`role="dialog"`, `aria-modal="true"`)
  - Visual warning icon with SWIFT semantic design tokens (`bg-warning/15`, `text-warning`)
  - Descriptive notice: "Active Shift Required: You must clock in / time in before processing customer orders."
  - Direct action button to `/staff/clock` and secondary dismiss action
- [ ] T006 Update `components/pos/hybrid-cart-pane.tsx`:
  - Consume or accept `isShiftActive` and `shiftStatus`
  - Render an Inactive Shift Warning Banner when `!isShiftActive || shiftStatus !== 'on_shift'`
  - Update Complete Sale button state with clear visual styling and tooltip when shift is inactive

---

## Phase 4: Integration & POS View Wiring

- [ ] T007 Update `app/staff/pos/page.tsx`:
  - Consume `usePunchStore` (`isShiftActive`, `shiftStatus`, `currentStaff`)
  - Guard `handleOpenPayment` so that when `!isShiftActive || shiftStatus !== 'on_shift'`, `isShiftGuardModalOpen` is set to `true` and `CashTenderModal` does not open
  - Handle `F12` hotkey evaluation with `isShiftActive` option and open `ActiveShiftGuardModal` on `SHIFT_INACTIVE`
  - Render `ActiveShiftGuardModal`
  - Update `handleConfirmPayment` to pass `currentStaff || "Staff Cashier"` to `checkout()`
- [ ] T008 [P] Create component test suite `tests/unit/components/active-shift-guard-modal.test.tsx` verifying modal rendering, navigation link, and button interactions

---

## Phase 5: Verification & Architectural Convergence

- [ ] T009 Execute full test suite `npm test`
- [ ] T010 Execute static type check `npx tsc --noEmit`
- [ ] T011 Execute linter `npm run lint`
- [ ] T012 Verify all tasks in `tasks.md` are marked complete
