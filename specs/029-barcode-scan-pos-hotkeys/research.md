# Technical Research & Architecture Decisions: Barcode Scan-Optimized Fast-Lane Checkout & POS Hotkeys

**Feature**: `029-barcode-scan-pos-hotkeys`  
**Jira Ticket**: [SIAA-28](https://the-three-devsketeers.atlassian.net/browse/SIAA-28) (STORY-5.1)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  

---

## 1. Technical Context & Stack Constraints

- **Framework**: Next.js App Router (React 19, TypeScript 5)
- **Styling**: Tailwind CSS v4 with semantic CSS variables (`bg-bg-surface`, `bg-primary`, `bg-danger-light`, `text-text-primary`, `border-border`)
- **State Management**: Zustand stores (`useCartStore` in `lib/store/cart-store.ts`, `useInventoryStore` in `lib/store/inventory-store.ts`)
- **DOM & Hardware Interfacing**:
  - HTML `<input>` with autofocus, `id="posItemSearchInput"`, and ref-based focus restoration.
  - Window-level keyboard event listener for `F12` and hotkeys.
- **Specification Source of Truth**:
  - `../mockup/staff.html` (specifically lines 73-83: `#view-staff-pos`, `#posItemSearchInput`)
  - `../mockup/app.js` (specifically lines 851-874: barcode scanner listener and `F12` hotkey event listener)
  - `../docs/features.md` (Fast-Lane POS and Quick Barcode Lookup specifications)

---

## 2. Research & Key Architectural Decisions

### Decision 1: Hardware Barcode Scanner Emulation in Web Browsers
**Problem**: Retail and workshop barcode scanners operate in USB HID Keyboard Wedge mode. When an EAN-13, Code 128, or QR barcode is read, the hardware sends high-frequency keystrokes directly into the active browser focus target, immediately followed by a carriage return (`Enter`, key code 13).  
**Investigation**:
- If the text input loses focus (e.g. after clicking a cart item or clicking away), subsequent barcode scans would be lost or mistakenly trigger global browser shortcuts.
- If the form or input does not prevent default form submission, the page could reload or lose active client state.  
**Resolution**:
- Set `id="posItemSearchInput"` on the scanner input in `HybridCatalogPane`.
- Maintain an `inputRef` that explicitly calls `inputRef.current?.focus()`:
  1. On initial mount (`useEffect`).
  2. Immediately after processing a scan in `handleSearchKeyDown` (whether matched or not matched).
  3. When closing any modal (e.g., Manager Override, Cash Tender).
- In `handleSearchKeyDown`, prevent default behavior on `e.key === 'Enter'` to avoid unexpected form submission.

### Decision 2: Trapping POS Physical Keyboard Hotkey (`F12`)
**Problem**: In all major desktop browsers (Chrome, Edge, Firefox), the `F12` key is the standard shortcut to toggle Developer Tools. In a POS environment, cashiers rely on physical keys (like `F12`) to trigger checkout in one keystroke without touching the mouse.  
**Investigation**:
- When `e.key === "F12"`, calling `e.preventDefault()` halts the browser's native DevTools toggle.
- If the active cart ticket is empty (`items.length === 0`), opening payment modals can cause state anomalies.
- If payment or receipt modals are already open, pressing `F12` should not double-open or reset modal state.  
**Resolution**:
- Register a global `keydown` listener on `window` inside `StaffPosPage`:
  ```typescript
  if (e.key === "F12") {
    e.preventDefault();
    if (isPaymentModalOpen || isReceiptModalOpen || isOverrideModalOpen) {
      return;
    }
    if (items.length === 0) {
      showToast("error", "Cannot checkout: Cart is empty.");
      return;
    }
    handleOpenPayment();
  }
  ```

### Decision 3: Lookup Hierarchy & Fallback Notification (Scenario 4)
**Problem**: When a cashier scans an uncataloged item or types a typo, the current implementation silently ignores the input without feedback. Acceptance Criteria Scenario 4 requires:
> "Given an invalid or uncataloged barcode/SKU entered in `#posItemSearchInput`
> When the cashier presses `[ENTER]`
> Then the system presents a clear alert ('Item code or barcode not found') without crashing or clearing the existing cart items."  
**Resolution**:
- In `HybridCatalogPane`, add an `onScanNotFound?: (query: string) => void` callback (or emit toast via `showToast("error", "Item code or barcode not found")`).
- Match query against:
  1. Product `sku` (case-insensitive)
  2. Product `barcode` (if defined)
  3. Service `code` (for labor services)
  4. Partial product / service `name`
- If no match: invoke `onScanNotFound` (or display toast), clear input value, and re-focus the input field. The active cart and existing line items remain completely unchanged.

### Decision 4: Quick Category Filter Navigation (Scenario 2)
**Problem**: Category pills must filter the catalog grid instantaneously.  
**Resolution**:
- Support standardized category pills:
  - `ALL` ("All Fast Items")
  - Core motorcycle categories: `Brakes`, `Drivetrain`, `Fluids`, `Tires`, `Suspension`, `Engine`, `Electrical`, `Accessories`
  - Labor service category: `SERVICES` ("Add Labor / Bay Service")
- Category filtering is evaluated instantaneously via `useMemo` on in-memory inventory and labor service arrays with zero server roundtrips.

---

## 3. SWIFT Semantic Design Token Compliance

All visual states MUST use established SWIFT semantic tokens:
- **Search & Input**: `bg-bg-input`, `border-primary/50`, `focus:border-primary`, `text-text-primary`, `placeholder:text-text-muted`
- **Active Category Pill**: `bg-primary`, `text-text-light`
- **Inactive Category Pill**: `bg-bg-base`, `text-text-secondary`, `hover:bg-bg-hover`, `hover:text-text-primary`
- **Toast Alerts**:
  - Success: `bg-success-light text-success border-success/30`
  - Error: `bg-danger-light text-danger border-danger/30`
- **Container Structure**: `#view-staff-pos` container with responsive layout tokens
