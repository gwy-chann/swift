# Requirements Checklist: Interactive Stock Adjustment Engine

- **Feature**: `SIAA-15`

## Specification & Contract Gates
- [x] All 4 Jira Acceptance Criteria covered with explicit test cases.
- [x] TypeScript contracts defined in `contracts/stock-adjustment-contracts.ts`.
- [x] Zero hardcoded colors using SWIFT design tokens (`tokens.ts`).

## Modal & Component Gates
- [x] Interactive modal `<StockAdjustmentModal>` created.
- [x] Displays SKU, Product Name, and Current On-hand stock count.
- [x] Standardized adjustment type dropdown:
  - "Restock Inbound"
  - "Damaged Goods"
  - "Audit Adjustment"
  - "Shrinkage"
- [x] Optional / required reason notes input field.
- [x] Live preview of resulting stock count after adjustment.
- [x] Negative stock floor prevention (`Math.max(0, newStock)`).

## Store & Audit Trail Gates
- [x] State mutation immediately updates `products` in `useInventoryStore()`.
- [x] Prepends immutable audit log `ADJ-XXXX` to `adjustmentLogs`.
- [x] Formatted change string (e.g. `+10 Units`, `-2 Units`).
- [x] Authenticated user display name attribution.
- [x] Unit test suite covering restock, damage decrement, audit recount, and floor at zero.
