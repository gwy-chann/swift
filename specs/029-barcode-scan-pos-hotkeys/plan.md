# Implementation Plan: Barcode Scan-Optimized Fast-Lane Checkout & POS Hotkeys

**Feature**: `029-barcode-scan-pos-hotkeys`  
**Jira Ticket**: [SIAA-28](https://the-three-devsketeers.atlassian.net/browse/SIAA-28) (STORY-5.1)  
**Parent Epic**: [SIAA-5](https://the-three-devsketeers.atlassian.net/browse/SIAA-5) (EPIC-5: Staff Shop Floor Terminal & Time Clock)  

---

## 1. Architecture Overview & Component Boundaries

```text
[Staff Floor Terminal Fast-Lane POS (/staff/pos)]
   │ Container: <section id="view-staff-pos">
   │
   ├── <HybridCatalogPane />
   │     ├── Scan Input: <input id="posItemSearchInput" autoFocus />
   │     │     │
   │     │     ├── [Scanner Wedge / Enter Key Handler]
   │     │     │     ├── Query: SKU / Barcode / Service Code / Name
   │     │     │     ├── Exact Match Found:
   │     │     │     │     ├── Physical Part with Stock > 0 ➔ addPart(product, 1)
   │     │     │     │     ├── Physical Part with Stock <= 0 ➔ open ManagerOverrideModal
   │     │     │     │     └── Labor Service ➔ addService(service, 1)
   │     │     │     │     └── Clear input & inputRef.current.focus()
   │     │     │     └── Not Found:
   │     │     │           ├── onScanNotFound("Item code or barcode not found")
   │     │     │           ├── Clear input & inputRef.current.focus()
   │     │     │           └── Active Cart Ticket untouched!
   │     │     │
   │     └── Category Filter Tabs:
   │           ├── "All Fast Items" (ALL)
   │           ├── Standard Categories: "Brakes", "Drivetrain", "Fluids", etc.
   │           └── "Add Labor / Bay Service" (SERVICES)
   │
   ├── <HybridCartPane />
   │     ├── Active Cart Ticket (items, quantities, price tier, totals)
   │     └── Checkout Button: "PAY ₱... (F12)"
   │
   ├── [Global POS Hotkey Listener]
   │     └── [F12 Key Press]
   │           ├── e.preventDefault() (Blocks browser DevTools)
   │           ├── If cart empty: toast alert ("Cannot checkout: Cart is empty.")
   │           └── If cart has items: open CashTenderModal (or ThermalReceiptModal)
   │
   ├── <ManagerOverrideModal />
   ├── <CashTenderModal />
   └── <ThermalReceiptModal />
```

---

## 2. Implementation Phases

### Phase 1: Pure Domain Lookup & Barcode Ingestion Engine
- **File**: `lib/pos/barcode-scanner.ts`
  - Implement `resolveBarcodeScanQuery(query, products, laborServices)`:
    - Normalizes and trims query.
    - Checks exact SKU match on products.
    - Checks exact barcode match on products.
    - Checks exact code match on labor services.
    - Falls back to case-insensitive name matching.
    - Detects whether item is physical and out-of-stock.
    - Returns standardized `BarcodeScanResult`.
  - Implement `handlePosHotkeyEvent(event, cartState, modalState)`:
    - Pure evaluator for `F12` and keyboard hotkeys.

### Phase 2: Unit & Integration Test Suite (TDD)
- **File**: `lib/pos/__tests__/barcode-scanner.test.ts`
  - Test exact SKU scan cart resolution.
  - Test barcode matching when defined on product.
  - Test workshop labor service code scan resolution.
  - Test out-of-stock product scan requiring override.
  - Test unrecognized barcode returning `NOT_FOUND` without mutating cart.
  - Test `F12` hotkey event evaluator:
    - Blocks default browser action.
    - Prevents checkout when cart is empty.
    - Enables checkout when cart has items.

### Phase 3: Component Enhancements (`HybridCatalogPane` & `StaffPosPage`)
- **File**: `components/pos/hybrid-catalog-pane.tsx`
  - Add `id="posItemSearchInput"` to input field.
  - Add `inputRef` to ensure programmatic focus restoration after `[ENTER]`.
  - Wire `resolveBarcodeScanQuery` into `handleSearchKeyDown`.
  - Add `onScanNotFound` prop / callback to trigger toast when barcode is not found.
  - Enhance category tab pills to ensure standard categories (`Brakes`, `Drivetrain`, `Fluids`, etc.) and `Add Labor / Bay Service` (`SERVICES`) filter instantaneously.
- **File**: `app/staff/pos/page.tsx`
  - Add `id="view-staff-pos"` to root section/container.
  - Provide `onScanNotFound` handler displaying high-contrast error toast: `"Item code or barcode not found"`.
  - Enhance `F12` keydown listener:
    - Check if cart is empty: if empty, show warning toast.
    - If cart has items and modals are not open, open payment checkout modal.
    - Always call `e.preventDefault()`.

### Phase 4: Verification Suite & Linting
- Run `npm test` to verify all POS tests pass.
- Run `npx tsc --noEmit` to verify TypeScript contracts.
- Run `npm run lint` to verify code quality standards.
