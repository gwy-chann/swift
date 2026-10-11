# Research & Technical Architecture: Thermal Receipt Generation & Printable Modal

**Feature Branch**: `feat/SIAA-22-thermal-receipt-generation-printable-modal`  
**Jira Issue**: [SIAA-22](https://the-three-devsketeers.atlassian.net/browse/SIAA-22)  
**Spec Reference**: `specs/023-thermal-receipt-generation-printable-modal/spec.md`  

---

## 1. Technical Stack & Environmental Constraints

- **Framework**: Next.js App Router (React 19, TypeScript 5)
- **Styling**: Tailwind CSS v4 with semantic CSS variables defined in `app/globals.css` and tokens in `lib/tokens.ts`.
- **Iconography**: `lucide-react` (`Printer`, `X`, `Search`, `AlertCircle`, `CheckCircle2`, `FileText`, `Scissors`).
- **Typography**: Monospace system font (`font-mono`) simulating 9x17 or 12x24 ESC/POS dot matrix receipt fonts.
- **Printing Media**: Clean browser `@media print` stylesheet with zero background tint, high-contrast pure black text (`#000000`), dashed separator borders, and hidden web chrome (`print:hidden`).
- **Paper Roll Widths**:
  - `58mm` standard pocket/countertop roll (~32 characters wide, ~270px display box).
  - `80mm` standard commercial roll (~48 characters wide, ~350px display box).

---

## 2. Research Findings & Architectural Decisions

### 2.1 Thermal Printing in Web Browsers
Modern POS terminals operating via Chromium browsers trigger physical thermal printers using either:
1. Native ESC/POS raw socket or WebUSB/WebSerial commands.
2. Direct OS printer driver via `window.print()` targeting a thermal receipt printer configured as default.

For portability and immediate deployment without requiring native device drivers or web USB permissions, `window.print()` paired with strict `@media print` CSS rules is the industry standard.
Key styling considerations:
- Page size definition: `@page { size: auto; margin: 0; }` prevents headers, footers, URLs, and date stamps added by default browser print engines.
- Colors: `print:text-black`, `print:bg-white`, `print:border-black`. Thermal paper produces ink via heat; grayscale or pastel colors cause dithering artifacts or unreadable printouts.
- Layout width: Constrain `.thermal-receipt-paper` to exact physical roll widths using Tailwind classes (`w-[270px]` for 58mm, `w-[350px]` for 80mm).

### 2.2 Line Item Breakdown: Parts vs. Workshop Labor
Hybrid repair shop receipts must clearly distinguish physical merchandise from service bay labor:
- **Physical Parts**: Display SKU (`skuOrCode`), item title, shelf location (`shelfLocation`), quantity, and line total.
- **Workshop Labor Services**: Display service code (`skuOrCode`), assigned bay name (`bay`), estimated duration (`duration`), technician rate (`unitPrice`), and line total.
- **Technician Notes**: Display any custom repair notes (e.g. "Front fork seals replaced, test drive verified") indented under the labor item or in a dedicated workshop note block.

### 2.3 Checkout Finalization & "Print Receipt & Finish" Workflow
In the POS workflow:
1. The cashier enters cash tender in `CashTenderModal` (SIAA-21).
2. Upon confirming cash tender, `cartStore.checkout()` executes:
   - Persists transaction record in memory and/or Supabase.
   - Generates unique receipt number `TX-XXXX`.
   - Decrements physical parts inventory stock in `useInventoryStore` / reactive database.
   - Clears active cart items and discounts.
3. The `<ThermalReceiptModal>` automatically displays the newly finalized receipt.
4. The cashier has two primary actions:
   - **"Print Receipt & Finish"**: Triggers `window.print()` and closes the modal (or resets for next sale).
   - **"Close" / "Finish Sale"**: Dismisses the modal without printing, leaving terminal clean for next customer.
   - **"Lookup"**: Allows searching historical receipts (e.g. `TX-1041`) for reprints or customer inquiries.

### 2.4 State & Data Model Mapping
The `ThermalReceiptData` interface in `lib/types/transaction.ts` represents the receipt domain model:
- `receiptNumber: string`
- `timestamp: string`
- `cashierName: string`
- `pricingMode: 'retail' | 'wholesale'`
- `items: ThermalReceiptItem[]`
- `technicianNotes?: string`
- `subtotal: number`
- `discountType?: string | null`
- `discountRate: number`
- `discountAmount: number`
- `totalDue: number`
- `cashTendered: number`
- `changeDue: number`
- `paymentMethod: TransactionPaymentMethod`

---

## 3. Risk Assessment & Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| Browser print dialog prints full web app UI | High (wasted thermal paper, ugly printout) | Use `print:hidden` on all modal chrome, overlays, backdrops, and navigation; only `#thermal-receipt-print-area` has `print:block` with `print:w-full`. |
| Missing SKU or labor rate details | Medium (fails acceptance criteria Scenario 2) | Explicitly render `skuOrCode` for parts and service code + labor rate (`unitPrice`) for labor items. |
| Incomplete transaction finalization | High (stale cart, stock not decremented) | Ensure `cartStore.checkout()` resets cart state and decrements on-hand inventory before modal presentation, or via `onFinish` handler. |
| Color tokens violation | High (Constitution violation) | Zero hardcoded hex/RGB values in component code; use semantic tokens (`bg-bg-surface`, `text-text-primary`, `border-border`, etc.). |
