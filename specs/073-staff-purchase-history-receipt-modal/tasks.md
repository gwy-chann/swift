# Implementation Tasks: SIAA-73 Staff Purchase History & Thermal Receipt Modal

**Branch**: `feat/SIAA-73-staff-purchase-history-receipt-modal`  
**Status**: Ready for Implementation  
**Specification**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)  

---

## Phase 1: Domain Logic & Warranty Calculations (TDD)
- [ ] **Task 1.1**: Create `lib/staff/warranty.ts` with `calculateWarrantyStatus(timestamp, now)` and export `WarrantyStatus` interface.
- [ ] **Task 1.2**: Write unit tests in `lib/staff/__tests__/warranty.test.ts` covering 0-day, 6-day, exact 7-day boundary, and >7-day expired transactions.
- [ ] **Task 1.3**: Run `npm test` to verify green tests on warranty logic.

## Phase 2: Refactor `ThermalReceiptModal` Component
- [ ] **Task 2.1**: Remove search input bar, lookup query state, lookup error state, and search handler from `components/pos/thermal-receipt-modal.tsx`.
- [ ] **Task 2.2**: Remove 58mm / 80mm roll switcher toggle buttons from modal header; lock roll width strictly to 80mm.
- [ ] **Task 2.3**: Remove simulated barcode line pattern and `*TX-...*` text from receipt footer in `components/pos/thermal-receipt-modal.tsx`.
- [ ] **Task 2.4**: Verify existing POS usages in `app/staff/pos/page.tsx` and `app/admin/pos/page.tsx` continue compiling cleanly with `npx tsc --noEmit`.

## Phase 3: Staff Navigation & Route Structure
- [ ] **Task 3.1**: Add "Purchase History" navigation item (`href: '/staff/history'`, icon: `History`) to `STAFF_NAV_ITEMS` in `lib/staff/navigation.ts`.
- [ ] **Task 3.2**: Update `getStaffViewTitle` in `lib/staff/navigation.ts` to return `"Purchase History"` for `/staff/history`.

## Phase 4: Staff Purchase History View & UI Components
- [ ] **Task 4.1**: Create `components/staff/history/warranty-badge.tsx` rendering semantic token-styled badges (`bg-success-light text-success` for valid, `bg-bg-muted text-text-muted` for expired).
- [ ] **Task 4.2**: Create `components/staff/history/purchase-history-view.tsx` featuring:
  - Search input for Receipt #, cashier, or item SKU.
  - Filter pills for date/warranty (All, Warranty Eligible ≤ 7d, Today, Past 30d) and payment methods.
  - Interactive table displaying Receipt #, date/time, cashier, items summary, total amount, payment method, and warranty badge.
  - Expandable row itemized lines showing parts (with SKU and shelf location) and services (with bay and code).
  - Row action button "Reprint / View Receipt" opening `ThermalReceiptModal`.
- [ ] **Task 4.3**: Create `app/staff/history/page.tsx` as a Server Component fetching initial transactions via `getTransactionsAction()` and rendering `PurchaseHistoryView`.

## Phase 5: Verification, Quality Gates & Atomic Commits
- [ ] **Task 5.1**: Run full TypeScript check (`npx tsc --noEmit`).
- [ ] **Task 5.2**: Run full test suite (`npm test`).
- [ ] **Task 5.3**: Commit atomic changes following `.agents/rules/atomic-commit.md`.
- [ ] **Task 5.4**: Create pull request following `create-pr` skill.
