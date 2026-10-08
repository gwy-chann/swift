# Research & Architectural Analysis: Stock Adjustment Engine

- **Feature**: `SIAA-15`
- **Scope**: `components/admin/inventory/stock-adjustment-modal.tsx`, `components/admin/inventory/inventory-catalog.tsx`, `lib/store/inventory-store.ts`

---

## 1. Domain Types & State Mutation Flow

In `lib/store/inventory-store.ts`:
- The method `adjustStock` mutates both:
  1. `products`: updates matching SKU's `stock: Math.max(0, p.stock + delta)`
  2. `adjustmentLogs`: prepends `StockAdjustmentLog` to the beginning of the list.
- Standard adjustment types:
  - `"Restock Inbound"`: positive delta (`+N`)
  - `"Damaged Goods"`: negative delta (`-N`)
  - `"Audit Adjustment"`: can be positive or negative depending on recount
  - `"Shrinkage"`: negative delta (`-N`)

## 2. Modal Accessibility & UX Best Practices

- Accessible dialog:
  - `role="dialog"`, `aria-modal="true"`, `aria-labelledby="modal-title"`
  - Escape key listener to close
  - Click outside to dismiss
  - Clear visual feedback on current on-hand vs projected resulting stock
- Prevents invalid submissions:
  - Disables submit button if quantity <= 0 or NaN
  - Clear helper indicating that negative stock is prevented (floors at 0)

## 3. User Attribution

- Default active user from session context or `"Admin User"` / `"Warehouse Supervisor"`
- In local development / mock environment, defaults to `"Inventory Supervisor (Admin)"`.
