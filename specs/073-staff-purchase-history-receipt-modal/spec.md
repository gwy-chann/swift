# Feature Specification: SIAA-73 Refactor Thermal Receipt Modal & Implement Dedicated Staff Purchase History Interface

**Feature Branch**: `feat/SIAA-73-staff-purchase-history-receipt-modal`  
**Created**: 2026-10-19  
**Status**: Draft  
**Jira Key**: `SIAA-73`  
**Input**: User description: "https://the-three-devsketeers.atlassian.net/browse/SIAA-73 - Refactor Thermal Receipt Modal & Implement Dedicated Staff Purchase History Interface"

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Dedicated Staff Purchase History Interface & Warranty Lookup (Priority: P1)

**As a** shop floor cashier and staff member,  
**I want** a dedicated purchase history interface on the staff portal to search and verify past customer sales transactions,  
**So that** I can immediately verify warranty eligibility on-demand when a customer brings in a part for return or replacement within the 7-day warranty window.

**Why this priority**: Cashiers currently have no dedicated place in the staff terminal to view past sales, look up historical transactions, or evaluate warranty status. Fulfilling customer warranty claims requires quick, accessible lookup by receipt number.

**Independent Test**: Navigate to `/staff/history`, enter or scan receipt number (e.g. `TX-1041` or `TX-20261019-9427`), verify transaction matches, review purchase date and warranty badge ("Warranty Valid" or "Warranty Expired"), and inspect the itemized lines.

**Acceptance Scenarios**:

1. **Given** a staff user logged into the shop floor terminal,  
   **When** they view the sidebar,  
   **Then** they see a "Purchase History" navigation item linking to `/staff/history`.
2. **Given** a staff user on `/staff/history`,  
   **When** they view the page,  
   **Then** they are presented with a searchable table displaying recent transactions, including Receipt #, timestamp, cashier, item count, total amount, payment method, and warranty eligibility status.
3. **Given** a staff user on `/staff/history`,  
   **When** they enter a receipt number or search query (e.g., `TX-1041`),  
   **Then** the table immediately filters to matching transactions.
4. **Given** a customer presents a receipt dated within the last 7 calendar days,  
   **When** staff view the transaction in `/staff/history`,  
   **Then** the warranty badge indicates "Warranty Valid" (with remaining days),  
   **And** if older than 7 days, it indicates "Warranty Expired".

---

### User Story 2 - Simplified 80mm Thermal Receipt Modal Refactoring (Priority: P2)

**As a** shop floor cashier,  
**I want** the `ThermalReceiptModal` to present a clean, distraction-free 80mm thermal receipt without redundant search bars, roll switchers, or barcodes,  
**So that** I can print receipts immediately after checkout or reprint past receipts without visual clutter.

**Why this priority**: In checkout flows, the receipt is already in active memory; search bars inside the modal header create confusion. Standardizing on 80mm roll width removes obsolete toggle controls, and eliminating bottom barcode/duplicate ID produces a clean, authentic thermal printout matching real POS hardware.

**Independent Test**: Complete a POS checkout or click "Print Receipt" from Purchase History. Verify the modal opens formatted strictly for 80mm roll width, without a search header, without roll switchers, and without a bottom barcode graphic or duplicate `*TX-...*` string.

**Acceptance Scenarios**:

1. **Given** a sale is completed at the POS terminal or a transaction is viewed in Purchase History,  
   **When** the `ThermalReceiptModal` opens,  
   **Then** it renders formatted for 80mm roll width without a 58mm/80mm toggle.
2. **Given** `ThermalReceiptModal` is open,  
   **When** the cashier inspects the modal header,  
   **Then** there is no search input bar, lookup button, or search error message.
3. **Given** `ThermalReceiptModal` is rendering receipt content,  
   **When** inspecting the receipt footer,  
   **Then** it displays store notices and customer copy wording, but does not render the simulated barcode pattern or duplicate asterisked receipt ID.

---

### User Story 3 - On-Demand Receipt Preview and Reprinting (Priority: P3)

**As a** shop floor staff member,  
**I want** an action button on each record in the Purchase History table to preview and reprint the 80mm thermal receipt,  
**So that** I can give customers a duplicate physical receipt upon request or verify line-item details.

**Why this priority**: When resolving disputes or reissuing faded receipts, cashiers need instantaneous access to print or preview the full itemized thermal ticket.

**Independent Test**: Click "View Receipt" or "Reprint" on any transaction row in `/staff/history`. The 80mm `ThermalReceiptModal` opens with the exact transaction data, allowing direct browser printing.

**Acceptance Scenarios**:

1. **Given** a transaction listed in `/staff/history`,  
   **When** staff clicks the "Reprint Receipt" button,  
   **Then** the `ThermalReceiptModal` opens populated with the selected transaction's data.
2. **Given** the receipt preview is open,  
   **When** staff clicks "Print",  
   **Then** `window.print()` triggers the system print dialogue.

---

### Edge Cases

- **No transactions found**: When a search query matches zero records, the table displays a friendly empty state with clear guidance to adjust filters.
- **Empty transaction database**: If no transactions exist, a clean empty state prompt informs the user that sales completed at the POS terminal will appear here.
- **Transactions with 0 change or discounts**: Gracefully renders subtotals, discounts (senior, PWD, none), and exact cash tender.
- **Hybrid line items (Parts + Services)**: Displays both parts (with SKU and shelf location) and workshop labor services (with bay and service code).
- **Date boundary at exactly 7 days**: Warranty calculation precisely counts 7 full calendar days (7 × 24 hours from transaction timestamp) before marking as expired.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide a dedicated route at `/staff/history` accessible to authenticated staff and admin roles.
- **FR-002**: System MUST add a "Purchase History" navigation item with an appropriate icon to `STAFF_NAV_ITEMS` in `lib/staff/navigation.ts`.
- **FR-003**: System MUST provide search by receipt number (e.g. `TX-1041`, `TX-20261019-9427`), cashier name, or payment method.
- **FR-004**: System MUST provide filtering by warranty status / date range (All, Today, Warranty Eligible - Past 7 Days, Past 30 Days).
- **FR-005**: System MUST compute 7-day warranty validity for motorcycle parts based on transaction creation timestamp.
- **FR-006**: System MUST remove the search bar, lookup input, and lookup button from `ThermalReceiptModal`.
- **FR-007**: System MUST lock `ThermalReceiptModal` roll width strictly to 80mm and remove the 58mm/80mm toggle switch.
- **FR-008**: System MUST remove the simulated barcode graphic and redundant asterisked receipt ID from the footer of `ThermalReceiptModal`.
- **FR-009**: System MUST allow previewing and reprinting any transaction via `ThermalReceiptModal` directly from `/staff/history`.
- **FR-010**: All UI elements MUST strictly utilize SWIFT semantic design tokens (`bg-bg-base`, `bg-bg-surface`, `text-text-primary`, `border-border`, etc.) with zero hardcoded colors.

### Key Entities

- **Transaction / DbTransaction**: Represents a completed sale containing receipt number, timestamp, cashier, pricing mode, subtotal, discount, total due, cash tendered, change due, payment method, and itemized lines.
- **TransactionItem / DbTransactionItem**: Represents a part or service line item with unit price, quantity, subtotal, shelf location, or service bay.
- **WarrantyStatus**: Derived calculation indicating whether a transaction falls within the 7-day return/warranty window (`isValid: boolean`, `daysRemaining: number`, `label: string`).

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Staff can locate and verify any past transaction by receipt number in under 2 seconds.
- **SC-002**: 100% of receipts rendered by `ThermalReceiptModal` adhere to the 80mm format without barcode or search bar clutter.
- **SC-003**: Warranty eligibility (valid vs. expired) is instantly apparent on the transaction table without requiring manual date arithmetic.
- **SC-004**: Zero accessibility or TypeScript compilation errors across staff portal navigation and modal components.

---

## Assumptions

- Standard parts warranty window is 7 calendar days as established in `STORE_RECEIPT_CONFIG.warrantyNotice`.
- Transactions are retrieved via existing server action `getTransactionsAction` and Supabase/Prisma with mock fallbacks.
- Default printer roll format across all terminals is standard 80mm POS thermal paper.
