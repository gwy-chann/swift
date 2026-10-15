# Quickstart & Verification Guide: Barcode Scan-Optimized Fast-Lane Checkout & POS Hotkeys

**Feature**: `029-barcode-scan-pos-hotkeys`  
**Jira Ticket**: [SIAA-28](https://the-three-devsketeers.atlassian.net/browse/SIAA-28) (STORY-5.1)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  

---

## 1. Prerequisites & Environment Setup

Ensure you are working inside the dedicated feature worktree:
```bash
# Check branch and worktree
git status
# Branch must be: feat/SIAA-28-barcode-scan-pos-hotkeys
```

Verify that local dependencies and environment are present:
```bash
npm test
```

---

## 2. Interactive Verification Scenarios

Start the development server:
```bash
npm run dev
```
Navigate in your browser to: `http://localhost:3000/staff/pos`

### Scenario 1: Barcode / SKU Scan Instant Cart Ingestion
1. Verify the cursor is automatically focused inside `#posItemSearchInput` ("Scan Barcode / SKU & hit [ENTER]...").
2. Type or simulate a barcode scan for an in-stock item (e.g. `MOT-3100-10W40`) and press `[ENTER]`.
3. **Expected Result**:
   - The Motul 3100 10W40 product is immediately appended to the active cart ticket on the right pane with quantity 1.
   - The search input is immediately cleared (`value === ''`).
   - The search input remains focused so the cashier can immediately scan the next item.

### Scenario 2: Quick Category Filter Navigation
1. In the catalog pane header, observe the category tabs:
   - `All Fast Items`
   - `Brakes`
   - `Drivetrain`
   - `Fluids`
   - `Add Labor / Bay Service`
2. Click `Fluids`.
   - **Expected Result**: The product card grid filters instantaneously to show only engine oils and fluid products.
3. Click `Add Labor / Bay Service`.
   - **Expected Result**: The grid displays workshop labor bay services (e.g., Oil Change, Brake Pad Installation).
4. Click `All Fast Items`.
   - **Expected Result**: The full catalog of fast-pick items and services is restored.

### Scenario 3: POS Keyboard Hotkey Execution (`F12` Checkout)
1. Ensure the cart ticket has at least one line item (from Scenario 1).
2. Press the `F12` function key on the physical keyboard.
3. **Expected Result**:
   - Browser DevTools is blocked and DOES NOT open (`e.preventDefault()`).
   - The Cash Tender payment modal opens immediately for payment settlement.
4. Close the modal, clear the cart ticket (empty cart), and press `F12`.
   - **Expected Result**: DevTools is blocked, and a high-contrast toast banner informs the cashier: "Cannot checkout: Cart is empty."

### Scenario 4: Unrecognized Barcode Notification & Fallback
1. With items in the active cart ticket, focus `#posItemSearchInput`.
2. Type an uncataloged barcode/SKU (e.g. `UNKNOWN-BARCODE-9999`) and press `[ENTER]`.
3. **Expected Result**:
   - A high-contrast toast notification banner appears: `"Item code or barcode not found"`.
   - The existing cart items and quantities remain completely intact.
   - The input is cleared and automatically refocused for the next scan attempt.

---

## 3. Automated Test Verification

Run the automated test suite covering all scenarios:
```bash
node --env-file=.env.local --experimental-strip-types --test lib/pos/__tests__/barcode-scanner.test.ts
npm test
npm run typecheck
npm run lint
```
