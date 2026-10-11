# Data Model: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine

**Feature**: Hybrid POS Cart & Joint Parts + Workshop Labor Line-Item Engine  
**Jira Issue**: [SIAA-18](https://the-three-devsketeers.atlassian.net/browse/SIAA-18)  
**Date**: 2026-10-11  

---

## 1. Domain Entities & Type Models

### 1.1 `CartItem` (Discriminated Union)
The fundamental line-item model for the hybrid POS transaction cart, distinguishing physical motorcycle parts from workshop repair bay labor services.

```typescript
export type PricingMode = 'retail' | 'wholesale';

export interface BaseCartItem {
  id: string;        // Unique line-item identifier (SKU for parts, code for services)
  name: string;      // Display title
  price: number;     // Effective unit price in PHP (respects pricingMode for parts)
  qty: number;       // Line item quantity (>= 1)
}

export interface PartCartItem extends BaseCartItem {
  type: 'part';
  sku: string;               // Catalog inventory SKU (e.g. 'MOT-3100-10W40')
  location?: string;         // Physical warehouse rack/shelf locator
  retailPrice?: number;      // Baseline retail unit price
  wholesalePrice?: number;   // Baseline wholesale unit price
  stock?: number;            // Current on-hand stock count
  minThreshold?: number;     // Low stock reorder threshold
  isOverridden?: boolean;    // Flag indicating authorized bypass of zero-stock limit
}

export interface ServiceCartItem extends BaseCartItem {
  type: 'service';
  code: string;              // Workshop service code (e.g. 'SRV-CVT-01')
  bay?: string;              // Designated repair bay (e.g. 'Bay 2 / Scooter Bay')
  duration?: string;         // Estimated completion duration (e.g. '45 mins')
}

export type CartItem = PartCartItem | ServiceCartItem;
```

---

### 1.2 `CartTotals`
Reactive financial summary calculated synchronously on every cart mutation.

| Field | Type | Description |
| :--- | :--- | :--- |
| `subtotal` | `number` | Sum of `price * qty` across all line items |
| `discountRate` | `number` | Applied discount percentage multiplier (e.g. `0.05` for 5% VIP, `0.20` for 20% SC/PWD) |
| `discountAmount` | `number` | Computed discount in PHP: `round(subtotal * discountRate, 2)` |
| `total` | `number` | Final amount payable: `max(0, subtotal - discountAmount)` |
| `itemCount` | `number` | Total count of physical units and labor tasks: $\sum \text{qty}$ |

---

### 1.3 `CartStoreState`
State held within the singleton `cartStore` and subscribed to via `useCartStore()`.

```typescript
export interface CartStoreState {
  items: CartItem[];
  pricingMode: PricingMode;
  discountRate: number;
  totals: CartTotals;
}
```

---

## 2. State Invariants & Business Rules

1. **Discriminant Guarantee**: Every item in `items` MUST have `type === 'part'` OR `type === 'service'`.
2. **Positive Quantity**: Every cart item MUST have `qty >= 1`. Decrementing an item with `qty === 1` removes the item from the cart.
3. **Zero-Stock Physical Guard**: A physical part item (`type: 'part'`) with `stock <= 0` or where `qty > stock` CANNOT be added or incremented unless `isOverridden === true`.
4. **Service Non-Stock Exemption**: Workshop labor services (`type: 'service'`) are non-physical and are NEVER restricted by stock limits.
5. **Dual-Tier Price Recalculation**: Toggling `pricingMode` (`'retail'` vs `'wholesale'`) updates unit prices of physical parts (`PartCartItem`) based on `wholesalePrice` vs `retailPrice`, while workshop labor services retain their fixed flat rate.
6. **Sub-50ms Reaction**: Totals recalculation is a pure in-memory operation executing in $< 1\text{ms}$.
