# Data Model: Side-by-Side OEM vs. Aftermarket Comparison Matrix

**Feature**: `025-oem-aftermarket-comparison-matrix`  
**Jira Ticket**: [SIAA-24](https://the-three-devsketeers.atlassian.net/browse/SIAA-24)  
**Parent Epic**: [SIAA-4](https://the-three-devsketeers.atlassian.net/browse/SIAA-4) (EPIC-4: Smart MotoMatcher)  

---

## 1. Entity Models & DTOs

### 1.1 Normalized Comparison Part (`ComparisonPartItem`)

Represents a single motorcycle part rendered within either the OEM or Aftermarket column of the comparison matrix:

```typescript
export interface ComparisonPartItem {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  retailPrice: number;
  wholesalePrice?: number;
  stockLevel: number;
  minThreshold: number;
  shelfLocation: string | null;
  isOem: boolean;
  isUniversal: boolean;
  fitmentType: 'oem' | 'aftermarket' | 'universal';
  upsellDeltaAmount?: number | null;
  upsellDeltaPercent?: number | null;
  upsellBadge?: string | null;
  // Raw backing object for downstream POS actions
  rawProduct?: unknown;
}
```

### 1.2 Comparison Matrix State (`ComparisonMatrixState`)

Represents the state of both columns in the comparison matrix:

```typescript
export interface ComparisonMatrixState {
  oemParts: ComparisonPartItem[];
  aftermarketParts: ComparisonPartItem[];
  totalMatches: number;
  oemCount: number;
  aftermarketCount: number;
}
```

---

## 2. Adapters & Pure Transformations

### 2.1 Domain Model Adapters

To ensure zero coupling and seamless reuse across existing stores (`Product` from `lib/types/product.ts`) and database RPC results (`MotoMatcherMatrixPart` from `lib/types/motomatcher.ts`):

1. **`fromProductToComparisonPart(product: Product): ComparisonPartItem`**
   - Maps `product.sku`, `product.name`, `product.brand`, `product.category`
   - Sets `retailPrice = product.retail`, `wholesalePrice = product.wholesale`
   - Sets `stockLevel = product.stock`, `minThreshold = product.minThreshold`
   - Sets `shelfLocation = product.location || null`
   - Sets `isOem = Boolean(product.oem)`
   - Sets `isUniversal = product.model?.toLowerCase() === 'universal'`
   - Sets `fitmentType = product.oem ? 'oem' : (isUniversal ? 'universal' : 'aftermarket')`
   - Attaches `rawProduct = product`

2. **`fromMatrixPartToComparisonPart(part: MotoMatcherMatrixPart): ComparisonPartItem`**
   - Maps `part.id`, `part.sku`, `part.name`, `part.brand`, `part.category`
   - Sets `retailPrice = part.retail_price`
   - Sets `stockLevel = part.stock_level`, `minThreshold = part.min_threshold`
   - Sets `shelfLocation = part.shelf_location`
   - Sets `isOem = part.fitment_type === 'oem'`
   - Sets `isUniversal = part.is_universal`
   - Sets `fitmentType = part.fitment_type`
   - Sets `upsellDeltaAmount = part.upsell_delta_amount`
   - Sets `upsellDeltaPercent = part.upsell_delta_percent`
   - Sets `upsellBadge = part.upsell_badge`

### 2.2 Partitioning Logic (`partitionComparisonParts`)

```typescript
export function partitionComparisonParts(
  parts: ComparisonPartItem[]
): { oemParts: ComparisonPartItem[]; aftermarketParts: ComparisonPartItem[] } {
  const oemParts: ComparisonPartItem[] = [];
  const aftermarketParts: ComparisonPartItem[] = [];

  for (const part of parts) {
    if (part.isOem) {
      oemParts.push(part);
    } else {
      aftermarketParts.push(part);
    }
  }

  return { oemParts, aftermarketParts };
}
```

---

## 3. Stock Level State Rules

| State | Condition | Token Class | Visual Representation |
| :--- | :--- | :--- | :--- |
| **Normal Stock** | `stockLevel > minThreshold` | `bg-success-light text-success` | `{stockLevel} in stock` |
| **Low Stock Alert** | `stockLevel <= minThreshold && stockLevel > 0` | `bg-danger-light text-danger` | `Low Stock ({stockLevel} left)` |
| **Out of Stock** | `stockLevel <= 0` | `bg-bg-muted text-text-muted` | `Out of Stock` |
