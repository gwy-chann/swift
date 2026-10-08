# Implementation Plan: Interactive Stock Adjustment Engine

- **Feature**: `SIAA-15`
- **Parent Epic**: `SIAA-2`
- **Branch**: `feat/SIAA-15-stock-adjustment-engine`

---

## 1. Architectural Strategy

We will deliver this feature in 3 architectural units following atomic commit guidelines:
1. **Core Domain & Mutation Logic**:
   - `lib/inventory/stock-adjustment.ts` helper utilities to compute deltas, format audit notes, and validate payloads.
   - Unit tests in `lib/inventory/__tests__/stock-adjustment.test.ts` covering restock increment, damaged decrement, zero floor constraint, and audit log generation.
2. **Modal Component Implementation**:
   - `components/admin/inventory/stock-adjustment-modal.tsx`:
     - Displays SKU, Name, and current stock.
     - Type selector (Restock Inbound, Damaged Goods, Audit Adjustment, Shrinkage).
     - Quantity input with live resulting stock preview.
     - Reason note input.
     - Zero hardcoded colors; accessible modal semantics.
3. **Inventory Catalog Wiring & Verification**:
   - Update `components/admin/inventory/inventory-catalog.tsx` to handle `handleAdjustStock(sku)`, managing modal open/close state and triggering `inventoryStore.adjustStock`.
   - Run typecheck and full test suite.
