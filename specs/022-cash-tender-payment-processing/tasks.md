# Implementation Tasks: Cash Tender & Payment Processing with Real-Time Change Calculation

**Feature**: `022-cash-tender-payment-processing`  
**Ticket**: [SIAA-21](https://the-three-devsketeers.atlassian.net/browse/SIAA-21)  
**Date**: 2026-10-12  

---

## Phase 1: Domain Logic & Tests (TDD)
- [x] Task 1.1: Create unit test suite `lib/pos/__tests__/cash-tender.test.ts` validating all 4 acceptance criteria scenarios and edge cases.
- [x] Task 1.2: Implement `lib/pos/cash-tender.ts` (pure functions for `calculateCashTender`, `generateQuickDenominations`, `formatPeso`).
- [x] Task 1.3: Run `npm test` to verify green test execution.

## Phase 2: UI Component Implementation
- [x] Task 2.1: Build `components/pos/cash-tender-modal.tsx` with semantic design tokens, auto-focus, keyboard navigation (`Enter`, `F12`, `Escape`), smart denomination buttons, and real-time change/shortage alert.

## Phase 3: Page Integration & Wiring
- [x] Task 3.1: Wire `CashTenderModal` into `app/staff/pos/page.tsx` (`StaffPosPage`) with state management, hotkeys, and receipt modal transition.
- [x] Task 3.2: Wire `CashTenderModal` into `app/admin/pos/page.tsx` (`AdminPosPage`) ensuring parity between Staff and Admin POS workflows.

## Phase 4: Verification & Quality Gates
- [x] Task 4.1: Run full unit test suite `npm test` and verify zero regressions.
- [x] Task 4.2: Run static analysis `npm run typecheck` and `npm run lint`.
- [x] Task 4.3: Synchronize knowledge graph (`graphify . --update`).
- [x] Task 4.4: Mark all tasks complete and create pull request.
