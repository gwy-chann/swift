# Quickstart & Verification Guide: Thermal Receipt Generation & Printable Modal

**Feature Branch**: `feat/SIAA-22-thermal-receipt-generation-printable-modal`  
**Jira Issue**: [SIAA-22](https://the-three-devsketeers.atlassian.net/browse/SIAA-22)  
**Spec Reference**: `specs/023-thermal-receipt-generation-printable-modal/spec.md`  

---

## 1. Prerequisites & Environment Setup

Verify you are inside the dedicated feature worktree:
```bash
# Verify current branch is feat/SIAA-22-thermal-receipt-generation-printable-modal
git branch --show-current
```

Run typecheck and unit tests:
```bash
npm run typecheck
npm test
```

---

## 2. Interactive Verification Scenarios

### Scenario 1: Thermal Receipt Layout & Header Formatting
1. Navigate to the POS Cashier Terminal at `/staff/pos` or `/admin/pos`.
2. Add a physical part (e.g. `Motul 7100 10W-40 Fully Synthetic Oil`) and workshop service (e.g. `Oil Change & Filter Replacement`) to the cart.
3. Click **"Complete Sale (F12)"** or press `F12`.
4. Tender exact cash in `CashTenderModal` and confirm payment.
5. **Observe**: The `<ThermalReceiptModal>` opens displaying:
   - Header: `"SWIFT MOTO SERVICE"`, `104 Rizal Ave, Motor City`, `TIN: 409-281-992-000`, `Tel: (02) 8921-4450`.
   - Metadata: Receipt number matching `TX-XXXX`, current date/time, cashier name, pricing tier (`RETAIL`).
   - Monospace typography (`font-mono`) simulating authentic thermal printer font.

### Scenario 2: Itemized Breakdown of Physical Parts vs. Bay Labor
1. Inspect the itemized table inside the active receipt modal:
   - **Physical Part**: Displays SKU (e.g. `OIL-MOTUL-7100`), item name, quantity, shelf location (if available), and line amount.
   - **Workshop Labor**: Displays service code (e.g. `SRV-OIL-CHANGE`), bay name (e.g. `Bay 1 - Quick Service`), duration (e.g. `20 mins`), and labor rate (e.g. `₱150.00`).
   - **Technician Notes**: If present on the transaction, notes render below the workshop service.

### Scenario 3: Payment & Warranty Summary
1. Inspect the totals and footer section:
   - Displays Subtotal, Discount line (if applied), Total Due, Cash Tendered, and Change Due.
   - Footer contains `"Parts warranty valid for 7 days with receipt."`.
   - Displays barcode simulation with receipt number.

### Scenario 4: Roll Width Switcher (58mm vs 80mm)
1. In the modal top header, click the `58mm` button.
   - **Observe**: The receipt shrinks to 270px width with compact 11px font.
2. Click the `80mm` button.
   - **Observe**: The receipt expands to 350px width with standard 12px font.

### Scenario 5: Print Execution & State Finalization
1. Click the primary action button **"Print Receipt & Finish"** (or use browser print shortcut).
   - **Observe**: The browser print dialog triggers.
   - Notice `@media print` styles: application navbar, header, buttons, and backdrop are hidden; only pure black-and-white receipt prints.
2. Confirm or close print dialog:
   - The modal closes.
   - The active cart is reset to 0 items.
   - Physical part stock in the inventory catalog reflects decremented quantity.

### Scenario 6: Historical Receipt Lookup
1. In the receipt modal top search bar, enter canonical receipt `TX-1041` and click **"Lookup"**.
2. **Observe**: The mock/database transaction for `TX-1041` loads immediately into the receipt preview with historical items and totals.
