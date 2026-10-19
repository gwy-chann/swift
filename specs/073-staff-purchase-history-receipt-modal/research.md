# Research & Technical Architecture: Refactor Thermal Receipt Modal & Staff Purchase History Interface

**Feature Branch**: `feat/SIAA-73-staff-purchase-history-receipt-modal`  
**Jira Issue**: [SIAA-73](https://the-three-devsketeers.atlassian.net/browse/SIAA-73)  
**Spec Reference**: `specs/073-staff-purchase-history-receipt-modal/spec.md`  

---

## 1. Technical Stack & Architecture Decisions

- **Framework**: Next.js App Router (React 19, TypeScript 5)
- **Styling**: Tailwind CSS v4 using SWIFT semantic design tokens (`bg-bg-base`, `bg-bg-surface`, `bg-bg-muted`, `text-text-primary`, `text-text-secondary`, `border-border`, etc.). Zero hardcoded hex/RGB colors.
- **Route**: `app/staff/history/page.tsx`
  - Integrated into the Staff Shop Floor layout shell (`components/staff/staff-layout-shell.tsx`).
  - Auth route guard evaluates access under `STAFF_PORTAL` rules.
- **Sidebar Integration**:
  - Update `STAFF_NAV_ITEMS` in `lib/staff/navigation.ts` to include `History` / `Receipt` navigation item (`/staff/history`).
  - Automatically updates mobile drawer and desktop sidebar.
- **Data Ingestion**:
  - Consumes `getTransactionsAction()` from `lib/pos/transaction-actions.ts`.
  - Fallbacks to Prisma ORM / `MOCK_TRANSACTIONS` for local offline reliability.
  - Type-safe mapping from `DbTransaction` to `ThermalReceiptData` via `mapDbTransactionToThermalReceipt()` from `lib/pos/contracts.ts`.

---

## 2. Refactoring Analysis: `ThermalReceiptModal`

### Current Deficiencies in `components/pos/thermal-receipt-modal.tsx`:
1. **Redundant Search Header**:
   - The modal was used both as a checkout completion dialog and an ad-hoc search modal.
   - Cashiers completing a checkout had a prominent search bar at the top of the receipt dialog, causing confusion.
   - Solution: Remove the lookup form, query state, and error handling from the modal. The modal's sole responsibility is rendering and printing the provided `receiptData`.
2. **58mm / 80mm Switcher Toggle**:
   - 80mm is the authoritative POS industry standard for SWIFT shop floors. The 58mm toggle created unnecessary UI clutter and potential layout misconfigurations.
   - Solution: Remove the roll width toggle buttons. Lock default width strictly to `80mm`.
3. **Simulated Barcode & Redundant ID in Footer**:
   - The Code-39 simulated barcode pattern and `*TX-...*` string added ink overhead and duplicated the receipt number already printed in the header.
   - Solution: Remove the barcode line pattern and redundant text from the footer, leaving the store warranty notice and customer copy message clean.

---

## 3. Dedicated Staff Purchase History Architecture

### 3.1 Component Structure
- `app/staff/history/page.tsx` (Server Component shell)
- `components/staff/history/purchase-history-view.tsx` (Client interactive table & filter controls)
- `components/staff/history/warranty-badge.tsx` (Visual indicator for 7-day warranty status)
- Reuses `components/pos/thermal-receipt-modal.tsx` for modal preview and printing.

### 3.2 Warranty Calculation Logic
- Motorcycle parts carry a 7-day warranty from purchase timestamp.
- Formula:
  $$\text{elapsedDays} = \frac{\text{currentTime} - \text{purchaseTime}}{86400000}$$
- If $\text{elapsedDays} \le 7$: Status is **Valid** (with badge showing e.g., "5 days left" or "Expires in 2 days").
- If $\text{elapsedDays} > 7$: Status is **Expired** (with neutral/muted badge).

### 3.3 Search & Filter Controls
- **Full Text Search**: Filters by Receipt Number (`TX-...`), cashier name, or item names.
- **Date / Warranty Filter**:
  - `All`: All transactions.
  - `Warranty Eligible (≤ 7 days)`: Transactions within return window.
  - `Today`: Transactions completed today.
  - `Past 30 Days`: Transactions completed in the last month.
- **Payment Method Filter**: All, Cash, GCash, Card, Maya.
