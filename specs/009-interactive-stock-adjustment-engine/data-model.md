# Data Model: Stock Adjustment Engine

- **Feature**: `SIAA-15`

## 1. Stock Adjustment Log Entity

Defined in `@/lib/types/logs`:

```typescript
export interface StockAdjustmentLog {
  id: string;        // e.g. "ADJ-4091"
  timestamp: string; // e.g. "2026-10-09 03:15"
  sku: string;       // e.g. "YAM-NMAX-BL01"
  type: 'Audit Adjustment' | 'Restock Inbound' | 'Damaged Goods' | 'Shrinkage' | string;
  change: string;    // e.g. "+10 Units", "-2 Units"
  reason: string;    // e.g. "PO-4091 Supplier Delivery Received"
  user: string;      // e.g. "Inventory Supervisor"
}
```

## 2. Adjustment Type Mapping Matrix

| User Type Choice | Default Mode | Delta Sign | Example Change Tag |
| :--- | :--- | :--- | :--- |
| **Restock Inbound** | Add | Positive (`+N`) | `+10 Units` |
| **Damaged Goods** | Deduct | Negative (`-N`) | `-2 Units` |
| **Audit Adjustment** | Recount / +/- | Dynamic | `+3 Units` or `-1 Unit` |
| **Shrinkage** | Deduct | Negative (`-N`) | `-1 Unit` |

## 3. Floor Guarantee
`newStock = Math.max(0, currentStock + delta)`.
Stock never becomes negative.
