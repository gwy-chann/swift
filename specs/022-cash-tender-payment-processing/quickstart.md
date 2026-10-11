# Quickstart & Verification Guide: Cash Tender & Payment Processing with Real-Time Change Calculation

**Feature**: `022-cash-tender-payment-processing`  
**Ticket**: [SIAA-21](https://the-three-devsketeers.atlassian.net/browse/SIAA-21)  
**Date**: 2026-10-12  

---

## 1. Automated Test Suite Verification

Run the targeted unit and integration tests:
```bash
npm test -- lib/pos/__tests__/cash-tender.test.ts
```

Run full regression test suite:
```bash
npm test
```

Verify TypeScript types and ESLint:
```bash
npm run typecheck
npm run lint
```

---

## 2. Interactive End-to-End Walkthrough Scenarios

### Scenario 1: Quick Denomination Tender Selection
1. Navigate to `/staff/pos` (or `/admin/pos`).
2. Add items to cart until Total Due is ₱880.00 (e.g., Motul 3100 Gold ₱390 x 2 + Oil Change ₱100 = ₱880.00).
3. Click **COMPLETE SALE (F12)** or press keyboard hotkey `F12`.
4. Observe the Payment Modal opening:
   - Total Due prominently displays `₱880.00`.
   - Four quick denomination buttons appear:
     - `Exact ₱880.00`
     - `₱1,000.00`
     - `₱1,500.00`
     - `₱2,000.00`
5. Click `₱1,000.00`. The cash input updates immediately to `1000`.

### Scenario 2: Real-Time Change Due Math
1. With `1000` entered for a `₱880.00` total:
2. Observe the Change Due callout displaying `₱120.00` in bright green (`text-success` / `bg-success-light`).
3. The "Complete Payment" button is enabled with active primary styling.

### Scenario 3: Under-Tender Validation Guard
1. Type `500` into the Cash Tendered input.
2. Observe:
   - The "Complete Payment" button is immediately disabled (`disabled`, `cursor-not-allowed`).
   - A high-contrast warning banner displays: `Shortage: ₱380.00` in semantic danger token styling (`text-danger` / `bg-danger-light`).
3. Press `Enter` or `F12`. The payment is blocked; no transaction is created.

### Scenario 4: Keyboard Shortcut Execution (F12 / Enter / Esc)
1. Type `1000` (or click `₱1,000.00`).
2. Press `Enter` or `F12`.
3. The checkout action executes, the cash payment modal closes, and the printable **Thermal Receipt Modal** opens displaying:
   - Cash Tendered: `₱1,000.00`
   - Change Due: `₱120.00`
   - Total Due: `₱880.00`
