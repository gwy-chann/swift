# Implementation Plan: Active Shift Time-In Guard in Staff POS

**Feature**: `070-staff-pos-time-in-guard`  
**Jira Issue**: [SIAA-74](https://the-three-devsketeers.atlassian.net/browse/SIAA-74)  
**Date**: 2026-10-19  

---

## 1. Component Hierarchy & Boundary Mapping

```text
app/staff/pos/page.tsx (Client Component: POS Page Container)
├── HybridCatalogPane (Fast-lane product & service lookup)
├── HybridCartPane (Cart items, discount matrix, total due)
│   └── InactiveShiftBanner (Conditional warning when !isShiftActive)
├── CashTenderModal (Checkout tender modal - guarded)
├── ThermalReceiptModal (Post-checkout receipt printing)
├── ManagerOverrideModal (OOS item supervisor override)
└── ActiveShiftGuardModal (NEW: Modal notification when checkout is blocked)
```

---

## 2. File Modification & Creation Inventory

| File Path | Action | Rationale |
|:---|:---|:---|
| `specs/070-staff-pos-time-in-guard/contracts/shift-guard.contract.ts` | Create | Pure evaluation helper and Zod contracts for shift guard. |
| `lib/pos/barcode-scanner.ts` | Modify | Extend `evaluatePosHotkey` with `isShiftActive?: boolean` and `reason: "SHIFT_INACTIVE"`. |
| `components/pos/active-shift-guard-modal.tsx` | Create | Reusable accessible modal dialog warning of inactive shift with direct Punch Clock redirect button. |
| `components/pos/hybrid-cart-pane.tsx` | Modify | Accept shift status props / consume `usePunchStore` to show visual warning banner & guard checkout button state. |
| `app/staff/pos/page.tsx` | Modify | Wire `usePunchStore`, guard `handleOpenPayment`, handle `F12` hotkey inactive shift reason, render `ActiveShiftGuardModal`, and pass `currentStaff` to `checkout()`. |
| `tests/unit/pos/shift-guard.test.ts` | Create | Comprehensive unit tests for `evaluateShiftGuard` and `evaluatePosHotkey` shift guard branch. |
| `tests/unit/components/active-shift-guard-modal.test.tsx` | Create | Component tests for `ActiveShiftGuardModal` and guarded checkout interaction. |

---

## 3. SWIFT Design Tokens Adherence

- **Warning Banner in Cart Pane**:
  - Container: `p-2.5 rounded-lg bg-warning/15 border border-warning/40 text-warning flex items-center justify-between gap-2 shadow-2xs`
  - Icon: `<Clock className="w-4 h-4 text-warning" />`
  - Action link: `text-xs font-bold underline hover:text-warning/80 text-warning`
- **ActiveShiftGuardModal**:
  - Modal Shell: `bg-bg-surface border border-border rounded-2xl shadow-2xl`
  - Header & Icon: `p-3 rounded-full bg-warning/15 text-warning`
  - Title: `text-base font-extrabold text-text-primary`
  - Description: `text-xs text-text-secondary leading-relaxed`
  - Primary Button: `bg-primary hover:bg-primary-hover text-text-light font-bold`
  - Secondary Button: `bg-bg-base border border-border text-text-secondary hover:bg-bg-hover font-semibold`

---

## 4. Test Strategy

1. **Unit Tests (`shift-guard.test.ts`)**:
   - `evaluateShiftGuard(false, 'idle')` -> `isAllowed: false, reason: 'NOT_CLOCKED_IN'`
   - `evaluateShiftGuard(true, 'break')` -> `isAllowed: false, reason: 'ON_BREAK'`
   - `evaluateShiftGuard(false, 'completed')` -> `isAllowed: false, reason: 'SHIFT_COMPLETED'`
   - `evaluateShiftGuard(true, 'on_shift')` -> `isAllowed: true, reason: 'OK'`
   - `evaluatePosHotkey('F12', { cartItemCount: 1, isModalOpen: false, isShiftActive: false })` -> `canExecute: false, reason: 'SHIFT_INACTIVE'`
   - `evaluatePosHotkey('F12', { cartItemCount: 1, isModalOpen: false, isShiftActive: true })` -> `canExecute: true`
2. **Component Tests**:
   - `ActiveShiftGuardModal` renders when `isOpen={true}`, displays prompt message, fires `onClose` on dismiss, and contains link/button to `/staff/clock`.
   - `HybridCartPane` renders inactive shift banner when shift is inactive.
