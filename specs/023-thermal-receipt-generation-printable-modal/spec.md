# Feature Specification: Industry-Standard Thermal Receipt Generation & Printable Modal

**Feature Branch**: `feat/SIAA-22-thermal-receipt-generation-printable-modal`  
**Created**: 2026-10-12  
**Status**: Ready for Planning  
**Jira Issue**: [SIAA-22](https://the-three-devsketeers.atlassian.net/browse/SIAA-22) (STORY-3.5)  
**Parent Epic**: [SIAA-3](https://the-three-devsketeers.atlassian.net/browse/SIAA-3) (EPIC-3: Point of Sale & Hybrid Service Billing)  

---

## 1. Executive Summary & Objective

In motorcycle repair shops and retail parts counters, paper receipts serve as the authoritative proof of purchase, legal tax identification, and customer warranty certificate. Standard desktop or full-page A4 printing is inappropriate for high-volume retail checkout desks; POS cashiers require dense, fast, monospace thermal printing formatted for standard continuous roll widths (58mm pocket/countertop or 80mm heavy-duty commercial thermal printers).

While prior stories established hybrid cart line items (SIAA-18), dual-tier pricing (SIAA-19), customer discount rules (SIAA-20), cash tender processing (SIAA-21), and the backend checkout atomic transaction engine (SIAA-51), the POS terminal requires a dedicated, robust, and accessible Thermal Receipt Modal that bridges finalized transactions with physical paper printing and state completion.

This feature delivers:
1. **Industry-Standard Monospace Thermal Formatting**: Authentic 58mm and 80mm roll width formatting with store branding ("SWIFT MOTO SERVICE", Address, TIN, Phone), sequential receipt number (`TX-XXXX`), transaction timestamp, cashier identity, and simulated scan-ready receipt barcode.
2. **Hybrid Itemized Line-Item Breakdown**: Clear tabular separation of:
   - Physical parts: item SKU, product name, quantity, and subtotal.
   - Workshop bay labor: service code, bay name, technician duration, and unit labor rate.
   - Technician notes & instructions attached to workshop jobs.
3. **Financial Math & Warranty Summary**: Transparent itemization of gross subtotal, applied customer/statutory discount (Senior, PWD, Wholesale, VIP), final total due, cash tendered, exact change due, payment method, and mandatory 7-day parts replacement warranty policy.
4. **Print Execution & Transaction Finalization Workflow**: Ergonomic cashier controls featuring a "Print Receipt & Finish" primary action, native browser print formatting (`@media print` clean thermal print styles), active cart/discount reset upon finalization, and verification that inventory stock is decremented and transactions logged into the audit trail.
5. **Receipt Lookup & Historical Reprint**: Support for previewing newly completed checkout transactions as well as on-demand lookup and reprinting of historical receipts (e.g. `TX-1041`).

---

## 2. User Scenarios & Acceptance Criteria

### User Story 1 - Thermal Receipt Layout Formatting (Priority: P1)

* **As a** Cashier or Motorcycle Owner,
* **I want to** preview and print a clean, industry-standard thermal receipt detailing parts, labor services, technician notes, discounts, and payment math,
* **so that** the customer receives a valid proof of purchase and warranty document while store inventory is automatically decremented.

#### Scenario 1: Thermal Receipt Layout Formatting
* **Given** a successful checkout trigger in the POS cashier terminal,
* **When** the Thermal Receipt modal opens,
* **Then** it renders a monospace receipt layout conforming to 58mm/80mm thermal paper widths,
* **And** it displays the Store Header:
  - Store Name: `"SWIFT MOTO SERVICE"`
  - Address: `"104 Rizal Ave, Motor City"`
  - Tax Identification Number: `"TIN: 409-281-992-000"`
  - Telephone: `"Tel: (02) 8921-4450"`
* **And** it displays receipt metadata: Receipt # (`TX-XXXX`), Timestamp (formatted date & time), Cashier Name, and Pricing Tier (`RETAIL` or `WHOLESALE`).

#### Scenario 2: Itemized Breakdown of Physical Parts vs. Bay Labor
* **Given** a hybrid transaction containing both physical parts and labor services,
* **When** the itemized table is rendered on the thermal receipt,
* **Then** physical parts display:
  - SKU (e.g. `PART-OIL-10W40`)
  - Product name
  - Quantity
  - Total amount
* **And** workshop labor services display:
  - Service code (e.g. `SRV-OIL-CHANGE`)
  - Workshop bay name (e.g. `Bay 1 - Quick Service`)
  - Estimated technician duration (e.g. `20 mins`)
  - Labor rate / unit price (e.g. `₱150.00`)
* **And** if technician service notes are present (e.g. "Oil drained & replaced; filter checked"), they render beneath the service line.

#### Scenario 3: Payment & Warranty Summary
* **Given** the receipt totals section,
* **When** rendered,
* **Then** it itemizes:
  - Subtotal
  - Discount line with discount type and rate (if applied)
  - Total Due
  - Cash Tendered
  - Change Due
  - Payment Method (Cash, GCash, Card)
* **And** it prints the standard 7-day parts warranty disclaimer: `"Parts warranty valid for 7 days with receipt."`
* **And** it renders a scan-friendly customer copy footer and simulated linear barcode with receipt number.

#### Scenario 4: Print Execution & State Finalization
* **Given** the thermal receipt modal is active,
* **When** the cashier clicks `"Print Receipt & Finish"` (or triggers browser print via shortcut),
* **Then** it invokes the print dialog and finalizes the checkout session:
  - The active cart and discount state are reset to empty.
  - On-hand inventory quantities for all purchased parts are immediately decremented in the reactive database / store.
  - A transaction record is persisted with itemized parts and services, logged into the audit trail.
  - The modal safely closes or returns the cashier to an empty, ready-for-next-customer POS terminal.

#### Scenario 5: Dual Roll Width Switcher (58mm vs 80mm)
* **Given** the cashier or station uses different thermal printers (58mm pocket roll or 80mm standard roll),
* **When** switching between `58mm` and `80mm` options,
* **Then** the receipt layout dynamically resizes font size, padding, and container width while preserving strict monospace column alignment without horizontal scrolling.

---

## 3. Business Invariants & Rules

1. **Receipt Number Format**: Must follow canonical identifier format `TX-XXXX` (e.g., `TX-1041` or `TX-<timestamp/seq>`).
2. **Monospace Typography**: All thermal receipt preview elements must use monospace typography (`font-mono`) to emulate authentic ESC/POS thermal printer pitch.
3. **Print Media CSS Isolation**: Under `@media print`, all surrounding application chrome (navigation bar, buttons, lookup bar, modal overlays) must be hidden, leaving only the receipt body centered on white paper with black text.
4. **Warranty Disclaimer**: The receipt must include the mandatory warranty notice: `"Parts warranty valid for 7 days with receipt."`.
5. **Zero Hardcoded Colors**: UI controls and interactive modal containers must strictly consume SWIFT semantic design tokens (`bg-bg-surface`, `border-border`, `text-text-primary`, `bg-primary`, etc.).
6. **Financial Precision**: All monetary values on the receipt must be formatted with two decimal places and standard PHP currency formatting (`₱`).

---

## 4. Dependencies & Downstream Integration

- **Prerequisites**:
  - `SIAA-18`: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine
  - `SIAA-21`: Cash Tender & Payment Processing with Real-Time Change Calculation
- **Enables / Downstream**:
  - `SIAA-6`: Sales Reports, Historical Receipts & Transaction History
  - `SIAA-2`: Real-time physical inventory decrements upon receipt finalization
  - `SIAA-7`: Audit logs for finalized sales transactions
