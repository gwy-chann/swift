# Architecture Research: Active Shift Time-In Guard in Staff POS

**Feature**: `070-staff-pos-time-in-guard`  
**Jira Issue**: [SIAA-74](https://the-three-devsketeers.atlassian.net/browse/SIAA-74)  
**Date**: 2026-10-19  

---

## 1. Stack Constraints & Dependencies

- **Framework**: Next.js 15+ (App Router), React 19 (`useSyncExternalStore`, Client Component boundary)
- **Styling**: Tailwind CSS v4 using semantic design tokens (`bg-warning/15`, `text-warning`, `border-warning/30`, `bg-bg-surface`, `text-text-primary`)
- **State Engines**:
  - `usePunchStore` (`lib/store/punch-store.ts`): Reactive external store tracking `isShiftActive`, `shiftStatus`, `currentStaff`.
  - `useCartStore` (`lib/store/cart-store.ts`): Cart items, totals, modal control (`openPaymentModal`, `checkout`).
- **Domain Utilities**:
  - `evaluatePosHotkey` (`lib/pos/barcode-scanner.ts`): Evaluates physical keyboard inputs (`F12`, `Escape`).

---

## 2. Existing System Architecture Analysis

1. **Staff POS Workflow**:
   - `app/staff/pos/page.tsx` renders `HybridCatalogPane` and `HybridCartPane`.
   - `handleOpenPayment` opens `CashTenderModal`.
   - On keyboard `F12`, `evaluatePosHotkey` checks `cartItemCount` and `isModalOpen`.
   - `handleConfirmPayment` invokes `checkout({ cashier: 'Fast-Lane Cashier', ... })`.
   - **Gap Identified**: There is zero evaluation of `isShiftActive` or `shiftStatus === 'on_shift'` in either `handleOpenPayment`, `HybridCartPane`, or `evaluatePosHotkey`.
   - **Cashier Attribution Gap**: The cashier name is hardcoded to `'Fast-Lane Cashier'` instead of reading `currentStaff` from `usePunchStore`.

2. **Shift Attendance Store (`PunchStore`)**:
   - Tracks `isShiftActive: boolean`, `shiftStatus: 'on_shift' | 'break' | 'completed' | 'idle'`, and `currentStaff: string`.
   - Subscribed to by `components/staff/staff-sidebar.tsx`, `components/staff/shift-duration-timer.tsx`, and `app/staff/clock/page.tsx`.
   - Seamlessly accessible across client components via `usePunchStore()`.

---

## 3. Architecture Decisions (ADRs)

### ADR-1: Pure Function Extension for Hotkey Evaluation
- **Decision**: Extend `evaluatePosHotkey` options in `lib/pos/barcode-scanner.ts` to include `isShiftActive?: boolean`.
- **Reasoning**: Keeping hotkey evaluation pure and decoupled from React hooks enables 100% deterministic unit testing without mocking stores or DOM events.
- **Contract**:
  ```ts
  export type PosHotkeyEvaluationResult =
    | { action: "CHECKOUT_PAY"; preventDefault: true; canExecute: true; }
    | {
        action: "CHECKOUT_PAY";
        preventDefault: true;
        canExecute: false;
        reason: "CART_EMPTY" | "MODAL_ACTIVE" | "SHIFT_INACTIVE";
        message?: string;
      }
    | ...
  ```

### ADR-2: Multi-Layer Guarding Strategy
- **Decision**: Guard checkout across three complementary levels:
  1. **UI Layer (`HybridCartPane`)**:
     - Visual banner when shift is inactive alerting cashier that clocking in is required.
     - Disabled or warning-styled Complete Sale button when shift is inactive.
  2. **Event / Interaction Layer (`app/staff/pos/page.tsx`)**:
     - Intercept `handleOpenPayment` to display `ActiveShiftGuardModal` if `!isShiftActive` or `shiftStatus !== 'on_shift'`.
     - Intercept `F12` hotkey when `reason === "SHIFT_INACTIVE"`.
  3. **Data Attribution Layer (`handleConfirmPayment`)**:
     - Dynamically pass `currentStaff || "Staff Cashier"` to `checkout()`.

### ADR-3: Dedicated Reusable Modal (`ActiveShiftGuardModal`)
- **Decision**: Create `components/pos/active-shift-guard-modal.tsx` following existing modal patterns (`CashTenderModal`, `ManagerOverrideModal`).
- **Features**:
  - Distinct warning iconography (`AlertTriangle` / `Clock`).
  - Clear explanation: "Active Shift Required: You must clock in / time in before processing customer orders."
  - Direct "Time In at Punch Clock" action button navigating to `/staff/clock`.
  - Accessible dialog structure with escape hotkey and focus trapping.

---

## 4. Design Tokens & Styling Mapping

All component styling will adhere to SWIFT tokens:
- **Inactive Shift Warning Banner**: `bg-accent/15 border border-accent/40 text-accent` or `bg-danger/10 border border-danger/30 text-danger`.
- **Primary Action (Time In)**: `bg-primary hover:bg-primary-hover text-text-light`.
- **Secondary Action (Cancel / Dismiss)**: `bg-bg-base border border-border text-text-secondary hover:bg-bg-hover`.
- **Modal Backdrop**: `fixed inset-0 z-50 bg-black/60 backdrop-blur-xs`.
