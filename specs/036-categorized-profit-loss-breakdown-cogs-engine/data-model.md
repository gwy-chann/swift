# Data Model: SIAA-36 Categorized Profit & Loss (P&L) Breakdown & COGS Engine

**Feature**: SIAA-36 (Categorized P&L Breakdown & COGS Engine)  
**Parent Epic**: SIAA-6 (Executive Analytics, Revenue & Profit Margins)  
**Date**: 2026-10-15  

---

## 1. Domain Entities & Interfaces

```typescript
/**
 * Itemized Category Profit & Loss entry.
 */
export interface CategoryPnlItem {
  category: string;         // e.g. "Fluids & Engine Oils", "Workshop Labor"
  units_sold: number;       // Number of physical units or workshop jobs
  gross_revenue: number;    // Total revenue in PHP
  cogs: number;             // Wholesale cost of goods sold in PHP
  net_profit: number;       // Gross Revenue - COGS in PHP
  margin_pct: number;       // (Net Profit / Gross Revenue) * 100
}

/**
 * Consolidated P&L financial summary metrics.
 */
export interface CategoryPnlSummary {
  total_units_sold: number;
  total_gross_revenue: number;
  total_cogs: number;
  total_net_profit: number;
  overall_margin_pct: number;
}

/**
 * Root payload returned by RPC / Server Action.
 */
export interface CategoryPnlData {
  categories: CategoryPnlItem[];
  summary: CategoryPnlSummary;
}

/**
 * Supported reporting time periods.
 */
export type ReportingPeriod = 'daily' | 'weekly' | 'monthly';
```

---

## 2. Database Mapping & Source Tables

| Domain Field | Source Table / Calculation | Notes |
| :--- | :--- | :--- |
| `category` | `COALESCE(products.category, 'Workshop Labor')` | Derived from product catalog or labor service type |
| `units_sold` | `SUM(transaction_items.quantity)` | Sum of items/services billed in period |
| `gross_revenue` | `SUM(transaction_items.subtotal)` | Direct invoice line-item subtotal |
| `cogs` | `SUM(transaction_items.quantity * products.cost)` | Wholesale cost; ₱0 (or consumable cost) for workshop labor |
| `net_profit` | `gross_revenue - cogs` | Deterministic profit calculation |
| `margin_pct` | `(net_profit / gross_revenue) * 100` | Rounded to 1 decimal place; `0.0%` if `gross_revenue == 0` |

---

## 3. Mathematical Validation & Invariants

1. **Conservation Invariant**:  
   `SUM(categories.gross_revenue) == summary.total_gross_revenue`  
   `SUM(categories.cogs) == summary.total_cogs`  
   `SUM(categories.net_profit) == summary.total_net_profit`  
2. **Margin Ratio Invariant**:  
   For each item, `margin_pct == ROUND(((gross_revenue - cogs) / gross_revenue) * 100, 1)`.  
3. **Zero Safety**:  
   If `gross_revenue <= 0`, then `net_profit <= 0` and `margin_pct = 0.0%`.
4. **Target Threshold**:  
   `isHighYield = margin_pct >= 30.0`
