# Data Model: Low-Stock Threshold Detection & Restock Alerts

- **Feature Key**: `SIAA-17`
- **Parent Epic**: `SIAA-2` (EPIC-2: Inventory & Warehouse Rack/Shelf Management)

---

## 1. Domain Entities & Status Classifications

### Stock Health Status

```typescript
export type StockHealthStatus = 'healthy' | 'low' | 'out_of_stock';

export interface StockStatusEvaluation {
  status: StockHealthStatus;
  badgeLabel: string;
  isRestockNeeded: boolean;
  canAddToCart: boolean;
  stock: number;
  minThreshold: number;
}
```

### Operational Catalog Stats

```typescript
export interface CatalogStats {
  totalSkus: number;          // Total count of distinct active products
  totalUnitsOnHand: number;   // Cumulative physical units across all SKUs
  lowStockCount: number;      // Count of items where stock <= minThreshold (urgent restock)
  outOfStockCount: number;    // Count of items where stock === 0
  totalValuation: number;     // Sum of (stock * retail) or (stock * cost) formatted in ₱
  categoriesCount: number;    // Distinct category count
}
```

---

## 2. Evaluation Logic Matrix

| Condition | Evaluated Status | Badge Label Format | Visual Token Variant | POS Action |
| :--- | :--- | :--- | :--- | :--- |
| `stock > minThreshold` | `'healthy'` | `X in stock` / `X Units` | `bg-success-light text-success` | Normal Quick-Add |
| `stock > 0 && stock <= minThreshold` | `'low'` | `Low: X left (Min Y)` | `bg-danger-light text-danger` | Advisory Quick-Add |
| `stock <= 0` | `'out_of_stock'` | `Out of Stock` | `bg-danger text-text-light` | Disabled (Override required) |

---

## 3. Quick-Filter State Criteria

```typescript
export interface CatalogFilterCriteria {
  query?: string;
  category?: string;
  stockStatus?: 'all' | 'in_stock' | 'low_stock' | 'out_of_stock';
  lowStockOnly?: boolean; // Dedicated quick-filter toggle state
}
```
